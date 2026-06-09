'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Plus, Minus, ShoppingCart, Loader2, Trash2, ChevronRight, Check, Gift, Percent, FileText, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ProductDetailsDialog } from './ProductDetailsDialog';

export function OrderRegistrationDialog({
  open,
  onOpenChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  
  // Order State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceType, setInvoiceType] = useState('cash'); // 'cash', 'pending_cash', 'credit'
  const [dueDate, setDueDate] = useState('');
  
  // Custom Flow State
  const [step, setStep] = useState<1 | 2>(1); // 1: Selection, 2: Review
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [skipReview, setSkipReview] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<any>(null);
  
  // Quick Add Customer State
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Cart State: array of items
  const [cart, setCart] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  
  // Customer History
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  
  // Stages
  const [orderStages, setOrderStages] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      setInvoiceType('cash');
      setDueDate('');
      setStep(1);
      setCart([]);
      setSelectedCustomerId('');
      setDiscountValue(0);
      setSkipReview(false);
      setProductSearch('');
      setActiveCategory('all');
      setIsCreatingCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !profile?.companyId) return;

    setLoading(true);
    const qCustomers = query(collection(db, 'customers'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qProducts = query(collection(db, 'products'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qBrands = query(collection(db, 'productBrands'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qStages = query(collection(db, 'orderStages'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));

    const unsubC = onSnapshot(qCustomers, (snap) => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
    const unsubP = onSnapshot(qProducts, (snap) => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
    const unsubB = onSnapshot(qBrands, (snap) => setBrands(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
    const unsubStages = onSnapshot(qStages, (snap) => {
        const sortedStages = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.index - b.index);
        setOrderStages(sortedStages);
    }, e => console.error(e));
    const unsubComp = onSnapshot(doc(db, 'companies', profile.companyId), (docSnap) => {
      if (docSnap.exists()) setCompanyDetails(docSnap.data());
    }, e => console.error(e));

    setLoading(false);

    return () => { unsubC(); unsubP(); unsubB(); unsubStages(); unsubComp(); };
  }, [open, profile?.companyId]);

  useEffect(() => {
    if (!selectedCustomerId || !profile?.companyId) {
      setCustomerOrders([]);
      return;
    }
    const qOrders = query(
      collection(db, 'orders'),
      where('companyId', '==', profile.companyId),
      where('customerId', '==', selectedCustomerId),
      where('isDeleted', '==', false)
    );
    const unsub = onSnapshot(qOrders, (snap) => {
      const ordersInfo = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      ordersInfo.sort((a, b) => {
        const da = a.createdAt?.toMillis?.() || 0;
        const dbTime = b.createdAt?.toMillis?.() || 0;
        return dbTime - da;
      });
      setCustomerOrders(ordersInfo);
    }, e => console.error(e));
    return () => unsub();
  }, [selectedCustomerId, profile?.companyId]);

  const addToCart = (product: any, isOfferEntry = false) => {
    if (product.inStock === false && !isOfferEntry) {
      toast.error(`نفدت الكمية للصنف ${product.name}`);
      return;
    }

    // Check restrictions
    if (product.invoiceTypeRestriction) {
      if (product.invoiceTypeRestriction === 'cash_only' && invoiceType !== 'cash') {
        toast.error(`الصنف ${product.name} يباع نقداً فقط.`);
        return;
      }
      if (product.invoiceTypeRestriction === 'cash_or_pending' && invoiceType === 'credit') {
        toast.error(`الصنف ${product.name} لا يباع بالأجل.`);
        return;
      }
    }

    let finalCurrency = companyDetails?.primaryCurrency || 'SAR';
    if (product.currencyRestrictionType === 'specific' && product.specificCurrencies?.length) {
      finalCurrency = product.specificCurrencies[0];
    } else if (product.currencyRestrictionType === 'primary_only') {
      finalCurrency = product.currency || companyDetails?.primaryCurrency || 'SAR';
    } else if (product.currencyRestrictionType === 'any') {
      finalCurrency = companyDetails?.primaryCurrency || 'SAR'; // Defaults to primary if flexible
    } else if (product.currency) {
      finalCurrency = product.currency;
    }

    const pIdToStore = isOfferEntry ? `${product.id}_offer` : product.id;
    const pNameToStore = isOfferEntry ? `${product.name} (عرض خاص)` : product.name;
    const priceToStore = isOfferEntry ? product.specialOffer.price : product.price;

    const existingItemIndex = cart.findIndex(item => item.productId === pIdToStore && item.currency === finalCurrency);
    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { 
        productId: pIdToStore, 
        productName: pNameToStore, 
        price: priceToStore, 
        currency: finalCurrency,
        quantity: 1,
        isOfferEntry,
        productObj: product 
      }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQty = newCart[index].quantity + delta;
    if (newQty <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].quantity = newQty;
    }
    setCart(newCart);
  };

  const customerOrderFreq: Record<string, number> = {};
  const customerOrderQty: Record<string, number> = {};
  
  const getPastBonusHistory = (productId: string) => {
    let totalGiven = 0;
    let timesOrdered = 0;
    const pastDetails: string[] = [];
    
    customerOrders.forEach(order => {
      order.items?.forEach((item: any) => {
        if (item.productId === productId || item.productId === `${productId}_offer`) {
          timesOrdered++;
          if (item.bonusQuantity > 0) {
            totalGiven += item.bonusQuantity;
            if (pastDetails.length < 2) {
              pastDetails.push(`${item.bonusQuantity} في ${new Date(order.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('ar-SA')}`);
            }
          }
        }
      });
    });
    
    return { totalGiven, timesOrdered, pastDetails };
  };

  customerOrders.forEach(order => {
    order.items?.forEach((item: any) => {
       const pid = item.productId.replace('_offer', '');
       customerOrderFreq[pid] = (customerOrderFreq[pid] || 0) + 1;
       customerOrderQty[pid] = (customerOrderQty[pid] || 0) + item.quantity;
    });
  });

  const categories = [
    { id: 'all', name: 'الكل' },
    { id: 'smart_freq', name: 'يطلبها باستمرار 🔥' },
    { id: 'smart_qty', name: 'الأكثر كمية 📦' },
    { id: 'smart_never', name: 'لم تُطلب سابقاً 🆕' },
    ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(c => ({ id: c, name: c }))
  ];

  const updateItemCurrency = (index: number, newCurrency: string) => {
    const newCart = [...cart];
    newCart[index].currency = newCurrency;
    setCart(newCart);
  };

  const updateItemNote = (index: number, note: string) => {
    const newCart = [...cart];
    newCart[index].note = note;
    setCart(newCart);
  };

  const getProductQty = (pId: string) => cart.filter(i => i.productId === pId).reduce((s, i) => s + i.quantity, 0);

  const handleDecrementProduct = (productId: string) => {
    const index = cart.map(i => i.productId).lastIndexOf(productId);
    if (index >= 0) {
      updateQuantity(index, -1);
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!newCustomerName || !profile?.companyId || !user) {
      toast.error('الرجاء إدخال اسم العميل');
      return;
    }
    setSaving(true);
    try {
      const customerId = `cust_${Math.random().toString(36).substring(2, 11)}`;
      const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(db, 'customers', customerId), {
        name: newCustomerName,
        phone: newCustomerPhone,
        companyId: profile.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isActive: true,
        isDeleted: false
      });
      toast.success('تمت إضافة العميل بنجاح');
      setSelectedCustomerId(customerId);
      setIsCreatingCustomer(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } catch (e) {
      console.error(e);
      toast.error('فشل إضافة العميل');
    } finally {
      setSaving(false);
    }
  };

  const calculateBonus = (item: any) => {
    const p = item.productObj;
    if (!p.bonusType || p.bonusType === 'none') return 0;
    
    if (p.bonusType === 'fixed') {
      const pct = p.bonusFixedPercent || 0;
      return Math.floor(item.quantity * (pct / 100));
    }
    
    if (p.bonusType === 'tiered' && p.bonusTiers) {
      // Find matching tier
      const tier = p.bonusTiers.find((t: any) => {
         const mInvoice = !t.invoiceType || t.invoiceType === 'all' || t.invoiceType === invoiceType;
         const mQty = item.quantity >= t.minQty && (!t.maxQty || item.quantity <= t.maxQty);
         return mInvoice && mQty;
      });
      if (tier) {
        return Math.floor(item.quantity * (tier.percent / 100));
      }
    }
    
    return 0;
  };

  const calculateItemTotal = (item: any) => {
    return item.quantity * item.price;
  };

  const totalsByCurrency = cart.reduce((acc, item) => {
    const curr = item.currency || companyDetails?.primaryCurrency || 'SAR';
    if (!acc[curr]) acc[curr] = 0;
    acc[curr] += calculateItemTotal(item);
    return acc;
  }, {} as Record<string, number>);

  const handleSubmit = async () => {
    if (!selectedCustomerId || cart.length === 0 || !profile?.companyId || !user) {
      toast.error('الرجاء إكمال كافة البيانات');
      return;
    }

    for (const item of cart) {
      const p = item.productObj;
      if (p.invoiceTypeRestriction === 'cash_only' && invoiceType !== 'cash') {
        toast.error(`الطلب غير صالح. الصنف "${p.name}" يباع نقداً فقط.`);
        return;
      }
      if (p.invoiceTypeRestriction === 'cash_or_pending' && invoiceType === 'credit') {
        toast.error(`الطلب غير صالح. الصنف "${p.name}" لا يباع بالأجل.`);
        return;
      }
    }

    setSaving(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomerId);
      
      // Group items by brand (for the UI mostly, but we can save group tags)
      // The requirement says: split orders by brand. We can save them as multiple orders!
      // Or save as one order with multiple sub-invoices. Let's do multiple orders if they have different brands.
      
      const itemsByBrand: Record<string, any[]> = {};
      cart.forEach(item => {
        const bId = item.productObj.brandId || 'general';
        if (!itemsByBrand[bId]) itemsByBrand[bId] = [];
        itemsByBrand[bId].push(item);
      });

      for (const brandId of Object.keys(itemsByBrand)) {
        const orderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
        const brandItems = itemsByBrand[brandId];
        
        const brandTotalsByCurrency = brandItems.reduce((acc, item) => {
          const curr = item.currency || companyDetails?.primaryCurrency || 'SAR';
          if (!acc[curr]) acc[curr] = 0;
          acc[curr] += calculateItemTotal(item);
          return acc;
        }, {} as Record<string, number>);
        
        const defaultInitialStatus = orderStages.length > 0 ? orderStages[0].name : 'pending';
        
        let finalClientUid = customer.appUserId || null;

        if (!finalClientUid && customer.phone) {
          try {
            const { getDocs, query: fq, collection: fcol, where: fwh } = await import('firebase/firestore');
            const qUsers = fq(fcol(db, 'userProfiles'), fwh('phone', '==', customer.phone), fwh('role', '==', 'client'));
            const userSnap = await getDocs(qUsers);
            if (!userSnap.empty) {
              finalClientUid = userSnap.docs[0].id;
              const { updateDoc } = await import('firebase/firestore');
              await updateDoc(doc(db, 'customers', customer.id), { 
                appUserId: finalClientUid,
                updatedAt: serverTimestamp(),
                updatedBy: user.uid 
              });
            }
          } catch (err) {
            console.error("Error looking up app user by phone:", err);
          }
        }

        await setDoc(doc(db, 'orders', orderId), {
          companyId: profile.companyId,
          customerId: customer.id,
          ...(finalClientUid && { clientUid: finalClientUid }),
          customerName: customer.name,
          customerPhone: customer.phone || '',
          customerAddress: customer.address || 'غير محدد',
          source: 'company',
          invoiceType, // 'cash', 'pending_cash', 'credit'
          dueDate: invoiceType !== 'cash' ? dueDate : null,
          brandId: brandId === 'general' ? null : brandId,
          items: brandItems.map(i => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            note: i.note || '',
            bonusQuantity: i.isManualBonus ? (i.bonusQuantity || 0) : calculateBonus(i),
            isManualBonus: !!i.isManualBonus,
            price: i.price,
            currency: i.currency,
            total: calculateItemTotal(i)
          })),
          discount: { type: discountType, value: discountValue },
          skipReviewPhase: skipReview,
          totalAmountByCurrency: brandTotalsByCurrency,
          status: skipReview ? (orderStages.length > 1 ? orderStages[1].name : defaultInitialStatus) : defaultInitialStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          createdByName: profile.displayName || user.displayName || 'غير محدد',
          updatedBy: user.uid,
          isDeleted: false
        });

        const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
        const notifData: any = {
          companyId: profile.companyId,
          title: 'طلب جديد',
          message: `تم إنشاء طلب جديد للعميل ${customer.name}`,
          type: 'new_order',
          orderId: orderId,
          readBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
          isDeleted: false
        };

        if (finalClientUid) {
          notifData.clientUid = finalClientUid;
        }

        await setDoc(doc(db, 'notifications', notifId), notifData).catch(err => handleFirestoreError(err, OperationType.CREATE, 'notifications'));
      }

      toast.success('تم تسجيل الطلب بنجاح');
      onOpenChange(false);
      setCart([]);
      setSelectedCustomerId('');
      setStep(1);
      setDiscountValue(0);
      setSkipReview(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      toast.error('فشل تسجيل الطلب');
    } finally {
      setSaving(false);
    }
  };

  let expandedFilteredProducts = products.flatMap(p => {
    const matchesSearch = p.name?.toLowerCase().includes(productSearch.toLowerCase());
    
    let matchesCategory = false;
    if (activeCategory === 'all') matchesCategory = true;
    else if (activeCategory === 'smart_freq') matchesCategory = !!customerOrderFreq[p.id];
    else if (activeCategory === 'smart_qty') matchesCategory = !!customerOrderQty[p.id];
    else if (activeCategory === 'smart_never') matchesCategory = !customerOrderFreq[p.id];
    else matchesCategory = p.category === activeCategory;

    if (!matchesSearch || !matchesCategory) return [];
    
    const entries = [];
    
    // Add regular product entry
    entries.push({ ...p, isOfferEntry: false, displayId: p.id });

    // Add special offer entry if active
    if (p.specialOffer?.isActive) {
      entries.push({ ...p, isOfferEntry: true, displayId: `${p.id}_offer` });
    }
    
    return entries;
  });

  if (activeCategory === 'smart_freq') {
    expandedFilteredProducts.sort((a, b) => (customerOrderFreq[b.id] || 0) - (customerOrderFreq[a.id] || 0));
  } else if (activeCategory === 'smart_qty') {
    expandedFilteredProducts.sort((a, b) => (customerOrderQty[b.id] || 0) - (customerOrderQty[a.id] || 0));
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const totalCartItems = cart.reduce((s, i) => s + i.quantity, 0);
  const primaryTotal = totalsByCurrency[companyDetails?.primaryCurrency || 'SAR'] || 0;
  
  // Cutomer Stats
  const primaryCurr = companyDetails?.primaryCurrency || 'SAR';
  const orderCount = customerOrders.length;
  const totalPrimaryValue = customerOrders.reduce((sum, o) => sum + (o.totalAmountByCurrency?.[primaryCurr] || 0), 0);
  const avgOrderValue = orderCount > 0 ? Math.round(totalPrimaryValue / orderCount) : 0;
  
  const lastOrder = customerOrders[0];
  let daysAgo = '';
  if (lastOrder && lastOrder.createdAt) {
     const then = lastOrder.createdAt.toDate();
     const diff = Math.floor((new Date().getTime() - then.getTime()) / (1000 * 3600 * 24));
     daysAgo = diff === 0 ? 'اليوم' : `قبل ${diff} أيام`;
  }
  const lastOrderItemCount = lastOrder?.items?.reduce((s:number, i:any) => s + (i.quantity || 1), 0) || 0;
  const lastOrderTotal = lastOrder?.totalAmountByCurrency?.[primaryCurr] || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] h-[90vh] md:h-[800px] flex flex-col p-0 overflow-hidden bg-gray-50 border-gray-200" dir="rtl">
        {step === 1 ? (
          // STEP 1: SELECTION
          <>
            <DialogHeader className="p-4 border-b bg-white flex-shrink-0 relative">
              <DialogTitle className="text-xl font-bold flex items-center justify-center text-gray-900 leading-none m-0">
                طلب جديد
              </DialogTitle>
            </DialogHeader>

            {loading ? (
              <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Customer Section */}
                <div className="p-4 bg-white border-b flex-shrink-0">
                  <Label className="text-gray-900 font-bold mb-2 block">العميل</Label>
                  {!selectedCustomerId ? (
                     <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v || '')}>
                       <SelectTrigger className="w-full text-right h-12 bg-white">
                         <SelectValue placeholder="بحث بالاسم أو رقم الهاتف..." />
                       </SelectTrigger>
                       <SelectContent>
                         {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                       </SelectContent>
                     </Select>
                  ) : (
                    <div className="border border-blue-200 bg-white rounded-xl p-4 relative shadow-sm">
                       <button onClick={() => setSelectedCustomerId('')} className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>
                       </button>
                       <div className="flex items-center gap-3 mb-4">
                         <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">
                           {selectedCustomer?.name?.charAt(0) || 'ع'}
                         </div>
                         <div>
                           <h3 className="font-bold text-gray-900">{selectedCustomer?.name}</h3>
                           <p className="text-sm text-gray-500">{selectedCustomer?.phone} • {selectedCustomer?.address || 'بدون عنوان'}</p>
                           <p className="text-xs text-gray-400 mt-1">{orderCount} طلب • متوسط {avgOrderValue.toLocaleString()} {primaryCurr}</p>
                         </div>
                       </div>
                       
                       {lastOrder && (
                         <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                            <div>
                              <p className="text-xs text-gray-500">آخر الطلبات</p>
                              <p className="text-sm font-bold text-gray-700 mt-1">{daysAgo}</p>
                            </div>
                            <p className="text-sm text-gray-600">{lastOrderItemCount} صنف</p>
                            <p className="text-sm font-bold text-gray-900">{lastOrderTotal.toLocaleString()} {primaryCurr}</p>
                         </div>
                       )}
                    </div>
                  )}
                </div>

                {/* Categories */}
                {selectedCustomerId && (
                  <div className="bg-white flex-shrink-0">
                     <div className="p-4 pb-2">
                       <h3 className="font-bold text-gray-900 mb-3">الأصناف</h3>
                       <div className="relative">
                         <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                         <Input 
                           placeholder="بحث في الأصناف..." 
                           className="pl-4 pr-10 h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-blue-500"
                           value={productSearch}
                           onChange={(e) => setProductSearch(e.target.value)}
                         />
                       </div>
                     </div>
                     <div className="flex overflow-x-auto hide-scrollbar px-4 pb-3 pt-1 gap-2">
                       {categories.map(cat => (
                         <button 
                           key={cat.id}
                           onClick={() => setActiveCategory(cat.id)}
                           className={cn(
                             "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors border", 
                             activeCategory === cat.id ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
                             cat.id.startsWith('smart_') && activeCategory !== cat.id ? "bg-orange-50/50 text-orange-700 border-orange-200 hover:bg-orange-100" : ""
                           )}
                         >
                           {cat.name}
                         </button>
                       ))}
                     </div>
                  </div>
                )}

                {/* Products List */}
                <div className="flex-1 overflow-y-auto px-4 py-2 relative">
                    <div className="space-y-3 pb-24">
                      {expandedFilteredProducts.map(product => {
                        const qty = getProductQty(product.displayId);
                        return (
                          <div key={product.displayId} className={`bg-white border ${product.isOfferEntry ? 'border-red-200 bg-red-50/20' : 'border-gray-100'} rounded-xl p-4 flex justify-between items-center shadow-sm ${product.inStock === false && !product.isOfferEntry ? 'opacity-70' : ''}`}>
                             <div className="flex-1 cursor-pointer" onClick={() => setSelectedProductForDetails(product)}>
                               <div className="flex items-center gap-2 mb-1">
                                 <h4 className="font-bold text-gray-900 leading-tight hover:text-blue-600 transition-colors">{product.name}</h4>
                                 {product.isOfferEntry && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">عرض خاص</span>}
                               </div>
                               <p className={`text-sm font-bold ${product.isOfferEntry ? 'text-red-600' : 'text-blue-600'}`}>
                                 {product.isOfferEntry ? product.specialOffer.price : product.price} <span className="text-xs font-normal text-gray-500">{product.currency} / {product.unit || 'حبة'}</span>
                               </p>
                               {product.isOfferEntry && product.specialOffer.targetExpiryDate && product.specialOffer.targetExpiryDate !== 'any' && (
                                  <p className="text-xs text-gray-400 mt-0.5 block">صلاحية: <span dir="ltr">{product.specialOffer.targetExpiryDate}</span></p>
                               )}
                               <p className="text-[10px] text-gray-400 mt-1 underline">اضغط للتفاصيل وإحصائيات العميل</p>
                             </div>
                             
                             <div className="flex items-center gap-2 border rounded-lg overflow-hidden bg-gray-50 h-10 shadow-sm border-gray-200 ml-4 shrink-0">
                               <button onClick={() => addToCart(product, product.isOfferEntry)} className={`w-10 h-full hover:bg-blue-50 flex items-center justify-center transition-colors ${product.isOfferEntry ? 'text-red-600' : 'text-blue-600'}`}>
                                 <Plus className="w-4 h-4" />
                               </button>
                               <input
                                 type="number"
                                 value={qty || ''}
                                 min="0"
                                 placeholder="0"
                                 onClick={(e) => {
                                   (e.target as HTMLInputElement).select();
                                 }}
                                 onChange={(e) => {
                                   const val = parseInt(e.target.value);
                                   if (!isNaN(val) && val >= 0) {
                                     const diff = val - qty;
                                     if (diff > 0) {
                                       for(let i=0; i<diff; i++) addToCart(product, product.isOfferEntry);
                                     } else if (diff < 0) {
                                       for(let i=0; i<Math.abs(diff); i++) handleDecrementProduct(product.displayId);
                                     }
                                   } else if (e.target.value === '') {
                                     for(let i=0; i<qty; i++) handleDecrementProduct(product.displayId);
                                   }
                                 }}
                                 className="text-sm font-bold w-10 text-center outline-none bg-transparent" 
                               />
                               <button onClick={() => handleDecrementProduct(product.displayId)} disabled={qty === 0} className={cn("w-10 h-full flex items-center justify-center transition-colors", qty > 0 ? "hover:bg-red-50 text-red-500" : "text-gray-300 pointer-events-none")}>
                                 <Minus className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                         )
                       })}
                      {expandedFilteredProducts.length === 0 && (
                        <div className="text-center py-12 text-gray-400">لا يوجد أصناف متطابقة</div>
                      )}
                    </div>
                </div>

                {/* Bottom Action Bar */}
                {cart.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] flex items-center justify-between z-10">
                    <div>
                      <p className="text-xs text-gray-500 font-bold mb-0.5">{totalCartItems} صنف</p>
                      <p className="font-bold text-lg text-gray-900 leading-none">{primaryTotal.toLocaleString()} {companyDetails?.primaryCurrency || 'SAR'}</p>
                    </div>
                    <Button onClick={() => setStep(2)} className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                       مراجعة الطلب <ChevronRight className="w-5 h-5 rotate-180" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // STEP 2: REVIEW
          <>
            <DialogHeader className="p-4 border-b bg-white flex-shrink-0 relative">
              <button onClick={() => setStep(1)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                <ChevronRight className="w-6 h-6" />
              </button>
              <DialogTitle className="text-xl font-bold flex items-center justify-center text-gray-900 leading-none m-0">
                مراجعة الطلب
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 pb-32">
               <div className="space-y-6">
                 
                 {/* Customer Summary */}
                 <div>
                   <h3 className="text-blue-600 font-bold flex items-center gap-2 mb-3 text-sm"><span className="w-2 h-2 rounded-full bg-blue-600"></span> العميل</h3>
                   <div className="border border-gray-200 bg-white rounded-xl p-4 shadow-sm">
                      {!selectedCustomerId ? (
                        isCreatingCustomer ? (
                          <div className="space-y-4">
                            <h4 className="font-bold text-gray-900 text-sm">إضافة عميل جديد سريعاً</h4>
                            <div className="space-y-2">
                              <Label className="text-xs">اسم العميل *</Label>
                              <Input placeholder="الاسم" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">رقم الجوال</Label>
                              <Input placeholder="رقم الجوال" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button onClick={handleQuickAddCustomer} disabled={!newCustomerName || saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                حفظ ومتابعة
                              </Button>
                              <Button variant="outline" onClick={() => setIsCreatingCustomer(false)} className="flex-1">
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-gray-500 mb-4 text-sm font-bold">لم تقم باختيار عميل لهذا الطلب</p>
                            <Button onClick={() => setIsCreatingCustomer(true)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full font-bold">
                              <Plus className="w-4 h-4 mr-1" /> إضافة عميل جديد
                            </Button>
                          </div>
                        )
                      ) : (
                        <>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg">
                              {selectedCustomer?.name?.charAt(0) || 'ع'}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{selectedCustomer?.name}</h3>
                              <p className="text-sm text-gray-500">{selectedCustomer?.phone} • {selectedCustomer?.address}</p>
                              <p className="text-xs text-gray-400 mt-1">{orderCount} طلب • متوسط {avgOrderValue.toLocaleString()} {primaryCurr}</p>
                            </div>
                          </div>
                          {lastOrder && (
                             <div className="border-t border-gray-100 pt-3 flex justify-between items-end">
                                <div>
                                  <p className="text-xs text-gray-500">آخر الطلبات</p>
                                  <p className="text-sm font-bold text-gray-700 mt-1">{daysAgo}</p>
                                </div>
                                <p className="text-sm text-gray-600">{lastOrderItemCount} صنف</p>
                                <p className="text-sm font-bold text-gray-900">{lastOrderTotal.toLocaleString()} {primaryCurr}</p>
                             </div>
                           )}
                        </>
                      )}
                   </div>
                 </div>

                 {/* Cart Items */}
                 <div>
                    <div className="flex justify-between items-end mb-3">
                      <h3 className="text-blue-600 font-bold flex items-center gap-2 text-sm"><ShoppingCart className="w-4 h-4" /> الأصناف ({totalCartItems})</h3>
                      <button onClick={() => setStep(1)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1"><Plus className="w-3 h-3"/> تعديل</button>
                    </div>
                    
                    <div className="space-y-3">
                      {cart.map((item, idx) => {
                        const computedBonus = calculateBonus(item);
                        return (
                          <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative">
                             <div className="flex justify-between items-start mb-3">
                               <div>
                                 <h4 className="font-bold text-gray-900 leading-tight">{item.productName}</h4>
                                 <p className="text-xs text-gray-500 mt-1">{item.price} {item.currency} / {item.productObj?.unit || 'حبة'}</p>
                               </div>
                               <p className="font-bold text-blue-600">{calculateItemTotal(item).toLocaleString()} {item.currency}</p>
                             </div>

                             <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-9">
                                 <button onClick={() => updateQuantity(idx, 1)} className="w-9 h-full hover:bg-blue-50 text-blue-600 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
                                 <input 
                                   type="number"
                                   min="1"
                                   value={item.quantity}
                                   onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val) && val > 0) {
                                        const nc = [...cart];
                                        nc[idx].quantity = val;
                                        setCart(nc);
                                      }
                                   }}
                                   className="w-10 h-full text-center text-sm font-bold bg-blue-600 text-white outline-none"
                                 />
                                 <button onClick={() => updateQuantity(idx, -1)} disabled={item.quantity <= 1} className={cn("w-9 h-full flex items-center justify-center", item.quantity > 1 ? "hover:bg-red-50 text-red-500" : "text-gray-300 pointer-events-none")}><Minus className="w-4 h-4" /></button>
                               </div>
                               <button onClick={() => { const nc = [...cart]; nc.splice(idx,1); setCart(nc); if(nc.length===0) setStep(1); }} className="p-2 hover:bg-red-50 text-red-400 rounded-lg border border-transparent hover:border-red-100 transition-colors">
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </div>

                             <div className="mt-3 flex flex-col gap-2">
                               <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1.5 rounded w-full">
                                 <Gift className="w-3.5 h-3.5" />
                                 بونص: 
                                 <input 
                                   type="number"
                                   min="0"
                                   value={item.isManualBonus ? (item.bonusQuantity || 0) : computedBonus}
                                   onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      const nc = [...cart];
                                      nc[idx].bonusQuantity = val;
                                      nc[idx].isManualBonus = true;
                                      setCart(nc);
                                   }}
                                   className="w-16 h-6 px-1 text-center font-bold bg-white border border-orange-200 rounded text-orange-600"
                                 />
                                 مجاناً
                                 {item.isManualBonus && (
                                   <button 
                                     onClick={() => {
                                       const nc = [...cart];
                                       nc[idx].isManualBonus = false;
                                       setCart(nc);
                                     }}
                                     className="text-[10px] underline text-orange-400 mr-2"
                                   >إعادة للآلي</button>
                                 )}
                               </div>
                               
                               {(() => {
                                 const history = getPastBonusHistory(item.productId.replace('_offer', ''));
                                 if (history.totalGiven === 0) return null;
                                 return (
                                   <div className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit border border-gray-100">
                                     <span className="font-bold">تاريخ البونص للعميل:</span> إجمالي {history.totalGiven} ممنوح سابقاً 
                                     {history.pastDetails.length > 0 && ` (آخرها: ${history.pastDetails.join('، ')})`}
                                   </div>
                                 );
                               })()}
                             </div>

                             <div className="mt-3">
                               <Input 
                                 placeholder="ملاحظة على الصنف..." 
                                 className="h-9 bg-gray-50 border-gray-200 text-xs shadow-none"
                                 value={item.note || ''}
                                 onChange={(e) => updateItemNote(idx, e.target.value)}
                               />
                             </div>
                          </div>
                        )
                      })}
                    </div>
                 </div>

                 {/* Discount (Percentage only to simplify multi-curr math for now) */}
                 <div>
                   <h3 className="text-blue-600 font-bold flex items-center gap-2 mb-3 text-sm"><Percent className="w-4 h-4" /> الخصم العام (%)</h3>
                   <div className="bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col p-3 gap-2">
                       <Input 
                         type="number" 
                         min="0" 
                         max="100"
                         placeholder="أدخل نسبة الخصم %..." 
                         className="h-12 border-gray-200 font-bold text-lg"
                         value={discountValue || ''}
                         onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                       />
                       <p className="text-xs text-gray-500">سيتم تطبيق هذه النسبة كخصم على الإجمالي عند إصدار الفاتورة النهائية.</p>
                   </div>
                 </div>

                 {/* Invoice Type */}
                 <div>
                   <h3 className="text-blue-600 font-bold flex items-center gap-2 mb-3 text-sm"><FileText className="w-4 h-4" /> نوع الفاتورة</h3>
                   <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'cash', label: 'نقدي' },
                        { id: 'credit', label: 'آجل' },
                        { id: 'pending_cash', label: 'نقدي معلق' },
                        { id: 'other', label: 'آخر' }
                      ].map(type => (
                        <button 
                          key={type.id}
                          onClick={() => {
                            for (const item of cart) {
                              const p = item.productObj;
                              if (p.invoiceTypeRestriction === 'cash_only' && type.id !== 'cash') {
                                toast.error(`لا يمكن اختيار هذا النوع. الصنف "${p.name}" يباع نقداً فقط.`);
                                return;
                              }
                              if (p.invoiceTypeRestriction === 'cash_or_pending' && type.id === 'credit') {
                                toast.error(`لا يمكن اختيار هذا النوع. الصنف "${p.name}" لا يباع بالأجل.`);
                                return;
                              }
                            }
                            setInvoiceType(type.id);
                          }}
                          className={cn(
                            "flex-1 min-w-20 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border",
                            invoiceType === type.id ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {type.label}
                        </button>
                      ))}
                   </div>
                   {invoiceType !== 'cash' && (
                     <div className="mt-4 bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                       <Label className="text-sm font-bold text-gray-700">تاريخ الاستحقاق (موعد السداد)</Label>
                       <Input 
                         type="date" 
                         value={dueDate} 
                         onChange={(e) => setDueDate(e.target.value)} 
                         className="h-10 text-sm"
                       />
                     </div>
                   )}
                 </div>

                 {/* Options */}
                 <div>
                   <h3 className="text-blue-600 font-bold flex items-center gap-2 mb-3 text-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> خيارات المراحل</h3>
                   <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
                      <div>
                        <h4 className="font-bold text-gray-900">تجاوز {orderStages[0]?.name || 'المرحلة الأولى'}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">القفز مباشرة إلى حالة &apos;{orderStages.length > 1 ? orderStages[1].name : 'المرحلة التالية'}&apos;</p>
                      </div>
                      <button 
                        onClick={() => setSkipReview(!skipReview)}
                        className={cn("w-12 h-6 rounded-full transition-colors relative", skipReview ? "bg-blue-600" : "bg-gray-200")}
                      >
                        <span className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", skipReview ? "left-1" : "right-1")}></span>
                      </button>
                   </div>
                 </div>

                 {/* Order Summary */}
                 <div>
                   <h3 className="text-blue-600 font-bold flex items-center gap-2 mb-3 text-sm"><StickyNote className="w-4 h-4" /> ملخص الطلب</h3>
                   <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>عدد الأصناف</span>
                        <span className="font-bold">{totalCartItems} وحدة</span>
                      </div>
                      {cart.filter(i => calculateBonus(i) > 0).length > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>إجمالي البونص المضاف</span>
                          <span className="font-bold text-green-600">{cart.reduce((s,i) => s + calculateBonus(i), 0)} وحدة</span>
                        </div>
                      )}
                      
                      <div className="border-t border-dashed pt-3 mt-1 space-y-2">
                        {Object.entries(totalsByCurrency as Record<string, number>).map(([curr, total]) => (
                           <div key={curr} className="flex justify-between items-center">
                             <span className="text-sm font-bold text-gray-900">الإجمالي ({curr})</span>
                             <div className="text-left">
                                {discountValue > 0 && (
                                  <span className="text-xs text-red-500 line-through block ml-auto">{total.toLocaleString()}</span>
                                )}
                                <span className={cn("font-bold text-xl", curr === companyDetails?.primaryCurrency ? "text-blue-700" : "text-gray-700")}>
                                  {discountValue > 0 ? (total * (1 - discountValue / 100)).toLocaleString() : total.toLocaleString()} {curr}
                                </span>
                             </div>
                           </div>
                        ))}
                      </div>
                   </div>
                 </div>

               </div>
            </div>

            {/* Bottom Final Action Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex gap-3 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
              <Button onClick={() => setStep(1)} variant="outline" className="flex-1 h-14 rounded-xl font-bold text-blue-600 border-blue-200 hover:bg-blue-50">
                تعديل
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="flex-[2] h-14 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-lg gap-2 shadow-sm">
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6" /> تأكيد الطلب</>}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
      
      {/* Nested Product Details Dialog */}
      <ProductDetailsDialog 
        product={selectedProductForDetails}
        isOpen={!!selectedProductForDetails}
        onClose={() => setSelectedProductForDetails(null)}
        categories={categories as any}
        brands={brands}
        customerSpecificData={
          selectedCustomerId && selectedCustomer 
          ? {
              customerId: selectedCustomerId,
              customerName: selectedCustomer.name,
              customerOrders: customerOrders
            } 
          : undefined
        }
      />
    </Dialog>
  );
}
