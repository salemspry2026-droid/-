'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserRound, Phone, MapPin, Store, Camera, Mail, FileText, Activity, BarChart3, Clock, DollarSign, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

import { compressImage } from '@/lib/utils';
import Image from 'next/image';

import { authService } from '@/lib/services/authService';
import { orderService } from '@/lib/services/orderService';
import { companyService } from '@/lib/services/companyService';

export default function ClientProfile() {
  const { profile, user } = useStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    phone: '',
    address: '',
    addressCountry: '',
    addressGov: '',
    addressCity: '',
    addressNeighborhood: '',
    logoUrl: '',
    activityType: '',
    activityTypeOther: '',
    notes: '',
    email: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [reportCompanyFilter, setReportCompanyFilter] = useState('all');
  const [reportDateFilter, setReportDateFilter] = useState('all');

  useEffect(() => {
    if (profile) {
      setFormData({
        storeName: profile.storeName || profile.displayName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        addressCountry: profile.addressCountry || '',
        addressGov: profile.addressGov || '',
        addressCity: profile.addressCity || '',
        addressNeighborhood: profile.addressNeighborhood || '',
        logoUrl: profile.logoUrl || '',
        activityType: profile.activityType || '',
        activityTypeOther: profile.activityTypeOther || '',
        notes: profile.notes || '',
        email: profile.email || ''
      });
      if (!profile.phone || !profile.storeName) {
         setIsEditing(true);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    
    const unsubOrders = orderService.subscribeToClientOrders(user.uid, (data) => {
      setClientOrders(data);
      setLoadingOrders(false);
    }, (e) => console.error(e));

    const unsubCompanies = companyService.subscribeToAllCompanies((data) => {
      setCompanies(data);
    }, (e) => console.error(e));

    return () => { unsubOrders(); unsubCompanies(); };
  }, [user]);

  const filteredOrders = useMemo(() => {
    let orders = clientOrders.filter(o => o.status !== 'cancelled' && o.status !== 'rejected');
    
    if (reportCompanyFilter !== 'all') {
      orders = orders.filter(o => o.companyId === reportCompanyFilter);
    }

    if (reportDateFilter !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (reportDateFilter === 'week') {
        cutoff.setDate(now.getDate() - 7);
      } else if (reportDateFilter === 'month') {
        cutoff.setMonth(now.getMonth() - 1);
      } else if (reportDateFilter === 'year') {
        cutoff.setFullYear(now.getFullYear() - 1);
      }
      
      orders = orders.filter(o => {
         const orderDate = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date();
         return orderDate >= cutoff;
      });
    }

    return orders;
  }, [clientOrders, reportCompanyFilter, reportDateFilter]);

  const reportData = useMemo(() => {
    let totalItems = 0;
    const amountsByCurrency: Record<string, { cash: number, pendingCash: number, credit: number }> = {};
    
    filteredOrders.forEach(o => {
      totalItems += (o.items?.length || 0);

      // Process amounts by currency
      const amounts = o.totalAmountByCurrency || {};
      Object.keys(amounts).forEach(currency => {
        if (!amountsByCurrency[currency]) {
          amountsByCurrency[currency] = { cash: 0, pendingCash: 0, credit: 0 };
        }
        
        const val = amounts[currency] || 0;
        if (o.invoiceType === 'pending_cash') amountsByCurrency[currency].pendingCash += val;
        else if (o.invoiceType === 'cash') amountsByCurrency[currency].cash += val;
        else if (o.invoiceType === 'credit') amountsByCurrency[currency].credit += val;
        else amountsByCurrency[currency].cash += val; // fallback
      });
    });

    const chartDataByDate: any[] = [];
    const dateMap = new Map<string, { count: number, value: number }>();
    
    filteredOrders.forEach(o => {
       const orderDateObj = o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date();
       const dStr = orderDateObj.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
       if (!dateMap.has(dStr)) {
         dateMap.set(dStr, { count: 0, value: 0 });
       }
       const dInfo = dateMap.get(dStr)!;
       dInfo.count += 1;
       const amounts = o.totalAmountByCurrency || {};
       // simple sum for chart regardless of currency (could be multiple but usually 1 main)
       dInfo.value += Object.values(amounts)[0] as number || 0;
    });
    
    dateMap.forEach((info, date) => {
       chartDataByDate.push({ name: date, الطلبات: info.count, القيمة: info.value });
    });

    // sorts oldest to newest (assuming keys are chronological approx)
    chartDataByDate.reverse(); 

    return { 
       totalItems, 
       orderCount: filteredOrders.length, 
       amountsByCurrency,
       chartDataByDate
    };
  }, [filteredOrders]);

  const detailedCompanyReports = useMemo(() => {
    const companyMap = new Map<string, any>();

    filteredOrders.forEach(o => {
        const compId = o.companyId;
        if (!compId) return;
        
        if (!companyMap.has(compId)) {
           const compData = companies.find(c => c.id === compId);
           companyMap.set(compId, {
             companyId: compId,
             companyName: compData ? compData.name : 'شركة غير معروفة',
             totalOrders: 0,
             itemsMap: new Map<string, any>()
           });
        }
        
        const compReport = companyMap.get(compId);
        compReport.totalOrders += 1;
        
        (o.items || []).forEach((item: any) => {
           if (!item.productId) return;
           if (!compReport.itemsMap.has(item.productId)) {
             compReport.itemsMap.set(item.productId, {
               productName: item.productName || 'صنف غير معروف',
               totalQuantity: 0,
               totalBonusQuantity: 0
             });
           }
           const itemReport = compReport.itemsMap.get(item.productId);
           itemReport.totalQuantity += (item.quantity || 0);
           itemReport.totalBonusQuantity += (item.bonusQuantity || 0);
        });
    });

    return Array.from(companyMap.values()).map(comp => ({
      ...comp,
      items: Array.from(comp.itemsMap.values() as Iterable<any>)
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
    })).sort((a, b) => b.totalOrders - a.totalOrders);
  }, [filteredOrders, companies]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة صالحة');
      return;
    }

    setUploadingImage(true);
    try {
      const compressedBase64 = await compressImage(file, 400, 0.7);
      const res = await fetch(compressedBase64);
      const blob = await res.blob();
      const url = await authService.uploadProfileImage(user.uid, blob);
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء رفع الصورة');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    if (!formData.phone.trim() || !formData.storeName.trim()) {
      toast.error('يرجى إكمال رقم الهاتف واسم المحل / العميل');
      return;
    }

    setLoading(true);
    try {
      const fullAddress = [formData.addressCountry, formData.addressGov, formData.addressCity, formData.addressNeighborhood].filter(Boolean).join(' - ') || formData.address.trim();
      
      await authService.updateUserProfile(user.uid, {
        storeName: formData.storeName.trim(),
        phone: formData.phone.trim(),
        address: fullAddress,
        addressCountry: formData.addressCountry.trim(),
        addressGov: formData.addressGov.trim(),
        addressCity: formData.addressCity.trim(),
        addressNeighborhood: formData.addressNeighborhood.trim(),
        logoUrl: formData.logoUrl,
        activityType: formData.activityType,
        activityTypeOther: formData.activityType === 'other' ? formData.activityTypeOther.trim() : '',
        notes: formData.notes.trim(),
        email: formData.email.trim()
      });
      
      // Update pending/recent orders as they act as a link to companies
      await orderService.updateClientOrdersWithCustomerInfo(clientOrders, formData.storeName.trim(), formData.phone.trim(), fullAddress);
      
      setIsEditing(false);
      toast.success('تم تحديث البيانات المزامنة بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-white border rounded-xl p-1 w-full justify-start h-auto">
          <TabsTrigger value="info" className="flex-1 py-3 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:font-bold rounded-lg">
            <UserRound className="w-4 h-4 ml-2" /> معلومات الحساب
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1 py-3 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:font-bold rounded-lg">
            <BarChart3 className="w-4 h-4 ml-2" /> التقارير والتحليلات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <UserRound className="w-6 h-6 text-green-600" />
                معلومات الحساب
              </h2>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="text-green-600 border-green-600 hover:bg-green-50">
                  تعديل البيانات
                </Button>
              )}
            </div>
            
            {(!profile?.phone || !profile?.storeName) && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
                <p className="font-bold mb-1">البيانات غير مكتملة</p>
                <p>يرجى إكمال إدخال رقم الهاتف واسم المحل/العميل لتتمكن من رفع الطلبات للشركات.</p>
              </div>
            )}

            {!isEditing ? (
              <div className="space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden relative">
                    {formData.logoUrl ? (
                      <Image src={formData.logoUrl} alt="Logo" fill className="object-cover" unoptimized referrerPolicy="no-referrer" />
                    ) : (
                      <Store className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{formData.storeName || 'غير محدد'}</h3>
                    <p className="text-gray-500 mt-1">
                      {formData.activityType === 'other' ? formData.activityTypeOther : 
                       formData.activityType === 'pharmacy' ? 'صيدلية' :
                       formData.activityType === 'supermarket' ? 'سوبر ماركت / بقالة' :
                       formData.activityType === 'clinic' ? 'عيادة طبية / مستشفى' :
                       formData.activityType === 'wholesaler' ? 'تاجر جملة' : 'لم يحدد نوع النشاط'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-1 flex items-center gap-2"><Phone className="w-4 h-4" /> رقم الهاتف</h4>
                    <p className="text-gray-900 font-medium" dir="ltr">{formData.phone || '—'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-1 flex items-center gap-2"><Mail className="w-4 h-4" /> البريد الإلكتروني</h4>
                    <p className="text-gray-900 font-medium" dir="ltr">{formData.email || '—'}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-1 flex items-center gap-2"><MapPin className="w-4 h-4" /> العنوان التفصيلي</h4>
                    <p className="text-gray-900 font-medium">
                      {[formData.addressCountry, formData.addressGov, formData.addressCity, formData.addressNeighborhood].filter(Boolean).join(' - ') || formData.address || '—'}
                    </p>
                  </div>
                </div>

                {formData.notes && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> نبذة / ملاحظات</h4>
                    <p className="text-gray-900 p-4 bg-gray-50 rounded-xl leading-relaxed">{formData.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col items-center mb-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden relative">
                      {formData.logoUrl ? (
                        <Image src={formData.logoUrl} alt="Logo" fill className="object-cover" unoptimized referrerPolicy="no-referrer" />
                      ) : (
                        <Store className="w-10 h-10 text-gray-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute bottom-0 right-0 p-2 bg-green-600 rounded-full text-white shadow-md hover:bg-green-700 transition"
                    >
                      {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      className="hidden" 
                      accept="image/*"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">شعار / صورة الحساب (اختياري)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="storeName" className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-gray-400" />
                      اسم المحل / اسم العميل <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="storeName"
                      placeholder="الاسم الذي سيظهر للشركات"
                      value={formData.storeName}
                      onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                      required
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      نوع النشاط التجاري
                    </Label>
                    <Select value={formData.activityType} onValueChange={(val) => setFormData(prev => ({ ...prev, activityType: val || '' }))}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="اختر نوع النشاط" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pharmacy">صيدلية</SelectItem>
                        <SelectItem value="supermarket">سوبر ماركت / بقالة</SelectItem>
                        <SelectItem value="clinic">عيادة طبية / مستشفى</SelectItem>
                        <SelectItem value="wholesaler">تاجر جملة</SelectItem>
                        <SelectItem value="other">آخر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.activityType === 'other' && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>تحديد نوع النشاط (آخر)</Label>
                      <Input
                        placeholder="اكتب نوع النشاط هنا..."
                        value={formData.activityTypeOther}
                        onChange={(e) => setFormData(prev => ({ ...prev, activityTypeOther: e.target.value }))}
                        className="h-12"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      رقم الهاتف <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phone"
                      placeholder="مثال: +966500000000"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      required
                      dir="ltr"
                      className="h-12 text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      البريد الإلكتروني (اختياري)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      dir="ltr"
                      className="h-12 text-right"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                      <Label className="flex items-center gap-2 mb-4">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        المنطقة الجغرافية والعنوان
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                          <div className="space-y-2">
                             <Label className="text-xs text-gray-600">البلد</Label>
                             <Input placeholder="مثال: السعودية" value={formData.addressCountry} onChange={(e) => setFormData(prev => ({ ...prev, addressCountry: e.target.value}))} />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs text-gray-600">المنطقة / المحافظة</Label>
                             <Input placeholder="مثال: الرياض" value={formData.addressGov} onChange={(e) => setFormData(prev => ({ ...prev, addressGov: e.target.value}))} />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs text-gray-600">المدينة</Label>
                             <Input placeholder="مثال: الرياض" value={formData.addressCity} onChange={(e) => setFormData(prev => ({ ...prev, addressCity: e.target.value}))} />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-xs text-gray-600">الحي</Label>
                             <Input placeholder="مثال: الياسمين" value={formData.addressNeighborhood} onChange={(e) => setFormData(prev => ({ ...prev, addressNeighborhood: e.target.value}))} />
                          </div>
                      </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      ملاحظات / وصف عن طبيعة عملك
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="نبذة عن طبيعة عملك واحتياجاتك..."
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="min-h-[100px] resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-center gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto md:min-w-[200px] h-12 text-base font-bold bg-green-600 hover:bg-green-700"
                  >
                    {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin inline" /> : null}
                    حفظ التغييرات
                  </Button>
                  <Button
                    type="button"
                    disabled={loading}
                    variant="outline"
                    onClick={() => {
                        setIsEditing(false);
                        setFormData({
                            storeName: profile?.storeName || profile?.displayName || '',
                            phone: profile?.phone || '',
                            address: profile?.address || '',
                            addressCountry: profile?.addressCountry || '',
                            addressGov: profile?.addressGov || '',
                            addressCity: profile?.addressCity || '',
                            addressNeighborhood: profile?.addressNeighborhood || '',
                            logoUrl: profile?.logoUrl || '',
                            activityType: profile?.activityType || '',
                            activityTypeOther: profile?.activityTypeOther || '',
                            notes: profile?.notes || '',
                            email: profile?.email || ''
                          });
                    }}
                    className="h-12 w-full md:w-auto md:min-w-[120px]"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-600" />
                التقارير التحليلية
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                 <div className="relative">
                   <Select value={reportCompanyFilter} onValueChange={(val) => setReportCompanyFilter(val || 'all')}>
                     <SelectTrigger className="w-full sm:w-[200px] h-10 bg-gray-50 border-gray-200">
                       <Filter className="w-4 h-4 mr-2 text-gray-500" />
                       <SelectValue placeholder="اختر الشركة" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">جميع الشركات</SelectItem>
                       {companies.map(c => (
                         <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="relative">
                   <Select value={reportDateFilter} onValueChange={(val) => setReportDateFilter(val || 'all')}>
                     <SelectTrigger className="w-full sm:w-[160px] h-10 bg-gray-50 border-gray-200">
                       <Clock className="w-4 h-4 mr-2 text-gray-500" />
                       <SelectValue placeholder="الفترة" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">كل الأوقات</SelectItem>
                       <SelectItem value="week">آخر 7 أيام</SelectItem>
                       <SelectItem value="month">آخر شهر</SelectItem>
                       <SelectItem value="year">آخر سنة</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
              </div>
            </div>
            
            {loadingOrders ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
            ) : (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                       <h3 className="text-sm font-bold text-blue-600 mb-2">إجمالي الطلبات المقبولة</h3>
                       <p className="text-3xl font-bold text-gray-900">{reportData.orderCount}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                       <h3 className="text-sm font-bold text-green-600 mb-2">عدد الوحدات المطلوبة</h3>
                       <p className="text-3xl font-bold text-gray-900">{reportData.totalItems}</p>
                    </div>
                 </div>

                 {/* Currency breakdown */}
                 {Object.keys(reportData.amountsByCurrency).length > 0 && (
                   <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50/80 px-4 py-3 border-b">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-gray-500" />
                          إجمالي المبالغ حسب العملة ونوع الفاتورة
                        </h3>
                      </div>
                      <div className="p-0">
                        <table className="w-full text-sm text-right">
                          <thead className="bg-white border-b text-gray-500">
                            <tr>
                              <th className="px-4 py-3 font-medium">العملة</th>
                              <th className="px-4 py-3 font-medium text-green-600">فواتير نقدية</th>
                              <th className="px-4 py-3 font-medium text-orange-600">فواتير معلقة</th>
                              <th className="px-4 py-3 font-medium text-purple-600">فواتير آجلة/ذمم</th>
                              <th className="px-4 py-3 font-medium text-blue-600">الإجمالي العام</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {Object.entries(reportData.amountsByCurrency).map(([currency, amounts]) => (
                               <tr key={currency} className="hover:bg-gray-50">
                                 <td className="px-4 py-4 font-bold text-gray-900 text-lg">{currency}</td>
                                 <td className="px-4 py-4 font-bold text-green-600">{(amounts.cash).toLocaleString()}</td>
                                 <td className="px-4 py-4 font-bold text-orange-600">{(amounts.pendingCash).toLocaleString()}</td>
                                 <td className="px-4 py-4 font-bold text-purple-600">{(amounts.credit).toLocaleString()}</td>
                                 <td className="px-4 py-4 font-bold text-blue-600">{(amounts.cash + amounts.pendingCash + amounts.credit).toLocaleString()}</td>
                               </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                   </div>
                 )}

                 {/* Charts */}
                 {reportData.chartDataByDate.length > 0 && (
                   <div className="bg-white border rounded-xl p-6 shadow-sm">
                     <h3 className="font-bold text-gray-900 mb-6">معدل الطلبات والقيم عبر الزمن</h3>
                     <div className="h-[300px] w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={reportData.chartDataByDate}>
                             <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                             <XAxis dataKey="name" fontSize={12} tickMargin={10} />
                             <YAxis yAxisId="left" fontSize={12} />
                             <YAxis yAxisId="right" orientation="right" fontSize={12} />
                             <RechartsTooltip />
                             <Legend />
                             <Line yAxisId="left" type="monotone" dataKey="الطلبات" stroke="#2563eb" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                             <Line yAxisId="right" type="monotone" dataKey="القيمة" stroke="#16a34a" strokeWidth={3} dot={{r:4}} activeDot={{r:6}} />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                   </div>
                 )}

                 <div className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-900 border-b pb-2">تفاصيل الكميات لكل شركة</h3>
                    {detailedCompanyReports.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">لا توجد بيانات تفصيلية متاحة بعد لفترة التقرير الحالية.</p>
                    ) : (
                      detailedCompanyReports.map(comp => (
                        <div key={comp.companyId} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                           <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                             <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                               <Store className="w-5 h-5 text-gray-500" />
                               {comp.companyName}
                             </h4>
                             <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">{comp.totalOrders} طلبات</span>
                           </div>
                           <div>
                              <table className="w-full text-sm text-right">
                                <thead className="bg-white border-b text-gray-500">
                                  <tr>
                                    <th className="px-4 py-3 font-medium">الصنف</th>
                                    <th className="px-4 py-3 font-medium w-32">الكمية الأساسية</th>
                                    <th className="px-4 py-3 font-medium w-32">كمية البونص</th>
                                    <th className="px-4 py-3 font-medium w-32">إجمالي الوحدات</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {comp.items.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                                      <td className="px-4 py-3 text-blue-600 font-bold">{item.totalQuantity}</td>
                                      <td className="px-4 py-3 text-green-600">{item.totalBonusQuantity > 0 ? `+${item.totalBonusQuantity}` : '-'}</td>
                                      <td className="px-4 py-3 text-gray-900 font-bold">{item.totalQuantity + item.totalBonusQuantity}</td>
                                    </tr>
                                  ))}
                                  {comp.items.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="px-4 py-4 text-center text-gray-500">لا توجد تفاصيل أصناف لهذه الشركة</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
