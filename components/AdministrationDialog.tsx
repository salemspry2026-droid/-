'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Settings, Plus, Trash2, Edit2, Save, X, MapPin, Tags, ListOrdered, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AdministrationDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { profile, user } = useStore();
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl">
          <div className="p-6 text-center text-red-500">
            عذراً، ليس لديك صلاحية للوصول إلى هذه الصفحة.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5 text-blue-600" /> الإدارة
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="currencies" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="currencies" className="text-xs md:text-sm"><DollarSign className="w-4 h-4 ml-1 hidden md:block"/> العملات</TabsTrigger>
              <TabsTrigger value="locations" className="text-xs md:text-sm"><MapPin className="w-4 h-4 ml-1 hidden md:block"/> العناوين</TabsTrigger>
              <TabsTrigger value="products" className="text-xs md:text-sm"><Tags className="w-4 h-4 ml-1 hidden md:block"/> الأصناف</TabsTrigger>
              <TabsTrigger value="stages" className="text-xs md:text-sm"><ListOrdered className="w-4 h-4 ml-1 hidden md:block"/> المراحل</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="currencies" className="p-6 m-0">
            <CurrenciesManager companyId={profile.companyId!} userId={user!.uid} />
          </TabsContent>
          
          <TabsContent value="locations" className="p-6 m-0">
            <LocationsManager companyId={profile.companyId!} userId={user!.uid} />
          </TabsContent>

          <TabsContent value="products" className="p-6 m-0">
            <ProductMetadataManager companyId={profile.companyId!} userId={user!.uid} />
          </TabsContent>

          <TabsContent value="stages" className="p-6 m-0">
            <OrderStagesManager companyId={profile.companyId!} userId={user!.uid} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

const CURRENCIES_LIST = [
  { code: 'SAR', label: 'الريال السعودي (SAR)' },
  { code: 'AED', label: 'الدرهم الإماراتي (AED)' },
  { code: 'QAR', label: 'الريال القطري (QAR)' },
  { code: 'KWD', label: 'الدينار الكويتي (KWD)' },
  { code: 'BHD', label: 'الدينار البحريني (BHD)' },
  { code: 'OMR', label: 'الريال العماني (OMR)' },
  { code: 'YER', label: 'الريال اليمني (YER)' },
  { code: 'EGP', label: 'الجنيه المصري (EGP)' },
  { code: 'JOD', label: 'الدينار الأردني (JOD)' },
  { code: 'LBP', label: 'الليرة اللبنانية (LBP)' },
  { code: 'SYP', label: 'الليرة السورية (SYP)' },
  { code: 'IQD', label: 'الدينار العراقي (IQD)' },
  { code: 'MAD', label: 'الدرهم المغربي (MAD)' },
  { code: 'DZD', label: 'الدينار الجزائري (DZD)' },
  { code: 'TND', label: 'الدينار التونسي (TND)' },
  { code: 'LYD', label: 'الدينار الليبي (LYD)' },
  { code: 'SDG', label: 'الجنيه السوداني (SDG)' },
  { code: 'USD', label: 'الدولار الأمريكي (USD)' },
  { code: 'EUR', label: 'اليورو (EUR)' },
];

