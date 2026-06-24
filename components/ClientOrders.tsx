'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Loader2, ShoppingBag, Calendar, ChevronLeft } from 'lucide-react';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { orderService } from '@/lib/services/orderService';

export function ClientOrders() {
  const { profile, user, clientSelectedCompany } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { selectedOrderId, setSelectedOrderId } = useStore();

  useEffect(() => {
    let timeout: any;
    if (selectedOrderId && orders.length > 0) {
      timeout = setTimeout(() => {
        const orderToOpen = orders.find(o => o.id === selectedOrderId);
        if (orderToOpen) {
          setSelectedOrder(orderToOpen);
        }
        setActiveStatusFilter('all');
        setSelectedOrderId(null);
      }, 100);
    }
    return () => clearTimeout(timeout);
  }, [selectedOrderId, setSelectedOrderId, orders]);

  useEffect(() => {
    if (!user) return;

    const unsub = orderService.subscribeToClientOrders(user.uid, (data) => {
      setOrders(data);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    return () => unsub();
  }, [user?.uid, user]);

  const filteredOrders = orders.filter(order => {
    return activeStatusFilter === 'all' || order.status === activeStatusFilter;
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-600" /></div>;

  const activeTotalsByCurrency: Record<string, number> = {};
  filteredOrders.forEach(order => {
    if (order.totalAmountByCurrency) {
      Object.entries(order.totalAmountByCurrency).forEach(([curr, amount]) => {
        if (!activeTotalsByCurrency[curr]) activeTotalsByCurrency[curr] = 0;
        activeTotalsByCurrency[curr] += (amount as number);
      });
    }
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">طلباتي</h2>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
          {orders.length} طلب
        </span>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        <button 
          onClick={() => setActiveStatusFilter('all')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'all' ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          الكل
        </button>
        <button 
          onClick={() => setActiveStatusFilter('pending')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'pending' ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          جديد
        </button>
        <button 
          onClick={() => setActiveStatusFilter('processing')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'processing' ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          قيد المراجعة
        </button>
        <button 
          onClick={() => setActiveStatusFilter('completed')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'completed' ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          مؤكد
        </button>
        <button 
          onClick={() => setActiveStatusFilter('delivered')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'delivered' ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          مُسلّم
        </button>
      </div>

      {/* Summary Chips */}
      {Object.keys(activeTotalsByCurrency).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
           <div className="w-full text-xs font-bold text-gray-500 mb-1">إجمالي تعاملات الطلبات المعروضة:</div>
           {Object.entries(activeTotalsByCurrency).map(([curr, total]) => (
              <span key={curr} className="bg-green-50 border border-green-200 text-green-800 px-3 py-1.5 rounded-lg text-sm font-bold">
                 {total.toLocaleString()} <span className="text-xs">{curr}</span>
              </span>
           ))}
        </div>
      )}

      {/* Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">طلب #{order.id.substring(0, 6)}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                    {order.items?.length || 0} صنف
                  </p>
                  {order.source === 'customer' ? (
                    <span className="inline-block bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      تم الرفع بواسطتك
                    </span>
                  ) : (
                    <span className="inline-block bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      تم التسجيل بواسطة الشركة
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left flex flex-col items-end gap-1">
                 {order.totalAmountByCurrency ? (
                    Object.entries(order.totalAmountByCurrency).map(([curr, amount]) => (
                      <p key={curr} className="font-bold text-green-700 text-sm">
                        {amount as number} <span className="text-xs">{curr}</span>
                      </p>
                    ))
                 ) : (
                    <p className="font-bold text-green-700 text-sm">0</p>
                 )}
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-1",
                  order.status === 'pending' ? 'bg-blue-50 text-blue-600' :
                  order.status === 'processing' ? 'bg-orange-50 text-orange-600' :
                  order.status === 'completed' ? 'bg-green-50 text-green-600' :
                  order.status === 'delivered' ? 'bg-gray-100 text-gray-600' :
                  order.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                  'bg-teal-50 text-teal-600'
                )}>
                  {order.status === 'pending' ? 'جديد (بانتظار التأكيد)' : 
                   order.status === 'processing' ? 'قيد المراجعة' : 
                   order.status === 'completed' ? 'مؤكد' : 
                   order.status === 'delivered' ? 'مُسلّم' : 
                   order.status === 'cancelled' ? 'ملغى' :
                   order.status}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{order.createdAt ? formatDistanceToNow(order.createdAt.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}</span>
              </div>
              <button 
                className="text-green-600 font-bold flex items-center gap-1"
                onClick={() => setSelectedOrder(order)}
              >
                التفاصيل <ChevronLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا توجد طلبات مطابقة
          </div>
        )}
      </div>

      <OrderDetailsDialog 
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        order={selectedOrder}
        stages={[]} // Client view doesn't fetch custom stages pipeline currently
      />
    </div>
  );
}
