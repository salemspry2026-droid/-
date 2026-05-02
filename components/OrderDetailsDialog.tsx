'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, User, Info, ShoppingCart, ReceiptText, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';

export function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
  stages
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  stages: any[];
}) {
  const [saving, setSaving] = useState(false);
  const { user } = useStore();

  if (!order) return null;

  // Determine current stage index
  const currentStageIndex = stages.findIndex(s => s.name === order.status || s.id === order.status);
  
  // To handle string based statuses when custom stages aren't matching
  const hasValidStage = currentStageIndex !== -1;
  const activeIndex = hasValidStage ? currentStageIndex : 0;
  
  const nextStage = hasValidStage && activeIndex < stages.length - 1 ? stages[activeIndex + 1] : null;

  const handleMoveToNextStage = async () => {
    if (!nextStage) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStage.name,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || 'system'
      });
      toast.success('تم انتقال الطلب للمرحلة التالية بنجاح');
      onOpenChange(false);

      const isFinalStage = stages.length > 0 && nextStage.name === stages[stages.length - 1].name;
      if (!isFinalStage) {
        const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'notifications', notifId), {
          companyId: order.companyId,
          title: 'تحديث حالة الطلب',
          message: `تم تحديث حالة الطلب للعميل ${order?.customerName || ''} إلى: ${nextStage.name}`,
          type: 'status_update',
          orderId: order.id,
          readBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user?.uid,
          updatedBy: user?.uid,
          isDeleted: false
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'notifications'));
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
      toast.error('حدث خطأ أثناء نقل الطلب');
    } finally {
      setSaving(false);
    }
  };

  const invoiceTypeLabels: Record<string, string> = {
    cash: 'نقدي',
    pending_cash: 'نقدي معلق',
    credit: 'آجل',
    other: 'آخر'
  };

  const orderDate = order.createdAt ? order.createdAt.toDate() : new Date();
  const diffDays = Math.floor((new Date().getTime() - orderDate.getTime()) / (1000 * 3600 * 24));
  let timeString = '';
  const timeFormatted = format(orderDate, 'hh:mm a', { locale: ar });
  if (diffDays === 0) timeString = `اليوم • ${timeFormatted}`;
  else if (diffDays === 1) timeString = `أمس • ${timeFormatted}`;
  else timeString = `قبل ${diffDays} أيام • ${timeFormatted}`;

  const items = order.items || [];
  const currencyTotals = order.totalAmountByCurrency || {};
  const currencyEntries = Object.entries(currencyTotals);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[90vh] md:h-[800px] flex flex-col p-0 overflow-hidden bg-[#F8FAFC] border-gray-200" dir="rtl">
        {/* Header */}
        <DialogHeader className="p-4 bg-white border-b flex-shrink-0 relative flex items-center justify-center h-16">
          <DialogTitle className="text-xl font-bold text-gray-900 leading-none m-0">
            {order.id.split('_').pop()?.toUpperCase() || order.id}
          </DialogTitle>
          <button onClick={() => onOpenChange(false)} className="absolute right-4 p-2 hover:bg-gray-100 rounded-full text-gray-900 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          
          {/* Progress Bar */}
          {stages.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative">
               <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
               {stages.map((stage, idx) => {
                 const isCompleted = idx < activeIndex;
                 const isCurrent = idx === activeIndex;
                 const isUpcoming = idx > activeIndex;

                 return (
                   <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                     <div className={cn(
                       "w-6 h-6 rounded-full border-4 flex items-center justify-center transition-all",
                       isCompleted ? "bg-blue-600 border-blue-600" :
                       isCurrent ? "bg-white border-blue-600 ring-4 ring-blue-50" :
                       "bg-gray-100 border-gray-100"
                     )}>
                       {isCompleted && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                       {isCurrent && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                     </div>
                     <span className={cn(
                       "text-[10px] font-bold absolute -bottom-6 whitespace-nowrap",
                       isCompleted || isCurrent ? "text-blue-600" : "text-gray-400"
                     )}>
                       {stage.name}
                     </span>
                   </div>
                 );
               })}
            </div>
          )}

          {/* Customer Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-3 border-b flex justify-between items-center text-blue-800 bg-white">
               <h3 className="font-bold text-sm">العميل</h3>
               <User className="w-5 h-5 text-blue-600" />
             </div>
             <div className="p-4 flex items-center justify-end gap-4 relative">
                <ChevronLeft className="w-5 h-5 text-gray-300 absolute left-4" />
                <div className="text-right">
                  <h4 className="font-bold text-gray-900 text-base mb-1">{order.customerName}</h4>
                  <p className="text-gray-500 text-sm font-medium" dir="ltr">{order.customerPhone || 'بدون رقم'}</p>
                  <p className="text-gray-400 text-xs mt-1">{order.customerAddress || 'بدون عنوان'}</p>
                </div>
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                  {order.customerName?.charAt(0) || 'ع'}
                </div>
             </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-3 border-b flex justify-between items-center text-blue-800 bg-white">
               <h3 className="font-bold text-sm">معلومات الطلب</h3>
               <Info className="w-5 h-5 text-blue-600" />
             </div>
             <div className="p-4 space-y-4">
                <div className="flex flex-col items-end text-right">
                  <span className="text-gray-400 text-xs mb-1">التاريخ</span>
                  <span className="font-bold text-gray-900 text-sm">{timeString}</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-gray-400 text-xs mb-1">الموظف</span>
                  <span className="font-bold text-gray-900 text-sm truncate max-w-full" dir="rtl">{order.createdByName || order.createdBy}</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-gray-400 text-xs mb-1">ملاحظات</span>
                  <span className="font-bold text-gray-900 text-sm bg-gray-50 px-2 py-1 rounded">
                    [نوع الفاتورة: {invoiceTypeLabels[order.invoiceType || 'other']}]
                    {order.discount?.value > 0 ? ` - تمطبيق خصم ${order.discount.value}${order.discount.type === 'percentage' ? '%' : ''}` : ''}
                  </span>
                </div>
             </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-3 border-b flex justify-between items-center bg-white">
               <h3 className="font-bold text-sm">الأصناف ({items.length})</h3>
               <ShoppingCart className="w-5 h-5 text-blue-600" />
             </div>
             <div className="divide-y divide-gray-50">
               {items.map((item: any, idx: number) => (
                 <div key={idx} className="p-4 flex justify-between items-center">
                    <div className="text-left flex flex-col items-start shrink-0 ml-4">
                      <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{Number(item.total).toLocaleString()} <span className="text-xs">{item.currency}</span></span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="font-bold text-gray-900 text-base leading-tight block mb-1">{item.productName}</span>
                      <span className="text-gray-400 text-sm font-medium">{item.quantity} × {item.price} {item.currency}</span>
                      {item.note && <span className="text-xs text-gray-500 bg-gray-50 px-1 py-0.5 mt-1 inline-block rounded">{item.note}</span>}
                      {item.bonusQuantity > 0 && <span className="text-xs text-green-600 font-bold mt-1 inline-block rounded mr-1">
                        <span className="text-red-500 font-bold">{item.bonusQuantity} : {item.quantity}</span> مجاني
                      </span>}
                    </div>
                 </div>
               ))}
             </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-3 border-b flex justify-between items-center bg-white">
               <h3 className="font-bold text-sm">ملخص الطلب</h3>
               <ReceiptText className="w-5 h-5 text-blue-600" />
             </div>
             <div className="p-4 space-y-3">
               {currencyEntries.map(([curr, amount]) => {
                 let subtotal = Number(amount);
                 let total = subtotal;
                 
                 // Add back discount if we want to show subtotal before discount
                 // (Depends on how discount was applied. If totalAmountByCurrency is AFTER discount,
                 // we might not know the exact subtotal easily unless we sum item totals for this currency).
                 const itemsTotalForCurr = items.filter((i:any) => i.currency === curr).reduce((s:number, i:any) => s + Number(i.total), 0);
                 const hasDiscount = itemsTotalForCurr > Number(amount);

                 return (
                   <div key={curr} className="mb-4 last:mb-0">
                     {hasDiscount && (
                       <div className="flex justify-between items-center text-sm mb-2 text-red-500">
                         <span className="font-bold whitespace-nowrap">-{(itemsTotalForCurr - Number(amount)).toLocaleString()} {curr}</span>
                         <span className="font-medium">الخصم</span>
                       </div>
                     )}
                     <div className="flex justify-between items-center text-sm mb-3">
                       <span className="font-bold text-gray-900 whitespace-nowrap">{itemsTotalForCurr.toLocaleString()} <span className="text-xs">{curr}</span></span>
                       <span className="text-gray-500 font-medium">المجموع الفرعي</span>
                     </div>
                     <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                       <span className="font-bold text-blue-600 text-lg whitespace-nowrap">{Number(amount).toLocaleString()} <span className="text-xs">{curr}</span></span>
                       <span className="font-bold text-gray-900 text-base">الإجمالي</span>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          {nextStage ? (
            <Button 
              onClick={handleMoveToNextStage}
              disabled={saving}
              className="w-full h-14 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-base flex justify-center items-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <ArrowLeft className="w-5 h-5" /> إرسال لـ {nextStage.name}
                </>
              )}
            </Button>
          ) : (
            <div className="w-full h-14 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 font-bold text-base flex justify-center items-center">
              الطلب في المرحلة النهائية
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
