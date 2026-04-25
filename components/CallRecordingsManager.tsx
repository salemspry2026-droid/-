'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStore } from '@/lib/store';
import { PhoneCall, Settings, Mic, Play, Trash2, StopCircle, UserPlus, FileAudio, Users, AlertCircle, PhoneIncoming, Box } from 'lucide-react';
import localforage from 'localforage';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export function CallRecordingsManager() {
  const { profile, user, isCallRecordingsOpen, setIsCallRecordingsOpen, setIncomingCall } = useStore();
  const [activeTab, setActiveTab] = useState<'recordings'|'settings'>('recordings');
  const [contacts, setContacts] = useState<{name: string, tel: string}[]>([]);
  const [recordings, setRecordings] = useState<any[]>([]);
  
  // Settings - New Contact
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Order Flow
  const [playingRecording, setPlayingRecording] = useState<any | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    if (isCallRecordingsOpen && profile?.companyId) {
      const loadContacts = () => {
        const saved = localStorage.getItem(`company_contacts_${profile.companyId}`);
        if (saved) setContacts(JSON.parse(saved));
      };

      const loadRecordings = async () => {
        try {
          const recs: any[] = await localforage.getItem(`recordings_${profile.companyId}`) || [];
          const enriched = recs.map(r => ({ ...r, audioUrl: URL.createObjectURL(r.blob) }));
          setRecordings(enriched);
        } catch (e) {
          console.error(e);
        }
      };

      const loadFirestoreData = async () => {
        const qCust = query(collection(db, 'customers'), where('companyId', '==', profile.companyId));
        const qProd = query(collection(db, 'products'), where('companyId', '==', profile.companyId));
        
        try {
          const [snapCust, snapProd] = await Promise.all([getDocs(qCust), getDocs(qProd)]);
          setCustomers(snapCust.docs.map(d => ({id: d.id, ...d.data()})));
          setProducts(snapProd.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (e) {
          console.error(e);
        }
      };

      loadContacts();
      loadRecordings();
      loadFirestoreData();
    }
  }, [isCallRecordingsOpen, profile?.companyId]);

  const saveContacts = (newList: {name: string, tel: string}[]) => {
    setContacts(newList);
    if (profile?.companyId) {
      localStorage.setItem(`company_contacts_${profile.companyId}`, JSON.stringify(newList));
    }
  };

  const handleAddContactManual = () => {
    if (!newName || !newPhone) return;
    saveContacts([...contacts, { name: newName, tel: newPhone }]);
    setNewName('');
    setNewPhone('');
    toast.success('تم إضافة جهة الاتصال لعميل');
  };

  const handleNativeContactPicker = async () => {
    try {
      const supported = ('contacts' in navigator && 'ContactsManager' in window);
      if (!supported) {
        toast.error('المتصفح لا يدعم الوصول المباشر لدليل الهاتف. يرجى إدخال الجهات يدوياً.');
        return;
      }
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const selected = await (navigator as any).contacts.select(props, opts);
      
      const newContacts = selected.map((c: any) => ({
        name: c.name?.[0] || 'Unknown',
        tel: c.tel?.[0] || 'Unknown'
      }));
      saveContacts([...contacts, ...newContacts]);
      toast.success('تمت إضافة جهات الاتصال بنجاح');
    } catch (e) {
      toast.error('تعذر الوصول لدليل الهاتف.');
    }
  };

  const deleteContact = (index: number) => {
    const list = [...contacts];
    list.splice(index, 1);
    saveContacts(list);
  };

  const deleteRecording = async (id: string, url: string) => {
    try {
      const recs: any[] = await localforage.getItem(`recordings_${profile?.companyId}`) || [];
      const updated = recs.filter(r => r.id !== id);
      await localforage.setItem(`recordings_${profile?.companyId}`, updated);
      URL.revokeObjectURL(url);
      setRecordings(current => current.filter(r => r.id !== id));
      if (playingRecording?.id === id) setPlayingRecording(null);
      toast.success('تم الحذف');
    } catch (e) {
      console.error(e);
    }
  };

  const playRecording = (rec: any) => {
    setPlayingRecording(rec);
    setTimeout(() => {
      audioRef.current?.play();
    }, 100);
  };

  const simulateCall = (contact: any) => {
    toast.info(`محاكاة مكالمة من ${contact.name}...`);
    setIsCallRecordingsOpen(false);
    setTimeout(() => {
      setIncomingCall(contact);
    }, 1500);
  };

  const handleCreateOrder = async () => {
    if (!profile?.companyId || !user || !selectedCustomerId || !selectedProductId) return;

    const customer = customers.find(c => c.id === selectedCustomerId);
    const product = products.find(p => p.id === selectedProductId);
    if (!customer || !product) return;

    try {
      const orderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
      const qty = parseInt(quantity);
      const total = product.price * qty;

      await setDoc(doc(db, 'orders', orderId), {
        companyId: profile.companyId,
        customerId: customer.id,
        customerName: customer.name,
        customerAddress: customer.address || 'غير محدد',
        items: [{
          productId: product.id,
          productName: product.name,
          quantity: qty,
          price: product.price,
          currency: product.currency
        }],
        totalAmountByCurrency: { [product.currency]: total },
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`));

      toast.success('تم تسجيل الطلب من المكالمة بنجاح');
      audioRef.current?.pause();
      setPlayingRecording(null);
      setSelectedCustomerId('');
      setSelectedProductId('');
    } catch(e: any) {
      toast.error(e.message || 'خطأ أثناء تسجيل الطلب');
    }
  };

  return (
    <Dialog open={isCallRecordingsOpen} onOpenChange={setIsCallRecordingsOpen}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[#F0F2F5]" dir="rtl">
        <DialogHeader className="p-4 bg-white border-b sticky top-0 z-10 shadow-sm flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-800">
            <Mic className="w-5 h-5 text-blue-600" />
            سجل المكالمات
          </DialogTitle>
          <div className="flex gap-1 overflow-hidden rounded-lg border bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('recordings')}
              className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${activeTab === 'recordings' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              التسجيلات
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1 text-sm font-bold rounded-md transition-all ${activeTab === 'settings' ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              الإعدادات
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* SEC: RECORDINGS */}
          {activeTab === 'recordings' && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded-lg flex gap-2 items-start">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>يتم حفظ هذه التسجيلات محلياً على جهازك فقط للحفاظ على الخصوصية، ولا تتم مزامنتها مع خوادم الشركة.</p>
              </div>

              {recordings.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FileAudio className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>لا توجد مكالمات مسجلة حالياً.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recordings.map((rec) => (
                    <div key={rec.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <PhoneCall className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate">{rec.contactName}</h4>
                        <p className="text-xs text-gray-500" dir="ltr">{new Date(rec.date).toLocaleString('ar-SA')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full h-8 w-8" onClick={() => playRecording(rec)}>
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 bg-red-50 hover:bg-red-100 rounded-full h-8 w-8" onClick={() => deleteRecording(rec.id, rec.audioUrl)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* In-Line Play & Create Order Form */}
              {playingRecording && (
                <div className="mt-4 bg-white border border-blue-200 rounded-xl p-4 shadow-md sticky bottom-0 border-t-4 border-t-blue-500 animate-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-gray-900">تشغيل: {playingRecording.contactName}</h3>
                    <Button variant="ghost" size="sm" onClick={() => { audioRef.current?.pause(); setPlayingRecording(null); }}>إغلاق</Button>
                  </div>
                  <audio ref={audioRef} src={playingRecording.audioUrl} controls className="w-full mb-4 h-10" />
                  
                  <div className="border-t pt-3">
                    <h4 className="font-bold text-sm text-gray-800 mb-2 flex items-center"><Box className="w-4 h-4 ml-1 text-green-600"/> تسجيل طلب مباشر</h4>
                    <div className="space-y-3">
                      <div>
                        <Label>العميل المستهدف للمكالمة</Label>
                        <Select value={selectedCustomerId} onValueChange={(val) => setSelectedCustomerId(val || '')}>
                          <SelectTrigger className="mt-1 bg-[#F0F2F5] border-transparent"><SelectValue placeholder="اختر العميل المعني" /></SelectTrigger>
                          <SelectContent>
                            {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>الصنف</Label>
                        <Select value={selectedProductId} onValueChange={(val) => setSelectedProductId(val || '')}>
                          <SelectTrigger className="mt-1 bg-[#F0F2F5] border-transparent"><SelectValue placeholder="اختر الصنف المطلوب" /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.price} {p.currency}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>الكمية</Label>
                        <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-1 bg-[#F0F2F5] border-transparent" />
                      </div>
                      <Button onClick={handleCreateOrder} disabled={!selectedCustomerId || !selectedProductId} className="w-full bg-green-600 hover:bg-green-700">تأكيد وتسجيل الطلب</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SEC: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 pb-20">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" /> جهات الاتصال للعملاء
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  قم بتحديد جهات الاتصال الخاصة بالعملاء فقط. سيقوم التطبيق بتجاهل أي مكالمات من أرقام أخرى. لا تتم مزامنة هذه الأرقام للشركة.
                </p>

                <div className="flex gap-2">
                  <Button onClick={handleNativeContactPicker} variant="outline" className="flex-1 bg-blue-50 text-blue-700 border-blue-200">
                    <UserPlus className="w-4 h-4 ml-2" /> استيراد من الهاتف
                  </Button>
                </div>

                <div className="mt-4 border-t pt-4">
                  <p className="text-xs font-bold text-gray-500 mb-2">أو إضافة جهة يدوياً</p>
                  <div className="flex flex-col gap-2">
                    <Input placeholder="اسم العميل" value={newName} onChange={e => setNewName(e.target.value)} className="bg-gray-50 bg-white" />
                    <Input placeholder="رقم الهاتف" value={newPhone} onChange={e => setNewPhone(e.target.value)} dir="ltr" className="text-right bg-gray-50" />
                    <Button onClick={handleAddContactManual} disabled={!newName || !newPhone}>إضافة للقائمة</Button>
                  </div>
                </div>
              </div>

              {contacts.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-3">القائمة المراقبة ({contacts.length})</h4>
                  <div className="space-y-2">
                    {contacts.map((c, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500" dir="ltr">{c.tel}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50" onClick={() => simulateCall(c)} title="محاكاة مكالمة">
                            <PhoneIncoming className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteContact(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
