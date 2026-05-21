'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserRound, Phone, MapPin, Store, Camera } from 'lucide-react';
import Image from 'next/image';

export default function ClientProfile() {
  const { profile, user } = useStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    storeName: '',
    phone: '',
    address: '',
    logoUrl: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        storeName: profile.storeName || profile.displayName || '',
        phone: profile.phone || '',
        address: profile.address || '',
        logoUrl: profile.logoUrl || ''
      });
    }
  }, [profile]);

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
        logoUrl: formData.logoUrl
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
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <UserRound className="w-6 h-6 text-green-600" />
          معلومات الحساب
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
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              العنوان (اختياري)
            </Label>
            <Input
              id="address"
              placeholder="المدينة الحي، الشارع..."
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="h-12"
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
