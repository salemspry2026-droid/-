'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, UserRound, Phone, MapPin, Store, Camera, Mail, FileText, Activity, BarChart3, Clock, DollarSign } from 'lucide-react';

export default function ClientProfile() {
  const { profile, user } = useStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    phone: '',
    address: '',
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

  useEffect(() => {
    if (profile) {
      setFormData({
        storeName: profile.storeName || profile.displayName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        logoUrl: profile.logoUrl || '',
        activityType: profile.activityType || '',
        activityTypeOther: profile.activityTypeOther || '',
        notes: profile.notes || '',
        email: profile.email || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    import('firebase/firestore').then(({ collection, query, where, onSnapshot }) => {
      let myOrders: any[] = [];
      let mappedOrders: any[] = [];
      const updateCombined = () => {
        const combined = [...myOrders, ...mappedOrders];
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        setClientOrders(unique);
        setLoadingOrders(false);
      };
      const qSelf = query(collection(db, 'orders'), where('createdBy', '==', user.uid));
      const qClientUid = query(collection(db, 'orders'), where('clientUid', '==', user.uid));
      
      const unsubSelf = onSnapshot(qSelf, (snap) => {
        myOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !(d as any).isDeleted);
        updateCombined();
      });
      const unsubClientUid = onSnapshot(qClientUid, (snap) => {
        mappedOrders = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(d => !(d as any).isDeleted);
        updateCombined();
      });
      return () => { unsubSelf(); unsubClientUid(); };
    });
  }, [user]);

  const reportData = useMemo(() => {
    let pendingCashTotal = 0;
    let cashTotal = 0;
    let totalItems = 0;
    
    clientOrders.forEach(o => {
      if (o.status !== 'cancelled' && o.status !== 'rejected') {
         const amount = Object.values(o.totalAmountByCurrency || {})[0] as number || 0;
         if (o.invoiceType === 'pending_cash') pendingCashTotal += amount;
         if (o.invoiceType === 'cash') cashTotal += amount;
         totalItems += (o.items?.length || 0);
      }
    });

    return { pendingCashTotal, cashTotal, totalItems, orderCount: clientOrders.length };
  }, [clientOrders]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة صالحة');
      return;
    }

    setUploadingImage(true);
    try {
      const storageRef = ref(storage, `clientLogos/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
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
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        storeName: formData.storeName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        logoUrl: formData.logoUrl,
        activityType: formData.activityType,
        activityTypeOther: formData.activityType === 'other' ? formData.activityTypeOther.trim() : '',
        notes: formData.notes.trim(),
        email: formData.email.trim()
      });
      toast.success('تم تحديث البيانات بنجاح');
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
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <UserRound className="w-6 h-6 text-green-600" />
              تحديث بيانات الحساب
            </h2>
            
            {(!profile?.phone || !profile?.storeName) && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
                <p className="font-bold mb-1">البيانات غير مكتملة</p>
                <p>يرجى إكمال إدخال رقم الهاتف واسم المحل/العميل لتتمكن من رفع الطلبات للشركات.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
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
                  <Select value={formData.activityType} onValueChange={(val) => setFormData(prev => ({ ...prev, activityType: val }))}>
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

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    العنوان التفصيلي
                  </Label>
                  <Input
                    id="address"
                    placeholder="المدينة الحي، الشارع..."
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="h-12"
                  />
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

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto md:min-w-[200px] h-12 text-base font-bold bg-green-600 hover:bg-green-700 mx-auto block"
                >
                  {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin inline" /> : null}
                  حفظ التغييرات
                </Button>
              </div>
            </form>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
              التقارير التحليلية
            </h2>
            
            {loadingOrders ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>
            ) : (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                       <h3 className="text-sm font-bold text-gray-600 mb-2">إجمالي الطلبات</h3>
                       <p className="text-3xl font-bold text-gray-900">{reportData.orderCount}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                       <h3 className="text-sm font-bold text-gray-600 mb-2">الوحدات المطلوبة</h3>
                       <p className="text-3xl font-bold text-gray-900">{reportData.totalItems}</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                       <h3 className="text-sm font-bold text-gray-600 mb-2">إجمالي الفواتير النقدية</h3>
                       <p className="text-2xl font-bold text-gray-900">{reportData.cashTotal.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                       <h3 className="text-sm font-bold text-gray-600 mb-2">إجمالي الفواتير المعلقة</h3>
                       <p className="text-2xl font-bold text-gray-900">{reportData.pendingCashTotal.toLocaleString()}</p>
                    </div>
                 </div>

                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center mt-8">
                    <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
                      هذا ملخص سريع لمعاملاتك الحالية عبر المنصة. جارٍ العمل على تقارير تفصيلية إضافية تتيح تتبع الكميات لكل صنف بشكل دقيق مع كل شركة على حدة.
                    </p>
                 </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
