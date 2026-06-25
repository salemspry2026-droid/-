'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, User, Info, ShoppingCart, ReceiptText, ChevronLeft, Spline, Clock4 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { customerService } from '@/lib/services/customerService';
import { orderService } from '@/lib/services/orderService';
import { notificationService } from '@/lib/services/notificationService';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
  stages,
  onEditOrder
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  stages: any[];
  onEditOrder?: (order: any) => void;
}) {
  const [saving, setSaving] = useState(false);
  const { user, profile } = useStore();
  const [matchStatus, setMatchStatus] = useState<'checking' | 'matched' | 'no_match' | 'checked'>('checked');
  const [matchingCustomers, setMatchingCustomers] = useState<any[]>([]);
  const [merging, setMerging] = useState(false);

  // New states for excluding items
  const [selectedItemsToExclude, setSelectedItemsToExclude] = useState<number[]>([]);
  const [showExcludeDialog, setShowExcludeDialog] = useState(false);
  const [reminderHours, setReminderHours] = useState('24');
  const [excluding, setExcluding] = useState(false);


  useEffect(() => {
    if (!order || order.source !== 'customer' || order.linkedCrmCustomerId) {
      setMatchStatus('checked');
      return;
    }

    const checkMatch = async () => {
      setMatchStatus('checking');
      try {
        const customers = await customerService.getCustomersByCompanyId(order.companyId);

        const matches = customers.filter(c => 
          (order.customerPhone && c.phone === order.customerPhone) ||
          (order.customerName && c.name && (c.name.includes(order.customerName) || order.customerName.includes(c.name)))
        );

        if (matches.length > 0) {
          setMatchingCustomers(matches);
          setMatchStatus('matched');
        } else {
          setMatchStatus('no_match');
        }
      } catch (err) {
        setMatchStatus('no_match');
      }
    };
    checkMatch();
  }, [order]);

  const handleMergeCustomer = async (crmCustomerId: string, crmCustomerName: string) => {
    setMerging(true);
    try {
      if (order.source === 'customer') {
        await customerService.updateCustomer(crmCustomerId, {
          appUserId: order.createdBy,
        }, user?.uid || 'system');
      }
      await orderService.updateOrder(order.id, {
        customerId: crmCustomerId,
        linkedCrmCustomerId: crmCustomerId,
        clientUid: order.source === 'customer' ? order.createdBy : null,
        customerName: crmCustomerName,
      }, user?.uid || 'system');
      toast.success('تمت عملية الدمج بنجاح وتم تحديث الطلب');
      onOpenChange(false);
    } catch (e) {
      toast.error('حدث خطأ أثناء الدمج');
    } finally {
      setMerging(false);
    }
  };

  const handleApproveNewCustomer = async () => {
    setMerging(true);
    try {
      const newCustId = `cust_${crypto.randomUUID()}`;
      await customerService.createCustomer(newCustId, order.companyId, {
        name: order.customerName,
        phone: order.customerPhone || '',
        address: order.customerAddress || '',
        contactNumbers: order.customerPhone ? [order.customerPhone] : [],
        ...(order.source === 'customer' && { appUserId: order.createdBy }),
      }, user?.uid || 'system');

      await orderService.updateOrder(order.id, {
        customerId: newCustId,
        linkedCrmCustomerId: newCustId,
        clientUid: order.source === 'customer' ? order.createdBy : null,
      }, user?.uid || 'system');
      toast.success('تمت إضافة العميل لقاعدة البيانات والموافقة بنجاح');
      onOpenChange(false);
    } catch (e) {
      toast.error('حدث خطأ أثناء إضافة العميل');
    } finally {
      setMerging(false);
    }
  };

  if (!order) return null;

  // Determine current stage index
  const currentStageIndex = stages.findIndex(s => s.name === order.status || s.id === order.status);
  
  const isPending = order.status === 'pending';
  const activeIndex = currentStageIndex !== -1 ? currentStageIndex : (isPending ? -1 : 0);
  
  const nextStage = activeIndex < stages.length - 1 ? stages[activeIndex + 1] : null;

  const handleMoveToNextStage = async () => {
    if (!nextStage) return;
    setSaving(true);
    try {
      let finalCustomerId = order.customerId;
      let finalLinkedCrmId = order.linkedCrmCustomerId;

      if (order.source === 'customer' && !order.linkedCrmCustomerId && activeIndex === -1 && matchStatus === 'no_match') {
        // Automatically add new customer
        const newCustId = `cust_${crypto.randomUUID()}`;
        await customerService.createCustomer(newCustId, order.companyId, {
          name: order.customerName,
          phone: order.customerPhone || '',
          address: order.customerAddress || '',
          contactNumbers: order.customerPhone ? [order.customerPhone] : [],
          ...(order.source === 'customer' && { appUserId: order.createdBy }),
        }, user?.uid || 'system');
        finalCustomerId = newCustId;
        finalLinkedCrmId = newCustId;
      }

      await orderService.updateOrder(order.id, {
        status: nextStage.name,
        ...(finalCustomerId !== order.customerId && {
          customerId: finalCustomerId,
          linkedCrmCustomerId: finalLinkedCrmId
        }),
      }, user?.uid || 'system');

      toast.success('تم انتقال الطلب للمرحلة التالية بنجاح');
      onOpenChange(false);

      const isFinalStage = stages.length > 0 && nextStage.name === stages[stages.length - 1].name;
      if (!isFinalStage) {
        const cUid = order.clientUid || (order.source === 'customer' ? order.createdBy : null);
        await notificationService.createNotification({
          companyId: order.companyId,
          ...(cUid && { clientUid: cUid }),
          title: 'تحديث حالة الطلب',
          message: `تم تحديث حالة الطلب للعميل ${order?.customerName || ''} إلى: ${nextStage.name}`,
          type: 'status_update',
          orderId: order.id,
        }, user?.uid || 'system').catch((err: any) => console.error(err));
      }
    } catch (error: any) {
      console.error(error);
      toast.error('حدث خطأ أثناء نقل الطلب');
    } finally {
      setSaving(false);
    }
  };

  const handleExcludeItems = async () => {
    if (selectedItemsToExclude.length === 0) return;
    setExcluding(true);
    try {
      const remainingItems: any[] = [];
      const excludedItems: any[] = [];
      
      order.items.forEach((item: any, index: number) => {
        if (selectedItemsToExclude.includes(index)) {
          excludedItems.push(item);
        } else {
          remainingItems.push(item);
        }
      });

      if (remainingItems.length === 0) {
        toast.error('لا يمكن استثناء جميع عناصر الطلب، قم بإلغاء الطلب بدلاً من ذلك.');
        setExcluding(false);
        return;
      }

      // calculate new totals
      const remainingTotals: Record<string, number> = {};
      remainingItems.forEach((i: any) => {
        const itemTotal = Number(i.total) || (Number(i.price || 0) * Number(i.quantity || 1));
        remainingTotals[i.currency || 'SAR'] = (remainingTotals[i.currency || 'SAR'] || 0) + itemTotal;
      });

      const excludedTotals: Record<string, number> = {};
      excludedItems.forEach((i: any) => {
        const itemTotal = Number(i.total) || (Number(i.price || 0) * Number(i.quantity || 1));
        excludedTotals[i.currency || 'SAR'] = (excludedTotals[i.currency || 'SAR'] || 0) + itemTotal;
      });

      // Update current order
      await orderService.updateOrder(order.id, {
        items: remainingItems,
        totalAmountByCurrency: remainingTotals,
      }, user?.uid || 'system');

      // Create new order
      const newOrderId = `ord_${crypto.randomUUID()}`;
      // first stage name
      const initialStageName = stages.length > 0 ? stages[0].name : 'pending';
      const excludeTotalQty = excludedItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);

      await orderService.createOrder({
        ...order,
        id: newOrderId,
        items: excludedItems,
        totalAmountByCurrency: excludedTotals,
        totalQuantity: excludeTotalQty,
        status: initialStageName, // New order resets to first stage
      }, user?.uid || 'system');

      // Create reminder notification
      const hours = parseInt(reminderHours) || 24;
      const remindAtTime = Date.now() + hours * 3600 * 1000;
      const { Timestamp } = await import('firebase/firestore');
      
      await notificationService.createNotification({
        companyId: order.companyId,
        title: 'تذكير باستكمال صنف مستثنى',
        message: `طلب مجدول: العميل ${order.customerName} يحتاج لتوفير أصناف نفذت.`,
        type: 'reminder',
        orderId: newOrderId,
        remindAt: Timestamp.fromMillis(remindAtTime),
      }, user?.uid || 'system').catch(err => console.error(err));

      toast.success('تم استثناء الأصناف وإنشاء طلب جديد لها بنجاح.');
      setShowExcludeDialog(false);
      setSelectedItemsToExclude([]);
      onOpenChange(false);

    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء استثناء الأصناف.');
    } finally {
      setExcluding(false);
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
    <>
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setSelectedItemsToExclude([]);
        setShowExcludeDialog(false);
      }
      onOpenChange(val);
    }}>
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

        <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", profile?.role !== 'client' ? "pb-24" : "pb-4")}>
          
          {/* Progress Bar */}
          {stages.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative">
               <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-gray-100 -translate-y-1/2 z-0"></div>
               {stages.map((stage, idx) => {
                 const isCompleted = idx < activeIndex;
                 const isCurrent = idx === activeIndex;
                 // const isUpcoming = idx > activeIndex;

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
          {profile?.role !== 'client' && (
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

               {order.source === 'customer' && !order.linkedCrmCustomerId && (
                 <div className="p-4 bg-orange-50 border-t border-orange-100 text-right">
                   {matchStatus === 'checking' && <p className="text-sm text-orange-600">جاري التحقق من سجل العميل...</p>}
                   {matchStatus === 'no_match' && (
                     <div className="space-y-2 text-right">
                       <p className="text-sm font-bold text-orange-700">العميل غير مسجل بقاعدة بيانات الشركة</p>
                       <p className="text-xs text-orange-600">انقر هنا لإضافة العميل وإنشاء سجل له.</p>
                       <Button onClick={handleApproveNewCustomer} disabled={merging} className="bg-orange-600 hover:bg-orange-700 text-white rounded-lg h-9 text-xs w-full mt-2">
                         {merging ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null} موافقة إضافة العميل كجديد
                       </Button>
                     </div>
                   )}
                   {matchStatus === 'matched' && (
                     <div className="space-y-3 text-right">
                       <p className="text-sm font-bold text-orange-700">تم العثور على حساب مطابق للعميل</p>
                       <div className="space-y-2">
                         {matchingCustomers.map((c, i) => (
                           <div key={i} className="flex justify-between items-center bg-white p-2 border border-orange-200 rounded-lg">
                             <Button onClick={() => handleMergeCustomer(c.id, c.name)} disabled={merging} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100 h-8 text-xs shrink-0">
                               {merging ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : null} دمج الحساب
                             </Button>
                             <div className="text-right">
                               <p className="font-bold text-gray-900 text-xs">{c.name}</p>
                               <p className="text-[10px] text-gray-500" dir="ltr">{c.phone}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                       <Button onClick={handleApproveNewCustomer} disabled={merging} variant="ghost" className="text-orange-700 hover:bg-orange-100 w-full text-xs h-8">
                         إضافة كعميل جديد بدلاً من الدمج
                       </Button>
                     </div>
                   )}
                 </div>
               )}
            </div>
          )}

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
                {order.companyModifiedAt && (
                  <div className="flex flex-col items-end text-right">
                    <span className="text-gray-400 text-xs mb-1">تعديل الشركة</span>
                    <span className="font-bold text-yellow-700 text-[11px] bg-yellow-50 px-2 py-1 rounded">
                      تم إجراء تعديلات على الطلب من قبل الشركة
                    </span>
                  </div>
                )}
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
             <div className="p-3 border-b flex flex-col sm:flex-row justify-between items-center bg-white gap-2">
               <div className="flex justify-between items-center w-full">
                 <h3 className="font-bold text-sm">الأصناف ({items.length})</h3>
                 <ShoppingCart className="w-5 h-5 text-blue-600" />
               </div>
               {profile?.role !== 'client' && !(!nextStage) && items.length > 1 && (
                 <Button 
                   variant="outline" 
                   size="sm" 
                   className="w-full sm:w-auto h-8 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 bg-orange-50/50"
                   disabled={selectedItemsToExclude.length === 0}
                   onClick={() => setShowExcludeDialog(true)}
                 >
                   <Spline className="w-3.5 h-3.5 ml-1.5" />
                   استثناء المحدد ({selectedItemsToExclude.length})
                 </Button>
               )}
             </div>
             <div className="divide-y divide-gray-50">
               {items.map((item: any, idx: number) => {
                 const isExcluded = selectedItemsToExclude.includes(idx);
                 return (
                 <div key={idx} className={cn("p-4 flex justify-between items-center transition-colors", isExcluded ? "bg-orange-50/50" : "")}>
                    <div className="text-left flex flex-col items-start shrink-0 ml-4">
                      {profile?.role !== 'client' && !(!nextStage) && items.length > 1 && (
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox 
                            id={`exclude-${idx}`}
                            checked={isExcluded}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedItemsToExclude(prev => [...prev, idx]);
                              } else {
                                setSelectedItemsToExclude(prev => prev.filter(i => i !== idx));
                              }
                            }}
                          />
                          <Label htmlFor={`exclude-${idx}`} className="text-xs text-orange-600 cursor-pointer">استثناء</Label>
                        </div>
                      )}
                      <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{(Number(item.total) || (Number(item.price || 0) * Number(item.quantity || 1))).toLocaleString()} <span className="text-xs">{item.currency || 'SAR'}</span></span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={cn("font-bold text-base leading-tight block mb-1", isExcluded ? "text-orange-700" : "text-gray-900")}>{item.productName}</span>
                      <span className="text-gray-400 text-sm font-medium">{item.quantity} × {item.price} {item.currency || 'SAR'}</span>
                      {item.note && <span className="text-xs text-gray-500 bg-gray-50 px-1 py-0.5 mt-1 inline-block rounded">{item.note}</span>}
                      {item.bonusQuantity > 0 && <span className="text-xs text-green-600 font-bold mt-1 inline-block rounded mr-1">
                        <span className="text-red-500 font-bold">{item.bonusQuantity} : {item.quantity}</span> مجاني
                      </span>}
                    </div>
                 </div>
               )})}
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
                 const itemsTotalForCurr = items.filter((i:any) => i.currency === curr).reduce((s:number, i:any) => s + (Number(i.total) || (Number(i.price || 0) * Number(i.quantity || 1))), 0);
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
        {profile?.role !== 'client' && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] flex gap-3">
            {onEditOrder && (activeIndex <= 1) && (
               <Button 
                 onClick={() => onEditOrder(order)}
                 variant="outline"
                 className="h-14 px-6 rounded-xl font-bold text-gray-700 border-gray-200"
               >
                 تعديل الطلب
               </Button>
            )}
            <div className="flex-1">
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
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={showExcludeDialog} onOpenChange={setShowExcludeDialog}>
      <DialogContent className="sm:max-w-[400px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Spline className="w-5 h-5" />
            تأكيد استثناء الأصناف
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600 text-right">
            سيتم إزالة الأصناف المحددة من هذا الطلب وإدراجها كطلب جديد مستقل. يمكنك تعيين تذكير لمتابعة توفير هذه الأصناف وإتمامها.
          </p>
          <div className="space-y-2">
            <Label className="text-gray-700 font-bold">ذكرني بعد</Label>
            <div className="flex gap-2 text-right justify-end" dir="rtl">
              <Button type="button" variant={reminderHours === '24' ? 'default' : 'outline'} className={cn("flex-1 text-xs", reminderHours === '24' && "bg-orange-600 hover:bg-orange-700")} onClick={() => setReminderHours('24')}>24 ساعة</Button>
              <Button type="button" variant={reminderHours === '48' ? 'default' : 'outline'} className={cn("flex-1 text-xs", reminderHours === '48' && "bg-orange-600 hover:bg-orange-700")} onClick={() => setReminderHours('48')}>48 ساعة</Button>
              <Button type="button" variant={reminderHours === '168' ? 'default' : 'outline'} className={cn("flex-1 text-xs", reminderHours === '168' && "bg-orange-600 hover:bg-orange-700")} onClick={() => setReminderHours('168')}>اسبوع</Button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 justify-end w-full mt-2">
          <Button type="button" variant="outline" onClick={() => setShowExcludeDialog(false)} disabled={excluding}>إلغاء</Button>
          <Button type="button" onClick={handleExcludeItems} disabled={excluding} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[120px]">
            {excluding ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null} تأكيد واستثناء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
