'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2, Plus, Phone, MapPin, Mail, Building } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';

import { CustomerDetailsDialog } from './CustomerDetailsDialog';

export function CustomersManager() {
  const { profile, user } = useStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusFilter, setActiveStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [customerTypeOther, setCustomerTypeOther] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!profile?.companyId) return;

    const q = query(
      collection(db, 'customers'), 
      where('companyId', '==', profile.companyId),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const custs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(custs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'customers'));

    return () => unsubscribe();
  }, [profile?.companyId]);

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.companyId || !user) return;

    try {
      const customerData: any = {
        name,
        email,
        phone,
        address,
        customerType,
        customerTypeOther: customerType === 'other' ? customerTypeOther : '',
        isActive,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), customerData).catch(err => handleFirestoreError(err, OperationType.UPDATE, `customers/${editingCustomer.id}`));
        toast.success('تم تحديث العميل بنجاح');
      } else {
        const customerId = `cust_${crypto.randomUUID()}`;
        customerData.companyId = profile.companyId;
        customerData.createdAt = serverTimestamp();
        customerData.createdBy = user.uid;
        customerData.isDeleted = false;
        
        await setDoc(doc(db, 'customers', customerId), customerData).catch(err => handleFirestoreError(err, OperationType.CREATE, `customers/${customerId}`));
        toast.success('تم إضافة العميل بنجاح');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || (editingCustomer ? 'فشل تحديث العميل' : 'فشل إضافة العميل'));
    }
  };

  const populateForm = (customer: any) => {
    setName(customer.name || '');
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setCustomerType(customer.customerType || '');
    setCustomerTypeOther(customer.customerTypeOther || '');
    setIsActive(customer.isActive !== false);
  };

  const openAddDialog = () => {
    setEditingCustomer(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCustomerType('');
    setCustomerTypeOther('');
    setIsActive(true);
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          customer.phone?.includes(searchQuery);
    const matchesStatus = activeStatusFilter === 'all' || 
                          (activeStatusFilter === 'active' && customer.isActive !== false) ||
                          (activeStatusFilter === 'inactive' && customer.isActive === false);
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">العملاء</h2>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
            {customers.length} عميل
          </span>
          <Button size="icon" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white" onClick={openAddDialog}>
            <Plus className="w-5 h-5" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCustomer} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>اسم العميل / الشركة</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                
                <div className="space-y-2">
                  <Label>نوع الحساب / النشاط</Label>
                  <Select value={customerType} onValueChange={(val) => val && setCustomerType(val)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="اختر نوع النشاط" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pharmacy">صيدلية</SelectItem>
                      <SelectItem value="health_center">مركز صحي</SelectItem>
                      <SelectItem value="clinic">عيادة</SelectItem>
                      <SelectItem value="hospital_pharmacy">صيدلية مستشفى</SelectItem>
                      <SelectItem value="warehouse">مخزن</SelectItem>
                      <SelectItem value="grocery">بقالة</SelectItem>
                      <SelectItem value="other">آخر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {customerType === 'other' && (
                  <div className="space-y-2">
                    <Label>حدد نوع النشاط</Label>
                    <Input value={customerTypeOther} onChange={e => setCustomerTypeOther(e.target.value)} placeholder="أدخل نوع النشاط..." required />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} required dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني (اختياري)</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">حفظ العميل</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input 
          placeholder="بحث بالاسم أو رقم الهاتف..." 
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
          الكل
        </button>
        <button 
          onClick={() => setActiveStatusFilter('active')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'active' ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          نشط
        </button>
        <button 
          onClick={() => setActiveStatusFilter('inactive')}
          className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", activeStatusFilter === 'inactive' ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200")}
        >
          غير نشط
        </button>
      </div>

      {/* Customers List */}
      <div className="space-y-3">
        {filteredCustomers.map(customer => (
          <div key={customer.id} onClick={() => setSelectedCustomer(customer)} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-blue-300 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
                  {customer.name?.charAt(0) || 'ع'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", customer.isActive !== false ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-600")}>
                      {customer.isActive !== false ? 'نشط' : 'غير نشط'}
                    </span>
                    {customer.customerType && (
                      <span className="px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-600 flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {customer.customerType === 'other' ? customer.customerTypeOther : 
                         customer.customerType === 'pharmacy' ? 'صيدلية' :
                         customer.customerType === 'health_center' ? 'مركز صحي' :
                         customer.customerType === 'clinic' ? 'عيادة' :
                         customer.customerType === 'hospital_pharmacy' ? 'صيدلية مستشفى' :
                         customer.customerType === 'warehouse' ? 'مخزن' :
                         customer.customerType === 'grocery' ? 'بقالة' : customer.customerType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4 mt-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{customer.address || 'العنوان غير محدد'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span dir="ltr">{customer.phone || 'رقم الهاتف غير محدد'}</span>
              </div>
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{customer.email}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-gray-50 pt-3">
              <Button variant="outline" onClick={(e) => e.stopPropagation()} className="flex-1 bg-white border-gray-200 text-blue-600 hover:bg-blue-50">
                <Phone className="w-4 h-4 ml-2" /> اتصال
              </Button>
              <Button variant="outline" onClick={(e) => e.stopPropagation()} className="flex-1 bg-white border-gray-200 text-gray-700">
                <MapPin className="w-4 h-4 ml-2" /> الموقع
              </Button>
            </div>
          </div>
        ))}
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            لا يوجد عملاء مطابقين للبحث
          </div>
        )}
      </div>

      <CustomerDetailsDialog 
        customer={selectedCustomer} 
        isOpen={!!selectedCustomer} 
        onClose={() => setSelectedCustomer(null)} 
        onEdit={(customer) => {
            setSelectedCustomer(null);
            setEditingCustomer(customer);
            populateForm(customer);
            setIsDialogOpen(true);
        }}
      />
    </div>
  );
}
