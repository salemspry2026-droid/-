'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { db, storage } from '@/lib/firebase';
import { companyService } from '@/lib/services/companyService';
import { settingsService } from '@/lib/services/settingsService';
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Building2, Hash, Phone, MapPin, FileText, Mail, Clock, Info, Shield, Camera, Edit2, X, Plus, Trash2, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';
import Image from 'next/image';
import { AddressSelector } from './AddressSelector';
import { EmployeePermissionsDialog } from './EmployeePermissionsDialog';

const COUNTRY_CODES = [
  { code: '+966', name: '🇸🇦 السعودية (+966)' },
  { code: '+971', name: '🇦🇪 الإمارات (+971)' },
  { code: '+965', name: '🇰🇼 الكويت (+965)' },
  { code: '+974', name: '🇶🇦 قطر (+974)' },
  { code: '+973', name: '🇧🇭 البحرين (+973)' },
  { code: '+968', name: '🇴🇲 عمان (+968)' },
  { code: '+20', name: '🇪🇬 مصر (+20)' },
  { code: '+962', name: '🇯🇴 الأردن (+962)' },
  { code: '+961', name: '🇱🇧 لبنان (+961)' },
  { code: '+964', name: '🇮🇶 العراق (+964)' },
  { code: '+963', name: '🇸🇾 سوريا (+963)' },
  { code: '+967', name: '🇾🇪 اليمن (+967)' },
  { code: '+249', name: '🇸🇩 السودان (+249)' },
  { code: '+212', name: '🇲🇦 المغرب (+212)' },
  { code: '+213', name: '🇩🇿 الجزائر (+213)' },
  { code: '+216', name: '🇹🇳 تونس (+216)' },
  { code: '+218', name: '🇱🇾 ليبيا (+218)' },
  { code: '+970', name: '🇵🇸 فلسطين (+970)' },
  { code: '+1', name: '🇺🇸 أمريكا / كندا (+1)' },
  { code: '+44', name: '🇬🇧 بريطانيا (+44)' },
];

export type ContactNumber = {
  name: string;
  countryCode: string;
  number: string;
};

// Helper function to compress image and return Base64
const compressImageToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Logos don't need to be huge, 400x400 is more than enough and keeps Base64 size small (< 50KB)
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Convert to Base64 JPEG with 70% quality
        const base64String = canvas.toDataURL('image/jpeg', 0.7);
        resolve(base64String);
      };
      img.onerror = (error: any) => reject(error);
    };
    reader.onerror = (error: any) => reject(error);
  });
};

function InfoItem({ icon, label, value, className }: { icon: React.ReactNode, label: string, value: string, className?: string }) {
  if (!value) return null;
  return (
    <div className={cn("flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100", className)}>
      <div className="text-blue-600 mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="font-medium text-gray-900 whitespace-pre-wrap" dir="auto">{value}</p>
      </div>
    </div>
  );
}

