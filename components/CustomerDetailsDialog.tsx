'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserCircle, Search, Edit, Trash2, MapPin, Phone, Mail, Building, ShoppingBag, Banknote, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';

export function CustomerDetailsDialog({ customer, isOpen, onClose, onEdit }: { customer: any, isOpen: boolean, onClose: () => void, onEdit?: (customer: any) => void }) {
  const { profile, user } = useStore();
  const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer || !isOpen || !profile?.companyId) return;
    
    // Fetch orders for this customer to calculate real stats and show history
    const fetchStatsAndOrders = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'orders'),
          where('companyId', '==', profile.companyId),
          where('customerId', '==', customer.id),
          where('isDeleted', '==', false)
        );
        const snapshot = await getDocs(q);
        
        let totalOrders = 0;
        let totalSpent = 0;
        const fetchedOrders: any[] = [];
        
        snapshot.docs.forEach(doc => {
          const order = { id: doc.id, ...doc.data() } as any;
          fetchedOrders.push(order);
          totalOrders += 1;
          
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
        setStats({ totalOrders, totalSpent });
      } catch (error) {
        console.error("Error fetching customer orders:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatsAndOrders();
  }, [customer, isOpen, profile?.companyId]);

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا العميل بشكل نهائي؟')) {
       try {
         await updateDoc(doc(db, 'customers', customer.id), {
           isDeleted: true,
           updatedAt: serverTimestamp(),
           updatedBy: user?.uid
         });
         toast.success('تم حذف العميل بنجاح');
         onClose();
       } catch (error) {
         toast.error('حدث خطأ أثناء الحذف');
       }
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <span>ملف العميل</span>
            <div className="flex gap-2">
               <Button variant="outline" size="sm" className="text-blue-600 bg-blue-50 border-blue-200" onClick={() => onEdit?.(customer)}>
                 <Edit className="w-4 h-4 mr-2" /> تعديل
               </Button>
               <Button variant="outline" size="sm" className="text-red-600 bg-red-50 border-red-200" onClick={handleDelete}>
                 <Trash2 className="w-4 h-4 mr-2" /> حذف
               </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Customer Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 bg-white p-6 rounded-xl border shadow-sm">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
               <UserCircle className="w-16 h-16 text-blue-500" />
            </div>
            <div className="flex-1 space-y-3">
               <div className="flex items-center justify-between">
                   <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
                   <span className={`px-3 py-1 rounded-full text-sm font-bold ${customer.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                       {customer.isActive !== false ? 'نشط' : 'غير نشط'}
                   </span>
               </div>
               
               <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-2">
                   <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-500" /> <span dir="ltr">{customer.phone || 'غير محدد'}</span>
                   </div>
                   {customer.email && (
                     <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" /> <span>{customer.email}</span>
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
            </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 rounded-xl border border-blue-100 flex items-center justify-between">
             <div>
                 <p className="text-sm font-bold text-blue-600 mb-1">إجمالي الطلبات المستلمة</p>
                 <p className="text-3xl font-bold text-gray-900">{stats.totalOrders} <span className="text-sm font-normal text-gray-500">طلب</span></p>
             </div>
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-6 h-6 text-blue-500" />
             </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100/50 p-6 rounded-xl border border-green-100 flex items-center justify-between">
             <div>
                 <p className="text-sm font-bold text-green-600 mb-1">إجمالي المشتريات (تقديري)</p>
                 <p className="text-3xl font-bold text-gray-900">{stats.totalSpent.toLocaleString()}</p>
             </div>
             <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                <Banknote className="w-6 h-6 text-green-500" />
             </div>
          </div>
        </div>

        {/* Order History */}
        <div className="space-y-4">
           <h3 className="font-bold text-gray-900 text-lg border-b pb-2">سجل الطلبات</h3>
           {loading ? (
             <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" /></div>
           ) : orders.length > 0 ? (
             <div className="space-y-3">
               {orders.map((order, idx) => {
                  let primaryCurrency = Object.keys(order.totalAmountByCurrency || {})[0] || 'SAR';
                  let primaryTotal = order.totalAmountByCurrency?.[primaryCurrency] || 0;
                  
                  return (
                    <div key={order.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors">
                       <div>
                          <p className="font-bold text-gray-900 mb-1">طلب رقم #{order.id.slice(-6).toUpperCase()}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                             <span>{new Date(order.createdAt?.toMillis?.() || Date.now()).toLocaleDateString('ar-SA')}</span>
                             <span>•</span>
                             <span>{order.items?.length || 0} أصناف</span>
                          </div>
                       </div>
                       <div className="text-left">
                          <p className="font-bold text-blue-600 text-lg">{primaryTotal.toLocaleString()} <span className="text-xs text-gray-500">{primaryCurrency}</span></p>
                       </div>
                    </div>
                  )
               })}
             </div>
           ) : (
             <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
               لا توجد طلبات سابقة لهذا العميل.
             </div>
           )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
