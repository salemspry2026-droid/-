'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Package, Search, Gift, Edit, Trash2, CheckCircle, Store, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import { hasPermission } from '@/lib/utils';
import Image from 'next/image';
import { productService } from '@/lib/services/productService';
import { orderService, ProductStats } from '@/lib/services/orderService';

// Interfaces for better type safety
interface OrderItem {
  productId: string;
  quantity?: number;
  bonusQuantity?: number;
  price?: number;
}

interface OrderRecord {
  createdAt?: {
    seconds?: number;
    toMillis?: () => number;
  } | Date | string | number;
  items?: OrderItem[];
}

interface CustomerSpecificData {
  customerId: string;
  customerName: string;
  customerOrders: OrderRecord[];
}

interface ProductDetailsDialogProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: any) => void;
  categories?: any[];
  brands?: any[];
  customerSpecificData?: CustomerSpecificData;
}

export function ProductDetailsDialog({ 
  product, 
  isOpen, 
  onClose, 
  onEdit, 
  categories = [], 
  brands = [],
  customerSpecificData
}: ProductDetailsDialogProps) {
  const { profile, user } = useStore();
  const [stats, setStats] = useState<ProductStats>({ timesOrdered: 0, unitsSold: 0, totalSales: 0 });
  const [loading, setLoading] = useState(true);

  // Helper to safely parse dates from various formats (Firebase Timestamps, standard JS dates, etc.)
  const parseDate = (val: any): Date => {
    if (!val) return new Date();
    if (typeof val.toMillis === 'function') return new Date(val.toMillis());
    if (val.seconds) return new Date(val.seconds * 1000);
    if (val instanceof Date) return val;
    return new Date(val);
  };

  const custStats = useMemo(() => {
    if (!customerSpecificData || !product) return null;
    
    // Safety guard against empty orders array
    const rawOrders = customerSpecificData.customerOrders || [];
    
    const orders = [...rawOrders].sort((a, b) => {
      const da = parseDate(a.createdAt).getTime();
      const db = parseDate(b.createdAt).getTime();
      return db - da; // Descending order
    });

    const currentYear = new Date().getFullYear();
    
    let lastOrderDetails: { date: string; qty: number; bonus: number; } | null = null;
    let totalQty = 0;
    let totalQtyThisYear = 0;
    let maxQty = 0;
    let orderCount = 0;
    
    // Explicitly typed to prevent 'implicit any' or 'never' errors
    let firstOrderDate: Date | null = null;
    
    for (const order of orders) {
      let qtyInOrder = 0;
      let bonusInOrder = 0;
      
      const items = order.items || [];
      for (const item of items) {
        if (item.productId === product.id || item.productId === `${product.id}_offer`) {
          qtyInOrder += Number(item.quantity) || 0;
          bonusInOrder += Number(item.bonusQuantity) || 0;
        }
      }
      
      if (qtyInOrder > 0) {
        orderCount++;
        totalQty += qtyInOrder;
        
        if (qtyInOrder > maxQty) {
           maxQty = qtyInOrder;
        }
        
        const orderDate = parseDate(order.createdAt);
        if (orderDate.getFullYear() === currentYear) {
          totalQtyThisYear += qtyInOrder;
        }
        
        if (!lastOrderDetails) {
          lastOrderDetails = {
             date: orderDate.toLocaleDateString('ar-SA'),
             qty: qtyInOrder,
             bonus: bonusInOrder
          };
        }
        
        // Use getTime() for solid date comparison safely
        if (!firstOrderDate || orderDate.getTime() < firstOrderDate.getTime()) {
          firstOrderDate = orderDate;
        }
      }
    }

    const avgQty = orderCount > 0 ? Math.round(totalQty / orderCount) : 0;
    
    let approxMonthlySellRate = 0;
    if (orderCount > 1 && firstOrderDate) {
      const msDiff = Date.now() - firstOrderDate.getTime();
      // 30.44 days per month on average
      const monthsDiff = msDiff / (1000 * 3600 * 24 * 30.44);
      if (monthsDiff > 0.5) {
         approxMonthlySellRate = Math.round(totalQty / monthsDiff);
      } else {
         approxMonthlySellRate = totalQty;
      }
    } else if (orderCount === 1) {
       approxMonthlySellRate = totalQty;
    }

    return {
      lastOrderDetails,
      totalQty,
      maxQty,
      avgQty,
      totalQtyThisYear,
      approxMonthlySellRate,
      orderCount
    };
  }, [customerSpecificData, product]);

  // Aggregate stats separated into a service layer to abstract DB hits
  useEffect(() => {
    if (!product || !isOpen || !profile?.companyId || profile.role === 'client') return;
    
    let isMounted = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const productStats = await orderService.getProductStats(profile.companyId as string, product.id);
        if (isMounted) {
           setStats(productStats);
        }
      } catch (error) {
        console.error("Error fetching product stats:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchStats();
    
    return () => {
      isMounted = false;
    };
  }, [product, isOpen, profile?.companyId, profile?.role]);

  const handleDelete = async () => {
    if (!product?.id || !user?.uid) return;
    
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الصنف بشكل نهائي؟')) {
       try {
         await productService.softDeleteProduct(product.id, user.uid);
         toast.success('تم حذف الصنف بنجاح');
         onClose();
       } catch (error) {
         console.error("Error deleting product:", error);
         toast.error('حدث خطأ أثناء الحذف. يرجى المحاولة لاحقاً.');
       }
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[700px] md:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6" dir="rtl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl md:text-2xl font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>تفاصيل الصنف: {product.name}</span>
            {profile && profile.role !== 'client' && (
              <div className="flex gap-2">
                 {hasPermission(profile, 'products', 'edit') && (
                   <Button variant="outline" size="sm" className="text-blue-600 bg-blue-50 border-blue-200" onClick={() => onEdit?.(product)}>
                     <Edit className="w-4 h-4 mr-2" /> تعديل
                   </Button>
                 )}
                 {hasPermission(profile, 'products', 'delete') && (
                   <Button variant="outline" size="sm" className="text-red-600 bg-red-50 border-red-200" onClick={handleDelete}>
                     <Trash2 className="w-4 h-4 mr-2" /> حذف
                   </Button>
                 )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Customer Specific Stats for New Order Context */}
        {customerSpecificData && custStats && (
           <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-xl border border-blue-200 shadow-sm mb-6">
              <h3 className="font-bold text-blue-900 border-b border-blue-200 pb-2 mb-4 text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                معلومات العميل للصنف ({customerSpecificData.customerName})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col">
                       <span className="text-xs text-blue-600 font-bold mb-1">آخر طلب لهذا الصنف</span>
                       {custStats.lastOrderDetails ? (
                         <div className="text-sm">
                           <p className="font-bold text-gray-900">{custStats.lastOrderDetails.date}</p>
                           <p className="text-gray-700">الكمية: <span className="font-bold">{custStats.lastOrderDetails.qty}</span></p>
                           <p className="text-gray-700">البونص الممنوح: <span className="font-bold text-orange-600">{custStats.lastOrderDetails.bonus}</span></p>
                         </div>
                       ) : (
                         <p className="text-sm text-gray-500 italic">لم يقم العميل بطلب هذا الصنف سابقاً</p>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col justify-center">
                       <span className="text-xs text-gray-500 mb-1">أعلى كمية طلبها</span>
                       <span className="font-bold text-lg text-blue-700">{custStats.maxQty}</span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col justify-center">
                       <span className="text-xs text-gray-500 mb-1">متوسط الكمية للطلب</span>
                       <span className="font-bold text-lg text-blue-700">{custStats.avgQty}</span>
                    </div>
                 </div>
              </div>

              {custStats.orderCount > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                      <span className="text-sm text-blue-800 font-bold">إجمالي طلبات السنة الحالية:</span>
                      <span className="font-bold text-blue-900 px-2 py-1 bg-white rounded shadow-sm">{custStats.totalQtyThisYear} وحدة</span>
                   </div>
                   <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                      <span className="text-sm text-blue-800 font-bold">متوسط التصرّيف الشهري (تقريبي):</span>
                      <span className="font-bold text-blue-900 px-2 py-1 bg-white rounded shadow-sm">{custStats.approxMonthlySellRate} وحدة / شهر</span>
                   </div>
                </div>
              )}
           </div>
        )}

        {/* Dashboard Stats */}
        {profile?.role !== 'client' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
              <div className="relative w-40 h-40 shrink-0 bg-white rounded-xl border flex items-center justify-center overflow-hidden p-2">
                {product.imageUrl ? (
                   <Image src={product.imageUrl} alt={product.name} fill className="object-contain" referrerPolicy="no-referrer" />
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
                {product.specialOffer?.isActive && (
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
                )}
                
                {/* Main Bonus Display */}
                <div className={`text-sm ${product.specialOffer?.isActive ? 'border-t border-red-100 pt-2 mt-2' : ''}`}>
                    {product.bonusType === 'fixed' ? (
                       <p className="font-bold text-gray-800">بونص ثابت: <span className="text-orange-600">{product.bonusFixedPercent}%</span> من الكمية المطلوبة</p>
                    ) : product.bonusType === 'tiered' && product.bonusTiers?.length > 0 ? (
                       <div className="space-y-2">
                          <p className="font-bold text-gray-800 mb-1">بونص شرائح حسب الكمية:</p>
                          <div className="space-y-1">
                             {product.bonusTiers.map((tier: any, idx: number) => (
                                <div key={idx} className="flex flex-wrap gap-2 text-xs bg-gray-50 p-2 rounded border border-gray-100">
                                   <span className="text-gray-600">من {tier.minQty}</span>
                                   <span className="text-gray-600">{tier.maxQty ? `إلى ${tier.maxQty}` : 'فأكثر'}</span>
                                   <span className="font-bold text-orange-600">◀ بونص {tier.percent}%</span>
                                   {tier.invoiceType && tier.invoiceType !== 'all' && (
                                      <span className="bg-blue-100 text-blue-700 px-1 rounded text-[10px]">
                                         ({tier.invoiceType === 'cash' ? 'للنقدي' : tier.invoiceType === 'credit' ? 'للآجل' : 'للنقدي المعلق'})
                                      </span>
                                   )}
                                </div>
                             ))}
                          </div>
                       </div>
                    ) : (!product.specialOffer?.isActive && product.bonus) ? (
                        <p><span className="font-bold">البونص الأساسي:</span> {product.bonus}</p>
                    ) : !product.specialOffer?.isActive ? (
                        <p className="text-gray-500">لا يوجد عروض خاصة أو بونص لهذا الصنف حالياً.</p>
                    ) : null}
                </div>
             </div>

             {/* Sales Policies */}
             <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3 col-span-1 md:col-span-2">
                <h4 className="font-bold text-blue-900 border-b border-blue-200 pb-2">سياسات البيع المطبقة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-2">
                   <div>
                      <p className="font-bold text-gray-700">طريقة الدفع المسموحة:</p>
                      <p className="text-gray-600 font-medium">
                         {product.invoiceTypeRestriction === 'all' || !product.invoiceTypeRestriction ? 'مسموح بجميع الطرق (نقدي، آجل)' : ''}
                         {product.invoiceTypeRestriction === 'cash_only' ? 'نقدي فقط (غير مسموح بالآجل)' : ''}
                         {product.invoiceTypeRestriction === 'cash_or_pending' ? 'نقدي أو نقدي معلق (غير مسموح بالآجل)' : ''}
                      </p>
                   </div>
                   <div>
                      <p className="font-bold text-gray-700">قيود بيع العملة:</p>
                      <p className="text-gray-600 font-medium">
                         {product.currencyRestrictionType === 'any' || !product.currencyRestrictionType ? 'مرونة البيع بأي عملة' : ''}
                         {product.currencyRestrictionType === 'primary_only' ? `يباع بالعملة الأساسية للصنف فقط (${product.currency})` : ''}
                         {product.currencyRestrictionType === 'specific' ? `يباع بعملات محددة: ${product.specificCurrencies?.join(' ، ')}` : ''}
                      </p>
                   </div>
                </div>
             </div>
           </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
