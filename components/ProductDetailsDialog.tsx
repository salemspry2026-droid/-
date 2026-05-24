'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, Search, Gift, Edit, Trash2, CheckCircle, Store, Tag } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';

export function ProductDetailsDialog({ product, isOpen, onClose, onEdit, categories = [], brands = [] }: { product: any, isOpen: boolean, onClose: () => void, onEdit?: (product: any) => void, categories?: any[], brands?: any[] }) {
  const { profile, user } = useStore();
  const [stats, setStats] = useState({ timesOrdered: 0, unitsSold: 0, totalSales: 0 });
  const [loading, setLoading] = useState(true);

  // We are assuming standard functionality, only calculating stats from 'orders'
  useEffect(() => {
    if (!product || !isOpen || !profile?.companyId || profile.role === 'client') return;
    
    // In a real optimized scenario, we would use aggregations or cloud functions
    // For now, doing a client-side aggregation
    const fetchStats = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('companyId', '==', profile.companyId),
          where('isDeleted', '==', false)
        );
        const snapshot = await getDocs(q);
        
        let timesOrdered = 0;
        let unitsSold = 0;
        let totalSales = 0;
        
        snapshot.docs.forEach(doc => {
          const order = doc.data();
          if (order.items && Array.isArray(order.items)) {
            const productItems = order.items.filter((item: any) => item.productId === product.id || item.productId === `${product.id}_offer`);
            if (productItems.length > 0) {
              timesOrdered += 1;
              productItems.forEach((item: any) => {
                 unitsSold += item.quantity;
                 totalSales += item.quantity * item.price;
              });
            }
          }
        });
        
        setStats({ timesOrdered, unitsSold, totalSales });
      } catch (error) {
        console.error("Error fetching product stats:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [product, isOpen, profile?.companyId, profile?.role]);

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الصنف بشكل نهائي؟')) {
       try {
         await updateDoc(doc(db, 'products', product.id), {
           isDeleted: true,
           updatedAt: serverTimestamp(),
           updatedBy: user?.uid
         });
         toast.success('تم حذف الصنف بنجاح');
         onClose();
       } catch (error) {
         toast.error('حدث خطأ أثناء الحذف');
       }
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <span>تفاصيل الصنف: {product.name}</span>
            {profile && ['owner', 'admin', 'sales'].includes(profile.role as string) && (
              <div className="flex gap-2">
                 <Button variant="outline" size="sm" className="text-blue-600 bg-blue-50 border-blue-200" onClick={() => onEdit?.(product)}>
                   <Edit className="w-4 h-4 mr-2" /> تعديل
                 </Button>
                 <Button variant="outline" size="sm" className="text-red-600 bg-red-50 border-red-200" onClick={handleDelete}>
                   <Trash2 className="w-4 h-4 mr-2" /> حذف
                 </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Dashboard Stats */}
        {profile?.role !== 'client' && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
               <Store className="w-6 h-6 text-blue-500 mb-2" />
               <p className="text-sm font-bold text-gray-600">مرات الطلب</p>
               <p className="text-2xl font-bold text-gray-900">{stats.timesOrdered}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
               <Package className="w-6 h-6 text-green-500 mb-2" />
               <p className="text-sm font-bold text-gray-600">الوحدات المباعة</p>
               <p className="text-2xl font-bold text-gray-900">{stats.unitsSold}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col items-center justify-center text-center">
               <Tag className="w-6 h-6 text-orange-500 mb-2" />
               <p className="text-sm font-bold text-gray-600">إجمالي المبيعات</p>
               <p className="text-2xl font-bold text-gray-900">{stats.totalSales.toLocaleString()} <span className="text-sm">{product.currency}</span></p>
            </div>
          </div>
        )}

        {/* Product Data CV */}
        <div className="space-y-6">
           <div className="flex flex-col md:flex-row gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <div className="w-40 h-40 shrink-0 bg-white rounded-xl border flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                   <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                   <Package className="w-16 h-16 text-gray-300" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                 <div>
                    <h3 className="text-xl font-bold text-gray-900">{product.name}</h3>
                    <p className="text-gray-500">
                      {categories.find(c => c.id === product.categoryId)?.name || 'بدون تصنيف'} 
                      {product.brandId && ` • ${brands.find(b => b.id === product.brandId)?.name || ''}`}
                    </p>
                 </div>
                 <div className="text-2xl font-bold text-blue-600">
                    {product.price} <span className="text-base text-gray-600">{product.currency} / {product.unit || 'حبة'}</span>
                 </div>
                 {product.description && (
                   <p className="text-gray-700 text-sm bg-white p-3 rounded-lg border">{product.description}</p>
                 )}
                 {product.notes && (
                   <p className="text-gray-600 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">ملاحظات: {product.notes}</p>
                 )}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Expiry Dates & Stock */}
             <div className="bg-white p-4 rounded-xl border space-y-3">
                <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  حالة المخزون وتواريخ الصلاحية
                </h4>
                <div className="flex items-center gap-2">
                   <span className="text-gray-600 font-bold text-sm">الحالة:</span>
                   <span className={`px-2 py-1 rounded text-xs font-bold ${product.inStock !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {product.inStock !== false ? 'متوفر' : 'نفدت الكمية'}
                   </span>
                </div>
                {product.expiryDates && product.expiryDates.length > 0 && (
                   <div>
                     <span className="text-gray-600 font-bold text-sm mb-2 block">تواريخ الصلاحية:</span>
                     <div className="flex flex-wrap gap-2">
                        {product.expiryDates.map((d: string, i: number) => (
                           <span key={i} className="bg-gray-100 px-2 py-1 rounded text-sm dir-ltr border border-gray-200">{d}</span>
                        ))}
                     </div>
                   </div>
                )}
             </div>

             {/* Special Offer / Bonus */}
             <div className={`p-4 rounded-xl border space-y-3 ${product.specialOffer?.isActive ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-orange-500" />
                  العروض والبونص
                </h4>
                {product.specialOffer?.isActive ? (
                   <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                         <span className="text-gray-600 font-bold">سعر العرض:</span>
                         <span className="text-red-700 font-bold">{product.specialOffer.price} {product.currency}</span>
                      </div>
                      {product.specialOffer.bonus && (
                         <div className="flex justify-between">
                            <span className="text-gray-600 font-bold">بونص العرض:</span>
                            <span className="text-orange-600">{product.specialOffer.bonus}</span>
                         </div>
                      )}
                      {product.specialOffer.targetExpiryDate && product.specialOffer.targetExpiryDate !== 'any' && (
                         <div className="flex justify-between">
                            <span className="text-gray-600 font-bold">يستهدف تاريخ:</span>
                            <span dir="ltr">{product.specialOffer.targetExpiryDate}</span>
                         </div>
                      )}
                      {product.specialOffer.condition === 'quantity' && product.specialOffer.quantity && (
                         <div className="flex justify-between">
                            <span className="text-gray-600 font-bold">كمية العرض:</span>
                            <span>{product.specialOffer.quantity}</span>
                         </div>
                      )}
                      {product.specialOffer.condition === 'time' && product.specialOffer.endDate && (
                         <div className="flex justify-between text-red-600">
                            <span className="font-bold">ينتهي في:</span>
                            <span dir="ltr">{product.specialOffer.endDate}</span>
                         </div>
                      )}
                   </div>
                ) : (
                   <div className="text-sm text-gray-600">
                      {product.bonus ? <p><span className="font-bold">البونص الأساسي:</span> {product.bonus}</p> : <p>لا يوجد عروض خاصة أو بونص لهذا الصنف حالياً.</p>}
                   </div>
                )}
             </div>

             {/* Sales Policies (Only visible to admin/owner) */}
             {profile && ['owner', 'admin', 'sales'].includes(profile.role as string) && (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3 col-span-1 md:col-span-2">
                  <h4 className="font-bold text-blue-900 border-b border-blue-200 pb-2">سياسات البيع</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-2">
                     <div>
                        <p className="font-bold text-gray-700">طريقة الدفع المسموحة:</p>
                        <p className="text-gray-600">
                           {product.invoiceTypeRestriction === 'all' || !product.invoiceTypeRestriction ? 'مسموح بجميع الطرق (نقدي، آجل)' : ''}
                           {product.invoiceTypeRestriction === 'cash_only' ? 'نقدي فقط' : ''}
                           {product.invoiceTypeRestriction === 'cash_or_pending' ? 'نقدي أو معلق (لا يباع بالآجل)' : ''}
                        </p>
                     </div>
                     <div>
                        <p className="font-bold text-gray-700">قيود بيع العملة:</p>
                        <p className="text-gray-600">
                           {product.currencyRestrictionType === 'any' || !product.currencyRestrictionType ? 'مرونة بيع بأي عملة' : ''}
                           {product.currencyRestrictionType === 'primary_only' ? 'يباع بالعملة الأساسية للصنف فقط' : ''}
                           {product.currencyRestrictionType === 'specific' ? `يباع بعملات محددة: ${product.specificCurrencies?.join(' ، ')}` : ''}
                        </p>
                     </div>
                  </div>
               </div>
             )}
           </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
