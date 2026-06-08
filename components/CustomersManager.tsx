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
import { Search, Loader2, Plus, Phone, MapPin, Mail, Building, Trash2, Contact } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn, hasPermission } from '@/lib/utils';

import { AddressSelector } from './AddressSelector';
import { CustomerDetailsDialog } from './CustomerDetailsDialog';

const COUNTRY_CODES = [
  { code: '+966', name: 'السعودية (+966)', flag: '🇸🇦' },
  { code: '+971', name: 'الإمارات (+971)', flag: '🇦🇪' },
  { code: '+965', name: 'الكويت (+965)', flag: '🇰🇼' },
  { code: '+974', name: 'قطر (+974)', flag: '🇶🇦' },
  { code: '+973', name: 'البحرين (+973)', flag: '🇧🇭' },
  { code: '+968', name: 'عمان (+968)', flag: '🇴🇲' },
  { code: '+20', name: 'مصر (+20)', flag: '🇪🇬' },
  { code: '+962', name: 'الأردن (+962)', flag: '🇯🇴' }
];

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
  const [contactNumbers, setContactNumbers] = useState<any[]>([]);
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [customerTypeOther, setCustomerTypeOther] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [locations, setLocations] = useState<any[]>([]);
  const [isContactsSupported, setIsContactsSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsContactsSupported(true);
    }
  }, []);

  const getFullPath = (loc: any, allLocs: any[]) => {
    let path = [loc.name];
    let curr = loc;
    while(curr.parentId && curr.parentId !== 'none') {
      curr = allLocs.find(l => l.id === curr.parentId);
      if(curr) {
         path.unshift(curr.name);
      } else {
         break;
      }
    }
    return path.join(' - ');
  };

  const sortedLocations = locations.map(loc => ({
    ...loc,
    fullPath: getFullPath(loc, locations)
  })).sort((a, b) => a.fullPath.localeCompare(b.fullPath));

  useEffect(() => {
    if (!profile?.companyId) return;
    const locQ = query(collection(db, 'locations'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const unsub = onSnapshot(locQ, (snap) => {
      setLocations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [profile?.companyId]);

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

  const handleImportContact = async () => {
    if (typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          if (contact.name && contact.name.length > 0) {
            setName(contact.name[0]);
          }
          if (contact.tel && contact.tel.length > 0) {
            const phoneStr = contact.tel[0].replace(/[^\d+]/g, '');
            setPhone(phoneStr);
          }
          toast.success('تم استيراد جهة الاتصال بنجاح');
        }
      } catch (err) {
        console.error('Contact selection failed:', err);
      }
    } else {
      toast.error('ميزة استيراد جهات الاتصال غير مدعومة في هذا الجهاز');
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.companyId || !user) return;

    try {
      const customerData: any = {
        name,
        email,
        phone,
        contactNumbers,
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
    setContactNumbers(Array.isArray(customer.contactNumbers) ? customer.contactNumbers : []);
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
    setContactNumbers([]);
    setAddress('');
    setCustomerType('');
    setCustomerTypeOther('');
    setIsActive(true);
    setEditingCustomer(null);
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          customer.phone?.includes(searchQuery) ||
                          customer.id?.toLowerCase().includes(searchQuery.toLowerCase());
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
          {hasPermission(profile, 'customers', 'create') && (
            <Button size="icon" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white" onClick={openAddDialog}>
              <Plus className="w-5 h-5" />
            </Button>
          )}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'تعديل العميل' : 'إضافة عميل جديد'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCustomer} className="space-y-4 pt-4">
                <div className="bg-blue-50/40 p-4 border border-blue-100 rounded-xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-blue-400"></div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h4 className="font-semibold text-blue-900 text-sm">البيانات الأساسية</h4>
                    {isContactsSupported && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleImportContact}
                        className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-100 bg-white shadow-sm"
                      >
                        <Contact className="w-4 h-4" />
                        استيراد من جهات الاتصال
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم العميل / الشركة</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>رقم الهاتف</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} required dir="ltr" className="text-left" />
                    </div>
                  </div>
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

                <div className="space-y-4 md:col-span-2 border-t pt-4 bg-gray-50/50 p-4 rounded-xl">
                  <Label className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /> أرقام تواصل إضافية (اختياري)</Label>
                  {(Array.isArray(contactNumbers) ? contactNumbers : []).map((contact, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-2 items-start md:items-end bg-white p-3 rounded-xl border border-gray-200 relative shadow-sm">
                      <div className="w-full md:w-1/3 space-y-1">
                        <Label className="text-xs text-gray-500">الاسم التعريفي (مثال: مستودع)</Label>
                        <Input value={contact.name} onChange={(e) => {
                          const newArr = [...contactNumbers];
                          newArr[idx].name = e.target.value;
                          setContactNumbers(newArr);
                        }} placeholder="مثال: الاستقبال"/>
                      </div>
                      <div className="w-full md:w-2/3 flex gap-2">
                        <div className="w-[140px] shrink-0">
                          <Label className="text-xs text-gray-500 mb-1 block">رمز البلد</Label>
                          <Select value={contact.countryCode} onValueChange={(val) => {
                            const newArr = [...contactNumbers];
                            if (val) newArr[idx].countryCode = val;
                            setContactNumbers(newArr);
                          }}>
                            <SelectTrigger className="bg-white" dir="ltr">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map(c => <SelectItem key={c.code} value={c.code} dir="ltr">{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-gray-500 mb-1 block">رقم الهاتف (أرقام فقط)</Label>
                          <div className="flex gap-2">
                            <Input 
                              dir="ltr" 
                              className="text-left bg-white" 
                              value={contact.number} 
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                const newArr = [...contactNumbers];
                                newArr[idx].number = val;
                                setContactNumbers(newArr);
                              }} 
                              placeholder="5xxxxxxxxx"
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => {
                              setContactNumbers(contactNumbers.filter((_, i) => i !== idx));
                            }} className="text-red-500 hover:bg-red-50 shrink-0">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setContactNumbers([...(Array.isArray(contactNumbers) ? contactNumbers : []), { name: '', countryCode: '+966', number: '' }])} className="w-full border-dashed bg-white">
                    <Plus className="w-4 h-4 ml-2" /> إضافة رقم تواصل
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني (اختياري)</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} dir="ltr" className="text-left" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium border-b pb-2">تفاصيل العنوان</h3>
                  <AddressSelector locations={locations} value={address} onChange={setAddress} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
