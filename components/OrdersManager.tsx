'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart2, Search, MapPin, Calendar, ListFilter, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { OrderDetailsDialog } from './OrderDetailsDialog';

export function OrdersManager() {
  const { profile, user } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [companyCurrency, setCompanyCurrency] = useState('ر.س');
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orderStages, setOrderStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [activeDateFilter, setActiveDateFilter] = useState<'all' | 'today' | 'pending_debts'>('all');

  const { selectedOrderId, setSelectedOrderId } = useStore();

  useEffect(() => {
    let timeout: any;
    if (selectedOrderId && orders.length > 0) {
      timeout = setTimeout(() => {
        const orderToOpen = orders.find(o => o.id === selectedOrderId);
        if (orderToOpen) {
          setSelectedOrderDetails(orderToOpen);
        } else {
          setSearchQuery(selectedOrderId);
        }
        setActiveStatusFilter('all');
        setSelectedOrderId(null);
      }, 100);
    }
    return () => clearTimeout(timeout);
  }, [selectedOrderId, setSelectedOrderId, orders]);

  useEffect(() => {
    if (!profile?.companyId) return;

    const qStages = query(collection(db, 'orderStages'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qOrders = query(collection(db, 'orders'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qCustomers = query(collection(db, 'customers'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qProducts = query(collection(db, 'products'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));

    const unsubStages = onSnapshot(qStages, (snapshot) => {
      setOrderStages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => a.index - b.index));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orderStages'));

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    const unsubCustomers = onSnapshot(qCustomers, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => {
      unsubStages();
      unsubOrders();
      unsubCustomers();
      unsubProducts();
    };
  }, [profile?.companyId]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`));
      toast.success('تم تحديث الحالة');

      const isFinalStage = orderStages.length > 0 && newStatus === orderStages[orderStages.length - 1].name;
      const tOrder = orders.find(o => o.id === orderId);
      if (!isFinalStage) {
        const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
        const cUid = (tOrder?.clientUid) || (tOrder?.source === 'customer' ? tOrder?.createdBy : null);
        await setDoc(doc(db, 'notifications', notifId), {
          companyId: profile?.companyId,
          ...(cUid && { clientUid: cUid }),
          title: 'تحديث حالة الطلب',
          message: `تم تحديث حالة الطلب للعميل ${tOrder?.customerName || ''} إلى: ${newStatus}`,
          type: 'status_update',
          orderId: orderId,
          readBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user?.uid,
          updatedBy: user?.uid,
          isDeleted: false
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'notifications'));
      }
    } catch (error: any) {
      toast.error(error.message || 'فشل تحديث الحالة');
    }
  };

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
    const matchesSearch = order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) || order.id.includes(searchQuery);
    
    // Status Filter
    let stageFilterMatch = false;
    if (activeStatusFilter === 'all') {
      stageFilterMatch = true;
    } else {
      const activeStage = stagesToDisplay.find(s => s.id === activeStatusFilter);
      if (activeStage) {
         stageFilterMatch = order.status === activeStage.id || order.status === activeStage.name;
      } else {
         stageFilterMatch = order.status === activeStatusFilter;
      }
    }
    
    // Date Filter
    let dateFilterMatch = true;
    if (activeDateFilter === 'today') {
      const orderDate = order.createdAt?.toDate();
      const today = new Date();
      if (orderDate) {
         dateFilterMatch = orderDate.getDate() === today.getDate() && 
                           orderDate.getMonth() === today.getMonth() && 
                           orderDate.getFullYear() === today.getFullYear();
      } else {
         dateFilterMatch = false;
      }
    } else if (activeDateFilter === 'pending_debts') {
      dateFilterMatch = order.invoiceType === 'pending_cash';
    }

    return matchesSearch && stageFilterMatch && dateFilterMatch;
  }).sort((a, b) => {
    const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return dateB - dateA;
  });

  const totalsByCurrency = filteredOrders.reduce((acc, order) => {
    const map = order.totalAmountByCurrency || {};
    Object.entries(map).forEach(([curr, amount]) => {
      acc[curr] = (acc[curr] || 0) + Number(amount);
    });
    return acc;
  }, {} as Record<string, number>);

  const getStatusLabel = (status: string) => {
    const stage = stagesToDisplay.find(s => s.id === status || s.name === status);
    if (stage) return stage.name;
    if (status === 'approved') return stagesToDisplay.length > 1 ? stagesToDisplay[1].name : 'معتمد';
    if (status === 'pending') return stagesToDisplay.length > 0 ? stagesToDisplay[0].name : 'جديد';
    return status;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-blue-50 text-blue-600 border-blue-200';
      case 'processing': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'completed': return 'bg-green-50 text-green-600 border-green-200';
      case 'delivered': return 'bg-gray-100 text-gray-600 border-gray-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-800 border-gray-200'; // Generic color for custom stages
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">الطلبات</h2>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
            {orders.length} طلب
          </span>
          <Button variant="outline" size="icon" className="rounded-full bg-blue-50 border-blue-100 text-blue-600">
            <BarChart2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Top Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <Button 
           variant="default" 
           onClick={() => setActiveDateFilter('all')}
           className={cn("rounded-full whitespace-nowrap shrink-0", activeDateFilter === 'all' ? "bg-blue-600 hover:bg-blue-700" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 shadow-sm")}
        >
          <ListFilter className="w-4 h-4 ml-2" /> جميع الطلبات
        </Button>
        <Button 
           variant="outline" 
           onClick={() => setActiveDateFilter('today')}
           className={cn("rounded-full whitespace-nowrap shrink-0", activeDateFilter === 'today' ? "bg-blue-600 text-white hover:bg-blue-700 border-transparent" : "bg-white text-gray-600 hover:bg-gray-50")}
        >
          <Calendar className={cn("w-4 h-4 ml-2", activeDateFilter === 'today' ? "text-white" : "text-gray-400")} /> طلبات اليوم
        </Button>
        <Button 
           variant="outline" 
           onClick={() => setActiveDateFilter('pending_debts')}
           className={cn("rounded-full whitespace-nowrap shrink-0 transition-colors", activeDateFilter === 'pending_debts' ? "bg-red-600 text-white hover:bg-red-700 border-transparent" : "bg-white text-red-600 hover:bg-red-50 border-red-200")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ديون معلقة
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input 
          placeholder="بحث بالاسم أو رقم الطلب..." 
          className="pl-4 pr-10 h-12 rounded-xl bg-white border-gray-200"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button 
          onClick={() => setActiveStatusFilter('all')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'all' ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          الكل <span className={activeStatusFilter === 'all' ? "bg-white/20 text-white px-1.5 rounded-md ml-1" : "bg-gray-100 text-gray-600 px-1.5 rounded-md ml-1"}>{orders.length}</span>
        </button>
        {stagesToDisplay.map(stage => {
          const count = orders.filter(o => o.status === stage.id || o.status === stage.name).length;
          const isActive = activeStatusFilter === stage.id;
          return (
            <button 
              key={stage.id}
              onClick={() => setActiveStatusFilter(stage.id)}
              className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", isActive ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
            >
              {stage.name} <span className={isActive ? "bg-white/20 text-white px-1.5 rounded-md ml-1" : "bg-gray-100 text-gray-600 px-1.5 rounded-md ml-1"}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Total Amount */}
      <div className="bg-blue-50 text-blue-600 px-4 py-3 rounded-xl flex justify-between items-center font-bold">
        <span>{filteredOrders.length} طلب</span>
        <div className="flex gap-2 font-bold text-sm">
            {Object.keys(totalsByCurrency).length > 0 ? (
              Object.entries(totalsByCurrency).map(([curr, amount]) => (
                <span key={curr}>{Number(amount).toLocaleString()} {curr}</span>
              ))
            ) : (
                <span>0 {companyCurrency}</span>
            )}
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredOrders.map(order => {
            let timeString = '';
            if (order.createdAt) {
               const then = order.createdAt.toDate();
               timeString = format(then, 'hh:mm a', { locale: ar });
               const diffDays = Math.floor((new Date().getTime() - then.getTime()) / (1000 * 3600 * 24));
               if (diffDays === 0) timeString = `اليوم، ${timeString}`;
               else if (diffDays === 1) timeString = `أمس، ${timeString}`;
               else timeString = `${diffDays} أيام مضت`;
            }
            const totalsMap = order.totalAmountByCurrency || {};
            const currencyEntries = Object.entries(totalsMap);
            
            return (
          <Card key={order.id} className="border-none shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedOrderDetails(order)}>
            <CardContent className="p-4 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg shrink-0">
                  {order.customerName?.charAt(0) || 'ع'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{order.customerName}</h3>
                    {order.source === 'customer' ? (
                      <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">العميل</span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">المندوب</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500 font-mono">{order.id.substring(0, 8)}</p>
                    {timeString && <p className="text-xs text-gray-400 font-medium whitespace-nowrap">• {timeString}</p>}
                  </div>
                </div>
              </div>
              <div className="text-left flex flex-col items-end pointer-events-auto">
                  {currencyEntries.length > 0 ? (
                    currencyEntries.map(([curr, amount]) => (
                      <p key={curr} className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                        {Number(amount).toLocaleString()} {curr}
                      </p>
                    ))
                  ) : (
                    <p className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                      0 {companyCurrency}
                    </p>
                  )}
                  <p className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded inline-block mt-1">
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
                  {order.invoiceType === 'pending_cash' && order.customerPhone && (
                     <button
                       onClick={(e) => {
                          e.stopPropagation();
                          let totalTxt = '';
                          if (currencyEntries.length > 0) {
                            totalTxt = currencyEntries.map(([curr, amount]) => `${Number(amount).toLocaleString()} ${curr}`).join(' و ');
                          }
                          const text = encodeURIComponent(`مرحباً ${order.customerName}،\nيرجى العلم بأنه توجد مديونية وفاتورة معلقة برقم #${order.id.substring(0, 8)} بمبلغ إجمالي ${totalTxt}.\nنرجو سدادها في أقرب فرصة. وشكراً.`);
                          window.open(`https://wa.me/${order.customerPhone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
                       }}
                       className="mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1 hover:bg-green-200"
                     >
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12.031 0C5.39 0 0 5.39 0 12.03 0 14.65.85 17.07 2.29 19L.8 24l5.14-1.46c1.88 1.3 4.16 2.06 6.59 2.06 6.64 0 12.03-5.39 12.03-12.04S18.67 0 12.031 0zM17.6 16.5c-.29.81-1.63 1.54-2.28 1.62-.61.08-1.39.2-3.96-.86-3.1-1.28-5.06-4.46-5.21-4.66-.15-.2-1.25-1.67-1.25-3.19s.78-2.27 1.05-2.56c.26-.29.58-.36.78-.36.2 0 .4 0 .58.01.2.01.48-.08.75.56.28.67.95 2.33 1.04 2.52.08.19.14.41.01.67-.13.25-.2.41-.39.63-.19.22-.4.48-.57.67-.18.2-.38.41-.16.8 2.2 4.41 3.51 5.09 3.84 5.31.25.17.41.13.57-.05.15-.19.68-.78.86-1.04.19-.27.37-.22.61-.13.23.09 1.48.7 1.73.83.25.12.41.19.47.29.07.1.07.54-.22 1.35z"/></svg>
                       تنبيه سداد
                     </button>
                  )}
              </div>
            </CardContent>
          </Card>
        )})}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد طلبات مطابقة للبحث
          </div>
        )}
      </div>
      
      <OrderDetailsDialog
        open={!!selectedOrderDetails}
        onOpenChange={(open) => !open && setSelectedOrderDetails(null)}
        order={selectedOrderDetails}
        stages={orderStages}
      />
    </div>
  );
}