export function CompanySettingsDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { profile, user } = useStore();
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyTypeOther, setCompanyTypeOther] = useState('');
  const [phone, setPhone] = useState('');
  const [contactNumbers, setContactNumbers] = useState<ContactNumber[]>([]);
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [aboutUs, setAboutUs] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [notes, setNotes] = useState('');
  const [primaryCurrency, setPrimaryCurrency] = useState('ر.س');
  const [locations, setLocations] = useState<any[]>([]);
  const [isVisibleToClients, setIsVisibleToClients] = useState(false);

  const getFullPath = (loc: any, allLocs: any[]) => {
    let path = [loc.name];
    let curr = loc;
    while(curr.parentId && curr.parentId !== 'none') {
      curr = allLocs.find(l => l.id === curr.parentId);
      if(curr) {
         path.unshift(curr.name);
      } else {
         break;
      }
    }
    return path.join(' - ');
  };

  const sortedLocations = locations.map(loc => ({
    ...loc,
    fullPath: getFullPath(loc, locations)
  })).sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  useEffect(() => {
    if (!profile?.companyId) return;
    const unsub = settingsService.subscribeToCollection(profile.companyId, 'locations', (data) => {
      setLocations(data);
    });
    return () => unsub();
  }, [profile?.companyId]);

  useEffect(() => {
    if (!open || !profile?.companyId) {
      setIsEditing(false); // Reset edit state when closing
      return;
    }

    const fetchCompany = async () => {
      setLoading(true);
      try {
        const data: any = await companyService.getCompanyById(profile.companyId as string);
        if (data) {
          setCompany(data);
          setName(data.name || '');
          setCompanyType(data.companyType || '');
          setCompanyTypeOther(data.companyTypeOther || '');
          setPhone(data.phone || '');
          setContactNumbers(Array.isArray(data.contactNumbers) ? data.contactNumbers : []);
          setEmail(data.email || '');
          setAddress(data.address || '');
          setTaxId(data.taxId || '');
          setAboutUs(data.aboutUs || '');
          setLogoUrl(data.logoUrl || '');
          setWorkingHours(data.workingHours || '');
          setNotes(data.notes || '');
          setPrimaryCurrency(data.primaryCurrency || 'ر.س');
          setIsVisibleToClients(data.isVisibleToClients || false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `companies/${profile.companyId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [open, profile?.companyId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.companyId || !user) {
      toast.error('معرف الشركة غير متوفر');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح');
      return;
    }

    setUploadingLogo(true);
    try {
      // Compress the image and get Base64 string directly
      const base64Image = await compressImageToBase64(file);
      
      // Update Firestore directly with the Base64 string (bypasses Firebase Storage entirely)
      await companyService.updateCompanySettings(profile.companyId, {
        logoUrl: base64Image
      }, user.uid);

      setLogoUrl(base64Image);
      setCompany((prev: any) => ({ ...prev, logoUrl: base64Image }));
      toast.success('تم تحديث شعار الشركة بنجاح وبسرعة فائقة');
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.companyId || !user) return;

    if (profile.role !== 'owner') {
      toast.error('صلاحيات غير كافية. فقط مالك الشركة يمكنه تعديل هذه البيانات.');
      return;
    }

    setSaving(true);
    try {
      const updates: any = {
        name,
        companyType,
        companyTypeOther: companyType === 'other' ? companyTypeOther : '',
        phone,
        contactNumbers,
        email,
        address,
        taxId,
        aboutUs,
        workingHours,
        notes,
        primaryCurrency,
        isVisibleToClients,
      };
      
      // Generate clientJoinCode if it doesn't exist
      if (!company?.clientJoinCode) {
        updates.clientJoinCode = 'CLI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      await companyService.updateCompanySettings(profile.companyId, updates, user.uid);
      
      setCompany((prev: any) => ({
        ...prev,
        ...updates
      }));
      
      toast.success('تم حفظ معلومات الشركة بنجاح');
      setIsEditing(false); // Switch back to view mode
    } catch (error: any) {
      toast.error(error.message || 'فشل حفظ المعلومات');
    } finally {
      setSaving(false);
    }
  };

  const isOwner = profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin' || isOwner;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-blue-600" /> ملف الشركة
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
        ) : !company ? (
          <div className="text-center p-12 text-gray-500">الشركة غير موجودة</div>
        ) : (
          <Tabs defaultValue="info" className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">معلومات الشركة</TabsTrigger>
                <TabsTrigger value="employees">الموظفين والصلاحيات</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="info" className="p-6 pt-2 m-0">
              
              {/* Logo & Header Section - Always visible at the top */}
              <div className="flex flex-col items-center justify-center mb-8 pt-4">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                    {uploadingLogo ? (
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    ) : logoUrl ? (
                      <div className="relative w-full h-full">
                        <Image src={logoUrl} alt="Logo" fill className="object-cover" sizes="128px" referrerPolicy="no-referrer" />
                      </div>
                    ) : (
                      <Building2 className="w-12 h-12 text-gray-300" />
                    )}
                  </div>
                  {isOwner && (
                    <label className="absolute -bottom-3 -right-3 bg-blue-600 text-white p-3 rounded-full shadow-lg cursor-pointer hover:bg-blue-700 transition-transform hover:scale-105 border-4 border-white">
                      <Camera className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  )}
                </div>
                <h2 className="mt-6 text-2xl font-bold text-gray-900 text-center">{name || 'اسم الشركة'}</h2>
                <p className="text-sm text-gray-500 text-center mt-1 font-medium bg-gray-100 px-3 py-1 rounded-full">
                  {companyType === 'other' ? companyTypeOther : 
                   companyType === 'pharmaceuticals' ? 'للأدوية والصناعات الدوائية' :
                   companyType === 'food' ? 'المواد الغذائية' :
                   companyType === 'medical_equipment' ? 'المستلزمات الطبية' :
                   companyType === 'cosmetics' ? 'مستحضرات التجميل' : companyType || 'غير محدد'}
                </p>
              </div>

              {!isEditing ? (
                /* View Mode (CV Style) */
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <h3 className="text-lg font-bold text-gray-800">المعلومات الأساسية</h3>
                    {isOwner && (
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="text-blue-600 border-blue-200 hover:bg-blue-50 rounded-full px-4">
                        <Edit2 className="w-4 h-4 ml-2" /> تعديل البيانات
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <InfoItem icon={<Phone className="w-5 h-5" />} label="الهاتف الرئيسي" value={phone} />
                    
                    {/* View mode custom render for contactNumbers */}
                    <div className="md:col-span-2">
                      <Label className="flex items-center gap-2 text-gray-500 mb-2"><Phone className="w-5 h-5 text-gray-400" /> أرقام تواصل إضافية</Label>
                      {Array.isArray(contactNumbers) && contactNumbers.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {contactNumbers.map((c, i) => (
                            <div key={i} className="flex flex-col bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                              <span className="text-xs font-bold text-gray-500 mb-1">{c.name || 'رقم تواصل'}</span>
                              <span className="font-mono text-sm text-gray-900" dir="ltr">{c.countryCode} {c.number}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">لا يوجد أرقام إضافية مسجلة.</p>
                      )}
                    </div>

                    <InfoItem icon={<Mail className="w-5 h-5" />} label="البريد الإلكتروني" value={email} />
                    <InfoItem icon={<FileText className="w-5 h-5" />} label="الرقم الضريبي" value={taxId} />
                    <InfoItem icon={<Coins className="w-5 h-5" />} label="العملة الرئيسية" value={primaryCurrency} />
                    <InfoItem icon={<MapPin className="w-5 h-5" />} label="العنوان" value={address} className="md:col-span-2" />
                    <InfoItem icon={<Clock className="w-5 h-5" />} label="أوقات الدوام" value={workingHours} className="md:col-span-2" />
                  </div>

                  {(aboutUs || notes) && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      {aboutUs && (
                        <div>
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Info className="w-5 h-5 text-blue-600" /> نبذة عنا</h4>
                          <p className="text-sm text-gray-700 bg-blue-50/50 p-5 rounded-2xl leading-relaxed whitespace-pre-wrap border border-blue-100/50">{aboutUs}</p>
                        </div>
                      )}
                      {notes && (
                        <div>
                          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> ملاحظات</h4>
                          <p className="text-sm text-gray-700 bg-gray-50 p-5 rounded-2xl leading-relaxed whitespace-pre-wrap border border-gray-100">{notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 mt-8 text-center shadow-sm">
                    <Label className="text-blue-900 font-bold mb-3 block text-base leading-tight">كود انضمام الموظفين<br/><span className="text-xs font-normal text-blue-700">(فريق المبيعات والإدارة)</span></Label>
                    <div className="inline-block bg-white px-6 py-3 rounded-xl border-2 border-blue-300 font-mono text-xl tracking-[0.2em] font-bold text-blue-800 shadow-sm" dir="ltr">
                      {company.joinCode}
                    </div>
                    <p className="text-xs text-blue-700/80 mt-4 font-medium">شارك هذا الكود مع موظفيك بصلاحيات المبيعات أو فريق الإدارة.</p>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl border border-green-200 mt-4 text-center shadow-sm">
                    <Label className="text-green-900 font-bold mb-3 block text-base leading-tight">رابط مشاركة الشركة للعملاء<br/><span className="text-xs font-normal text-green-700">(للنشر والمشاركة)</span></Label>
                    <div className="relative inline-block w-full max-w-sm mx-auto">
                       <Input 
                         readOnly 
                         value={`${typeof window !== 'undefined' ? window.location.origin : ''}/c/${company.id}`} 
                         className="bg-white px-4 py-3 rounded-xl border-2 border-green-300 font-mono text-sm text-green-800 shadow-sm text-center w-full" 
                         dir="ltr" 
                       />
                    </div>
                    <Button 
                       variant="outline" 
                       className="mt-4 bg-white text-green-700 border-green-300 hover:bg-green-50 rounded-xl font-bold"
                       onClick={() => {
                         navigator.clipboard.writeText(`${window.location.origin}/c/${company.id}`);
                         toast.success('تم نسخ رابط الشركة بنجاح!');
                       }}
                    >
                       نسخ الرابط
                    </Button>
                    <p className="text-xs text-green-700/80 mt-4 font-medium">شارك هذا الرابط مع عملائك ليتمكنوا من تصفح منتجاتك بسهولة وطلبها.</p>
                  </div>

                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-gray-800">حالة ظهور الشركة للعملاء</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {company.isVisibleToClients ? 'شركتك ظاهرة حالياً للعملاء ويمكنهم الشراء.' : 'شركتك مخفية، لا تظهر في قائمة الشركات المتاحة للعملاء.'}
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-full font-bold text-sm ${company.isVisibleToClients ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                         {company.isVisibleToClients ? 'ظاهرة للعملاء' : 'مخفية'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Mode Form */
                <form onSubmit={handleSave} className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
                    <h3 className="text-lg font-bold text-gray-800">تعديل معلومات الشركة</h3>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-gray-500 hover:bg-gray-200 rounded-full">
                      <X className="w-4 h-4 ml-1" /> إلغاء
                    </Button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <Label className="text-base font-bold text-gray-900 block mb-1">ظهور الشركة للعملاء</Label>
                      <p className="text-sm text-gray-500">حين تفعيل هذا الخيار، ستظهر الشركة في القائمة العامة للعملاء. (سيتم إخفاؤها تلقائياً إذا لم تكن تحتوي على أصناف متاحة للبيع)</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={isVisibleToClients} onChange={(e) => setIsVisibleToClients(e.target.checked)} />
                      <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                      <span className="mr-3 text-sm font-medium text-gray-700">{isVisibleToClients ? 'مُفعّل' : 'معطّل'}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> اسم الشركة</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-white" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> نوع الشركة/الوكالة</Label>
                      <Select value={companyType} onValueChange={(val) => val && setCompanyType(val)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="اختر نوع الشركة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pharmaceuticals">للأدوية والصناعات الدوائية</SelectItem>
                          <SelectItem value="food">المواد الغذائية</SelectItem>
                          <SelectItem value="medical_equipment">المستلزمات الطبية</SelectItem>
                          <SelectItem value="cosmetics">مستحضرات التجميل</SelectItem>
                          <SelectItem value="other">آخر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {companyType === 'other' && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>حدد نوع العمل</Label>
                        <Input value={companyTypeOther} onChange={(e) => setCompanyTypeOther(e.target.value)} className="bg-white" placeholder="أدخل نوع العمل..." />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> رقم الهاتف الرئيسي</Label>
                      <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white text-left" dir="ltr" />
                    </div>

                    <div className="space-y-4 md:col-span-2 border-t pt-4 bg-gray-50/50 p-4 rounded-xl">
                      <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> أرقام تواصل إضافية</Label>
                      {(Array.isArray(contactNumbers) ? contactNumbers : []).map((contact, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-2 items-start md:items-end bg-white p-3 rounded-xl border border-gray-200 relative shadow-sm">
                          <div className="w-full md:w-1/3 space-y-1">
                            <Label className="text-xs text-gray-500">الاسم التعريفي (مثال: مستودع)</Label>
                            <Input value={contact.name} onChange={(e) => {
                              const newArr = [...contactNumbers];
                              newArr[idx].name = e.target.value;
                              setContactNumbers(newArr);
                            }} placeholder="مثال: الاستقبال"/>
                          </div>
                          <div className="w-full md:w-2/3 flex gap-2">
                            <div className="w-[140px] shrink-0">
                              <Label className="text-xs text-gray-500 mb-1 block">رمز البلد</Label>
                              <Select value={contact.countryCode} onValueChange={(val) => {
                                const newArr = [...contactNumbers];
                                if (val) newArr[idx].countryCode = val;
                                setContactNumbers(newArr);
                              }}>
                                <SelectTrigger className="bg-white" dir="ltr">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code} dir="ltr">{c.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs text-gray-500 mb-1 block">رقم الهاتف (أرقام فقط)</Label>
                              <div className="flex gap-2">
                                <Input 
                                  type="text"
                                  value={contact.number} 
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const newArr = [...contactNumbers];
                                    newArr[idx].number = val;
                                    setContactNumbers(newArr);
                                  }} 
                                  className="text-left bg-white font-mono" 
                                  dir="ltr" 
                                  placeholder="500000000"
                                />
                                <Button type="button" variant="ghost" size="icon" onClick={() => {
                                  setContactNumbers(contactNumbers.filter((_, i) => i !== idx));
                                }} className="text-red-500 hover:bg-red-50 shrink-0">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={() => setContactNumbers([...(Array.isArray(contactNumbers) ? contactNumbers : []), { name: '', countryCode: '+966', number: '' }])} className="w-full border-dashed bg-white">
                        <Plus className="w-4 h-4 ml-2" /> إضافة رقم تواصل جديد
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /> البريد الإلكتروني</Label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white text-left" dir="ltr" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> الرقم الضريبي</Label>
                      <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} className="bg-white text-left" dir="ltr" />
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Coins className="w-4 h-4 text-gray-400" /> العملة الرئيسية</Label>
                      <Select value={primaryCurrency} onValueChange={(v) => setPrimaryCurrency(v || '')}>
                        <SelectTrigger className="bg-white text-left" dir="ltr">
                          <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ر.س">ر.س (ريال سعودي)</SelectItem>
                          <SelectItem value="د.إ">د.إ (درهم إماراتي)</SelectItem>
                          <SelectItem value="د.ك">د.ك (دينار كويتي)</SelectItem>
                          <SelectItem value="ر.ع.">ر.ع. (ريال عماني)</SelectItem>
                          <SelectItem value="ج.م">ج.م (جنيه مصري)</SelectItem>
                          <SelectItem value="USD">$ (دولار أمريكي)</SelectItem>
                          <SelectItem value="EUR">€ (يورو)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                      <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> تفاصيل العنوان</Label>
                      <AddressSelector locations={locations} value={address} onChange={setAddress} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2"><Info className="w-4 h-4 text-gray-400" /> نبذة عنا</Label>
                      <textarea 
                        value={aboutUs} 
                        onChange={(e) => setAboutUs(e.target.value)} 
                        className="flex min-h-[100px] w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        placeholder="اكتب نبذة عن الشركة..."
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> أوقات الدوام (اختياري)</Label>
                      <Input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} className="bg-white" placeholder="مثال: من الأحد للخميس، 8 صباحاً - 5 مساءً" />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /> ملاحظات (اختياري)</Label>
                      <textarea 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        className="flex min-h-[80px] w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1 h-12 rounded-xl bg-white">
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={saving} className="flex-[2] bg-blue-600 hover:bg-blue-700 h-12 rounded-xl">
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 ml-2" /> حفظ التغييرات</>}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>

            <TabsContent value="employees" className="p-6 pt-2 m-0">
              {profile?.companyId && user?.uid && (
                <EmployeesManager companyId={profile.companyId} isAdmin={isAdmin} currentUserId={user.uid} />
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmployeeRow({ emp, isAdmin, currentUserId, onUpdate, onRemove }: { emp: any, isAdmin: boolean, currentUserId: string, onUpdate: (id: string, field: string, val: string) => void, onRemove?: (id: string) => void }) {
  const [jobTitle, setJobTitle] = useState(emp.jobTitle || '');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJobTitle(emp.jobTitle || '');
  }, [emp.jobTitle]);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-gray-900">{emp.displayName}</p>
          <p className="text-xs text-gray-500" dir="ltr">{emp.email}</p>
        </div>
        <span className="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-600">
          {emp.role === 'owner' ? 'مالك' : emp.role === 'admin' ? 'مدير' : 'مبيعات'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-50">
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">الصلاحية</Label>
          <Select 
            value={emp.role} 
            onValueChange={(val) => val && onUpdate(emp.id, 'role', val)}
            disabled={!isAdmin || emp.role === 'owner' || emp.id === currentUserId}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">مدير</SelectItem>
              <SelectItem value="sales">مبيعات</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-gray-500">المسمى الوظيفي</Label>
          <Input 
            value={jobTitle} 
            onChange={(e) => setJobTitle(e.target.value)}
            onBlur={() => {
              if (jobTitle !== (emp.jobTitle || '')) {
                onUpdate(emp.id, 'jobTitle', jobTitle);
              }
            }}
            disabled={!isAdmin}
            className="h-8 text-xs"
            placeholder="مثال: مندوب مبيعات"
          />
        </div>
      </div>
      
      {isAdmin && emp.role !== 'owner' && emp.id !== currentUserId && (
        <div className="pt-2 border-t border-gray-50 flex items-center justify-between gap-2">
          <div className="flex-1">
            <EmployeePermissionsDialog emp={emp} isAdmin={isAdmin} />
          </div>
          {onRemove && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('هل أنت متأكد من رغبتك في إزالة هذا الموظف من الشركة؟')) {
                  onRemove(emp.id);
                }
              }}
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              حذف
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EmployeesManager({ companyId, isAdmin, currentUserId }: { companyId: string, isAdmin: boolean, currentUserId: string }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'userProfiles'), 
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'userProfiles'));

    return () => unsubscribe();
  }, [companyId]);

  const handleUpdateEmployee = async (employeeId: string, field: string, value: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'userProfiles', employeeId), {
        [field]: value,
        updatedAt: serverTimestamp(),
        updatedBy: currentUserId
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `userProfiles/${employeeId}`));
      toast.success('تم التحديث بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل التحديث');
    }
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'userProfiles', employeeId), {
        companyId: null,
        role: null,
        updatedAt: serverTimestamp(),
        updatedBy: currentUserId
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `userProfiles/${employeeId}`));
      toast.success('تم إزالة الموظف بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل إزالة الموظف');
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  const staff = employees.filter(e => e.role !== 'client');

  return (
    <div className="space-y-4 pt-4">
      <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2 text-blue-800 text-sm mb-4">
        <Shield className="w-4 h-4 shrink-0" />
        <p>يمكن للمدراء والمالك فقط تعديل صلاحيات ومسميات الموظفين.</p>
      </div>
      
      <div className="space-y-3">
        {staff.map(emp => (
          <EmployeeRow 
            key={emp.id} 
            emp={emp} 
            isAdmin={isAdmin} 
            currentUserId={currentUserId} 
            onUpdate={handleUpdateEmployee} 
            onRemove={handleRemoveEmployee}
          />
        ))}
        {staff.length === 0 && (
          <p className="text-center text-gray-500 py-4">لا يوجد موظفين حالياً</p>
        )}
      </div>
    </div>
  );
}