function CurrenciesManager({ companyId, userId }: { companyId: string, userId: string }) {
  const [primaryCurrency, setPrimaryCurrency] = useState('SAR');
  const [secondaryCurrencies, setSecondaryCurrencies] = useState<string[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [newCurrency, setNewCurrency] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'companies', companyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPrimaryCurrency(data.primaryCurrency || 'SAR');
        setSecondaryCurrencies(data.secondaryCurrencies || []);
        setExchangeRates(data.exchangeRates || {});
      }
    });
    return () => unsub();
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        primaryCurrency,
        secondaryCurrencies,
        exchangeRates,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
      toast.success('تم حفظ إعدادات العملات بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}`);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const addSecondary = () => {
    if (newCurrency && !secondaryCurrencies.includes(newCurrency) && newCurrency !== primaryCurrency) {
      setSecondaryCurrencies([...secondaryCurrencies, newCurrency]);
      setExchangeRates({ ...exchangeRates, [newCurrency]: 1 });
      setNewCurrency('');
    }
  };

  const removeSecondary = (curr: string) => {
    setSecondaryCurrencies(secondaryCurrencies.filter(c => c !== curr));
    const newRates = { ...exchangeRates };
    delete newRates[curr];
    setExchangeRates(newRates);
  };

  const updateRate = (curr: string, val: string) => {
    const num = parseFloat(val);
    setExchangeRates({ ...exchangeRates, [curr]: isNaN(num) ? 0 : num });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>العملة الرئيسية</Label>
        <Select value={primaryCurrency} onValueChange={(val) => val && setPrimaryCurrency(val)}>
          <SelectTrigger>
            <SelectValue placeholder="اختر العملة الرئيسية" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES_LIST.map(c => (
              <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">العملة الافتراضية التي سيتم استخدامها في التطبيق.</p>
      </div>

      <div className="space-y-2">
        <Label>العملات الإضافية</Label>
        <div className="flex gap-2">
          <Select value={newCurrency} onValueChange={(val) => val && setNewCurrency(val)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="اختر عملة إضافية" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES_LIST.map(c => (
                <SelectItem 
                  key={c.code} 
                  value={c.code} 
                  disabled={c.code === primaryCurrency || secondaryCurrencies.includes(c.code)}
                >
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={addSecondary} variant="secondary">إضافة</Button>
        </div>
        
        <div className="space-y-3 mt-4">
          {secondaryCurrencies.map(curr => {
            const currencyLabel = CURRENCIES_LIST.find(c => c.code === curr)?.label || curr;
            return (
              <div key={curr} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                    {curr}
                  </div>
                  {currencyLabel}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-gray-200">
                    <span className="text-xs text-gray-500">سعر الصرف = </span>
                    <Input 
                      type="number" 
                      value={exchangeRates[curr] || ''} 
                      onChange={(e) => updateRate(curr, e.target.value)} 
                      className="w-20 h-8 text-sm px-1 border-gray-300 text-center" 
                      placeholder="1.0" 
                      step="0.01"
                      min="0"
                    />
                    <span className="text-xs text-gray-500">{primaryCurrency}</span>
                  </div>
                  
                  <Button variant="ghost" size="icon" onClick={() => removeSecondary(curr)} className="text-red-500 hover:bg-red-100 h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          
          {secondaryCurrencies.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">لم يتم إضافة عملات إضافية</p>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-base">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التغييرات'}
      </Button>
    </div>
  );
}

function LocationsManager({ companyId, userId }: { companyId: string, userId: string }) {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('country');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'locations'), where('companyId', '==', companyId), where('isDeleted', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [companyId]);

  const handleAdd = async () => {
    if (!name) return;
    try {
      await addDoc(collection(db, 'locations'), {
        companyId,
        name,
        type,
        parentId: parentId || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false
      });
      setName('');
      toast.success('تمت الإضافة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'locations');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await updateDoc(doc(db, 'locations', id), { isDeleted: true, updatedBy: userId, updatedAt: serverTimestamp() });
      toast.success('تم الحذف بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `locations/${id}`);
    }
  };

  const getTypeLabel = (t: string) => {
    switch(t) {
      case 'country': return 'بلد';
      case 'governorate': return 'محافظة';
      case 'region': return 'مدينة / منطقة';
      case 'neighborhood': return 'حي';
      default: return t;
    }
  };

  const renderLocationNode = (location: any, level: number = 0) => {
    const children = locations.filter(l => l.parentId === location.id);
    
    return (
      <div key={location.id} className={`mt-2 ${level > 0 ? 'pr-6 relative' : ''}`}>
        {level > 0 && (
          <div className="absolute right-0 top-6 w-4 border-t-2 border-gray-200" />
        )}
        <div className="flex justify-between items-center p-3 bg-white hover:bg-gray-50 rounded-xl border border-gray-100 shadow-sm transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${
              location.type === 'country' ? 'bg-blue-500' : 
              location.type === 'governorate' ? 'bg-green-500' : 
              location.type === 'region' ? 'bg-purple-500' : 'bg-orange-500'
            }`} />
            <div>
              <p className="font-bold text-gray-800">{location.name} <span className="text-xs font-normal text-gray-500 mr-2">({getTypeLabel(location.type)})</span></p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(location.id)} className="text-red-500 hover:bg-red-50 hover:text-red-600 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
        </div>
        {children.length > 0 && (
          <div className="border-r-2 border-gray-100 mr-3 mt-1">
            {children.map(c => renderLocationNode(c, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const rootLocations = locations.filter(l => !l.parentId || l.type === 'country');

  return (
    <div className="space-y-6">
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
        <h4 className="font-bold text-blue-900 border-b border-blue-100 pb-2">إضافة عنوان جديد</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={type} onValueChange={(val) => val && setType(val)}>
            <SelectTrigger className="bg-white"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="country">بلد</SelectItem>
              <SelectItem value="governorate">محافظة</SelectItem>
              <SelectItem value="region">مدينة / منطقة</SelectItem>
              <SelectItem value="neighborhood">حي</SelectItem>
            </SelectContent>
          </Select>
          
          {type !== 'country' && (
            <Select value={parentId} onValueChange={(val) => val && setParentId(val)}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="التابع لـ" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">بدون تابع</SelectItem>
                {locations.filter(l => l.type !== type && l.type !== 'neighborhood').map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name} ({getTypeLabel(l.type)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العنوان" className={`bg-white ${type === 'country' ? 'md:col-span-2' : ''}`} />
          <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700 w-full"><Plus className="w-4 h-4 ml-2" /> إضافة</Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto px-1 bg-gray-50/30 rounded-xl p-4 border border-gray-100 shadow-inner">
        <h4 className="font-bold text-gray-800 mb-4 sticky top-0 bg-white/80 backdrop-blur pb-2 z-10 hidden">خريطة العناوين المضافة</h4>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
        ) : rootLocations.length > 0 ? (
          rootLocations.map(loc => renderLocationNode(loc, 0))
        ) : (
          <div className="text-center text-gray-500 py-8">لا توجد عناوين مضافة بعد. أضف &quot;بلد&quot; للبدء بتكوين هيكل العناوين.</div>
        )}
      </div>
    </div>
  );
}

function ProductMetadataManager({ companyId, userId }: { companyId: string, userId: string }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newBrand, setNewBrand] = useState('');

  useEffect(() => {
    const qCat = query(collection(db, 'productCategories'), where('companyId', '==', companyId), where('isDeleted', '==', false));
    const unsubCat = onSnapshot(qCat, (snap) => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qBrand = query(collection(db, 'productBrands'), where('companyId', '==', companyId), where('isDeleted', '==', false));
    const unsubBrand = onSnapshot(qBrand, (snap) => setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubCat(); unsubBrand(); };
  }, [companyId]);

  const handleAdd = async (collectionName: string, name: string, setName: (v: string) => void) => {
    if (!name) return;
    try {
      await addDoc(collection(db, collectionName), {
        companyId, name, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: userId, updatedBy: userId, isDeleted: false
      });
      setName('');
      toast.success('تمت الإضافة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, collectionName);
    }
  };

  const handleDelete = async (collectionName: string, id: string) => {
    try {
      await updateDoc(doc(db, collectionName, id), { isDeleted: true, updatedBy: userId, updatedAt: serverTimestamp() });
      toast.success('تم الحذف بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionName}/${id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <h3 className="font-bold text-lg border-b pb-2">الفئات</h3>
        <div className="flex gap-2">
          <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="اسم الفئة الجديدة" />
          <Button onClick={() => handleAdd('productCategories', newCategory, setNewCategory)} variant="secondary">إضافة</Button>
        </div>
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {categories.map(c => (
            <div key={c.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
              <span>{c.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete('productCategories', c.id)} className="text-red-500 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg border-b pb-2">العلامات التجارية</h3>
        <div className="flex gap-2">
          <Input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="اسم العلامة الجديدة" />
          <Button onClick={() => handleAdd('productBrands', newBrand, setNewBrand)} variant="secondary">إضافة</Button>
        </div>
        <div className="space-y-2 max-h-[250px] overflow-y-auto">
          {brands.map(b => (
            <div key={b.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
              <span>{b.name}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete('productBrands', b.id)} className="text-red-500 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderStagesManager({ companyId, userId }: { companyId: string, userId: string }) {
  const [stages, setStages] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>(['owner', 'admin']);

  useEffect(() => {
    const q = query(collection(db, 'orderStages'), where('companyId', '==', companyId), where('isDeleted', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.index - b.index);
      setStages(docs);
    });
    return () => unsub();
  }, [companyId]);

  const handleAdd = async () => {
    if (!name) return;
    try {
      await addDoc(collection(db, 'orderStages'), {
        companyId,
        name,
        index: stages.length,
        allowedRoles,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false
      });
      setName('');
      toast.success('تمت إضافة المرحلة بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orderStages');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await updateDoc(doc(db, 'orderStages', id), { isDeleted: true, updatedBy: userId, updatedAt: serverTimestamp() });
      toast.success('تم الحذف بنجاح');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orderStages/${id}`);
    }
  };

  const toggleRole = (role: string) => {
    if (allowedRoles.includes(role)) {
      setAllowedRoles(allowedRoles.filter(r => r !== role));
    } else {
      setAllowedRoles([...allowedRoles, role]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
        <h4 className="font-bold text-blue-900">إضافة مرحلة جديدة</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم المرحلة</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: قيد التجهيز" />
          </div>
          <div className="space-y-2">
            <Label>الصلاحيات المسموحة للتأكيد</Label>
            <div className="flex gap-2 flex-wrap">
              {['owner', 'admin', 'sales', 'client'].map(role => (
                <Button 
                  key={role} 
                  type="button"
                  variant={allowedRoles.includes(role) ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => toggleRole(role)}
                  className={allowedRoles.includes(role) ? 'bg-blue-600' : ''}
                >
                  {role === 'owner' ? 'مالك' : role === 'admin' ? 'مدير' : role === 'sales' ? 'مبيعات' : 'عميل'}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button onClick={handleAdd} className="w-full"><Plus className="w-4 h-4 ml-2" /> إضافة المرحلة</Button>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold text-gray-700">المراحل الحالية (حسب الترتيب)</h4>
        {stages.map((stage, idx) => (
          <div key={stage.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">{idx + 1}</div>
              <div>
                <p className="font-bold">{stage.name}</p>
                <p className="text-xs text-gray-500">
                  الصلاحيات: {stage.allowedRoles.map((r: string) => r === 'owner' ? 'مالك' : r === 'admin' ? 'مدير' : r === 'sales' ? 'مبيعات' : 'عميل').join('، ')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(stage.id)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
          </div>
        ))}
        {stages.length === 0 && <p className="text-center text-gray-500 py-4">لا توجد مراحل مخصصة بعد.</p>}
      </div>
    </div>
  );
}
