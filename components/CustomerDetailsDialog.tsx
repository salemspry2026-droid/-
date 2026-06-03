'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCircle, Search, Edit, Trash2, MapPin, Phone, Mail, Building, ShoppingBag, Banknote, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import { OrderDetailsDialog } from './OrderDetailsDialog';

export function CustomerDetailsDialog({ customer, isOpen, onClose, onEdit }: { customer: any, isOpen: boolean, onClose: () => void, onEdit?: (customer: any) => void }) {
  const { profile, user } = useStore();
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0, companyOrders: 0, customerOrders: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStages, setOrderStages] = useState<any[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    // Reset delete confirm state when dialog opens or customer changes
    setDeleteConfirm(false);
    if (!customer || !isOpen || !profile?.companyId) return;
    
    // Fetch orders for this customer to calculate real stats and show history
    const fetchStatsAndOrders = async () => {
      setLoading(true);
      try {
        // Fetch order stages setup
        const qStages = query(collection(db, 'orderStages'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
        const stagesSnapshot = await getDocs(qStages);
        const fetchedStages = stagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => a.index - b.index);
        setOrderStages(fetchedStages);

        const q = query(
          collection(db, 'orders'),
          where('companyId', '==', profile.companyId),
          where('customerId', '==', customer.id),
          where('isDeleted', '==', false)
        );
        const snapshot = await getDocs(q);
        
        let totalOrders = 0;
        let totalSpent = 0;
        let companyOrders = 0;
        let customerOrders = 0;
        const fetchedOrders: any[] = [];
        
        snapshot.docs.forEach(doc => {
          const order = { id: doc.id, ...doc.data() } as any;
          fetchedOrders.push(order);
          totalOrders += 1;
          
          if (order.source === 'customer') {
            customerOrders += 1;
          } else {
            companyOrders += 1;
          }
          
          if (order.totalAmountByCurrency) {
              // Just sum up everything for a rough estimate, or sum based on a specific currency.
              // We'll just sum the values for simplicity if there are multiple.
              Object.values(order.totalAmountByCurrency).forEach((amount: any) => {
                  totalSpent += Number(amount) || 0;
              });
          }
        });
        
        // Sort orders by date descending
        fetchedOrders.sort((a,b) => {
            const da = a.createdAt?.toMillis?.() || 0;
            const dbTime = b.createdAt?.toMillis?.() || 0;
            return dbTime - da;
        });

        setOrders(fetchedOrders);
        setStats({ totalOrders, totalSpent, companyOrders, customerOrders });
      } catch (error) {
        console.error("Error fetching customer orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatsAndOrders();
  }, [customer, isOpen, profile?.companyId]);

  const handleDelete = async () => {
    try {
      await updateDoc(doc(db, 'customers', customer.id), {
        isDeleted: true,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      });
      toast.success('تم حذف العميل بنجاح');
      setDeleteConfirm(false);
      onClose();
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  if (!customer) return null;

  const fallbackStages = [
    { id: 'pending', name: 'جديد' },
    { id: 'processing', name: 'قيد المراجعة' },
    { id: 'completed', name: 'مؤكد' },
    { id: 'delivered', name: 'مُسلّم' },
    { id: 'cancelled', name: 'ملغى' }
  ];

  const stagesToDisplay = orderStages.length > 0
    ? orderStages.map(s => ({ id: s.name, name: s.name }))
    : fallbackStages;

  const filteredOrders = orders.filter(order => {
    if (activeStatusFilter === 'all') return true;
    const activeStage = stagesToDisplay.find(s => s.id === activeStatusFilter);
    if (activeStage) {
       return order.status === activeStage.id || order.status === activeStage.name;
    }
    return order.status === activeStatusFilter;
  });

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[700px] md:max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6" dir="rtl">
        <DialogHeader className="mb-4 pt-4 sm:pt-0 pl-8">
          <DialogTitle className="text-xl md:text-2xl font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>ملف العميل</span>
            <div className="flex gap-2">
               {!deleteConfirm ? (
                 <>
                   <Button variant="outline" size="sm" className="text-blue-600 bg-blue-50 border-blue-200" onClick={() => onEdit?.(customer)}>
                     <Edit className="w-4 h-4 mr-2" /> تعديل
                   </Button>
                   <Button variant="outline" size="sm" className="text-red-600 bg-red-50 border-red-200" onClick={() => setDeleteConfirm(true)}>
                     <Trash2 className="w-4 h-4 mr-2" /> حذف
                   </Button>
                 </>
               ) : (
                 <>
                   <Button variant="outline" size="sm" className="text-gray-600 border-gray-200" onClick={() => setDeleteConfirm(false)}>
                     إلغاء
                   </Button>
                   <Button variant="default" size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
                     <Trash2 className="w-4 h-4 mr-2" /> تأكيد
                   </Button>
                 </>
               )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Customer Profile Header */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 bg-white p-4 sm:p-6 rounded-xl border shadow-sm">
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mx-auto sm:mx-0">
               <UserCircle className="w-10 h-10 sm:w-16 sm:h-16 text-blue-500" />
            </div>
            <div className="flex-1 space-y-3 text-center sm:text-right">
               <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                   <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{customer.name}</h2>
                   <span className={`px-3 py-1 rounded-full text-xs font-bold ${customer.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                       {customer.isActive !== false ? 'نشط' : 'غير نشط'}
                   </span>
               </div>
               
               <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-start gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mt-2">
                   <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-500" /> <span dir="ltr">{customer.phone || 'غير محدد'}</span>
                   </div>
                   {customer.email && (
                     <div className="flex items-center gap-2 max-w-full">
                        <Mail className="w-4 h-4 text-blue-500 shrink-0" /> <span className="break-words truncate">{customer.email}</span>
                     </div>
                   )}
                   <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" /> <span>{customer.address || 'العنوان غير محدد'}</span>
                   </div>
                   {customer.customerType && (
                     <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-500" /> 
                        <span>
                            {customer.customerType === 'other' ? customer.customerTypeOther : 
                             customer.customerType === 'pharmacy' ? 'صيدلية' :
                             customer.customerType === 'health_center' ? 'مركز صحي' :
                             customer.customerType === 'clinic' ? 'عيادة' :
                             customer.customerType === 'hospital_pharmacy' ? 'صيدلية مستشفى' :
                             customer.customerType === 'warehouse' ? 'مخزن' :
                             customer.customerType === 'grocery' ? 'بقالة' : customer.customerType}
                        </span>
                     </div>
                   )}
               </div>
               
               {Array.isArray(customer.contactNumbers) && customer.contactNumbers.length > 0 && (
                 <div className="mt-4 flex flex-col sm:flex-row flex-wrap items-center sm:items-start gap-2">
                   {customer.contactNumbers.map((contact: any, i: number) => (
                     <div key={i} className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm w-full sm:w-auto overflow-hidden">
                       <span className="font-semibold text-gray-700 truncate">{contact.name || 'أخرى'}</span>
                       <span className="text-gray-400">|</span>
                       <span dir="ltr" className="text-gray-600 font-mono text-[10px] sm:text-xs truncate">{contact.countryCode} {contact.number}</span>
                     </div>
                   ))}
                 </div>
               )}
            </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 my-4 sm:my-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 sm:p-6 rounded-xl border border-blue-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] sm:text-sm font-bold text-blue-600 mb-1">إجمالي الطلبات</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-3 sm:p-6 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] sm:text-sm font-bold text-green-600 mb-1">طلبات المندوب</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.companyOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 sm:p-6 rounded-xl border border-purple-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] sm:text-sm font-bold text-purple-600 mb-1">طلبات العميل</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.customerOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 p-3 sm:p-6 rounded-xl border border-teal-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] sm:text-sm font-bold text-teal-600 mb-1">المشتريات</p>
              <p className="text-xl sm:text-3xl font-bold text-gray-900">{stats.totalSpent.toLocaleString()}</p>
          </div>
        </div>

        {/* Order History */}
        <div className="space-y-4">
           <div className="flex flex-col justify-between gap-4 border-b pb-4">
             <h3 className="font-bold text-gray-900 text-base sm:text-lg">سجل الطلبات</h3>
             <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => setActiveStatusFilter('all')}
                  className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${activeStatusFilter === 'all' ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 border border-gray-200"}`}
                >
                  الكل <span className={activeStatusFilter === 'all' ? "bg-white/20 text-white px-1.5 rounded-md ml-1" : "bg-gray-200 text-gray-700 px-1.5 rounded-md ml-1"}>{orders.length}</span>
                </button>
                {stagesToDisplay.map(stage => {
                  const count = orders.filter(o => o.status === stage.id || o.status === stage.name).length;
                  const isActive = activeStatusFilter === stage.id;
                  return (
                     <button
                       key={stage.id}
                       onClick={() => setActiveStatusFilter(stage.id)}
                       className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 border border-gray-200"}`}
                     >
                        {stage.name} <span className={isActive ? "bg-white/20 text-white px-1.5 rounded-md ml-1" : "bg-gray-200 text-gray-700 px-1.5 rounded-md ml-1"}>{count}</span>
                     </button>
                  )
                })}
             </div>
           </div>

           {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
           ) : filteredOrders.length > 0 ? (
             <div className="space-y-3">
               {filteredOrders.map((order, idx) => {
                  let primaryCurrency = Object.keys(order.totalAmountByCurrency || {})[0] || 'SAR';
                  let primaryTotal = order.totalAmountByCurrency?.[primaryCurrency] || 0;
                  
                  return (
                    <div key={order.id} onClick={() => setSelectedOrder(order)} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-100 hover:border-blue-200 transition-colors cursor-pointer">
                       <div className="w-full sm:w-auto">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900">طلب رقم #{order.id.slice(-6).toUpperCase()}</p>
                            {order.source === 'customer' ? (
                              <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">طلب العميل</span>
                            ) : (
                              <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">طلب المندوب</span>
                            )}
                            <p className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded inline-block">
                              {(() => {
                                 const st = order.status;
                                 const stage = orderStages.find(s => s.id === st || s.name === st);
                                 if (stage) return stage.name;
                                 if (st === 'pending') return orderStages.length > 0 ? orderStages[0].name : 'جديد';
                                 if (st === 'processing') return 'قيد المراجعة';
                                 if (st === 'completed') return 'مؤكد';
                                 if (st === 'approved') return orderStages.length > 1 ? orderStages[1].name : 'معتمد';
                                 return st;
                              })()}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                             <span>{new Date(order.createdAt?.toMillis?.() || Date.now()).toLocaleDateString('ar-SA')}</span>
                             <span>•</span>
                             <span>{order.items?.length || 0} أصناف</span>
                          </div>
                       </div>
                       <div className="text-left flex items-center gap-4">
                          <p className="font-bold text-blue-600 text-lg">{primaryTotal.toLocaleString()} <span className="text-xs text-gray-500">{primaryCurrency}</span></p>
                       </div>
                    </div>
                  )
               })}
             </div>
           ) : (
             <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
               {activeStatusFilter === 'all' ? 'لا توجد طلبات سابقة لهذا العميل.' : 'لا توجد طلبات مطابقة لهذه الحالة.'}
             </div>
           )}
        </div>

      </DialogContent>
    </Dialog>

    {selectedOrder && (
       <OrderDetailsDialog 
         open={!!selectedOrder}
         onOpenChange={(val) => !val && setSelectedOrder(null)}
         order={selectedOrder}
         stages={orderStages}
       />
    )}
    </>
  );
}
