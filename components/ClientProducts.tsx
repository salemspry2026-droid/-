'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShoppingCart, Search, Package, Gift, Plus, Minus, Trash2, Heart, Info, Clock, MapPin, Building2, AlignLeft } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';
import { ProductDetailsDialog } from './ProductDetailsDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface CartItem {
  product: any;
  quantity: number;
}

export function ClientProducts({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile, user, clientSelectedCompany } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrdering, setIsOrdering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [orderStages, setOrderStages] = useState<any[]>([]);

  const [invoiceType, setInvoiceType] = useState('cash'); // 'cash', 'pending_cash', 'credit'
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);

  // Derive allowed invoice types based on cart
  const allowedInvoiceTypes = useMemo(() => {
    let allowsPending = true;
    let allowsCredit = true;
    for (const item of cart) {
      const rest = item.product.invoiceTypeRestriction;
      if (rest === 'cash_only') {
        allowsPending = false;
        allowsCredit = false;
        break;
      } else if (rest === 'cash_or_pending') {
        allowsCredit = false;
      }
    }
    return { cash: true, pending: allowsPending, credit: allowsCredit };
  }, [cart]);

  useEffect(() => {
    if (!allowedInvoiceTypes.credit && invoiceType === 'credit') setInvoiceType('cash');
    if (!allowedInvoiceTypes.pending && invoiceType === 'pending_cash') setInvoiceType('cash');
  }, [allowedInvoiceTypes, invoiceType]);


  useEffect(() => {
    if (!clientSelectedCompany?.id) {
      setLoading(false);
      return;
    }

    // Reset cart when company changes
    setCart([]);

    const qProducts = query(
      collection(db, 'products'), 
      where('companyId', '==', clientSelectedCompany.id),
      where('isActive', '==', true),
      where('isDeleted', '==', false)
    );
    const qCats = query(collection(db, 'productCategories'), where('companyId', '==', clientSelectedCompany.id), where('isDeleted', '==', false));
    const qBrands = query(collection(db, 'productBrands'), where('companyId', '==', clientSelectedCompany.id), where('isDeleted', '==', false));
    const qStages = query(collection(db, 'orderStages'), where('companyId', '==', clientSelectedCompany.id), where('isDeleted', '==', false));

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubCats = onSnapshot(qCats, (snap) => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))), e => console.error(e));
    const unsubBrands = onSnapshot(qBrands, (snap) => setBrands(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))), e => console.error(e));
    const unsubStages = onSnapshot(qStages, (snap) => setOrderStages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => a.index - b.index)), e => console.error(e));

    return () => { unsubProducts(); unsubCats(); unsubBrands(); unsubStages(); };
  }, [clientSelectedCompany?.id]);

  const handlePlaceOrder = async () => {
    if (!clientSelectedCompany?.id || !user || cart.length === 0) return;
    setIsOrdering(true);

    try {
      const orderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
      
      const items = cart.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.specialOffer?.isActive ? item.product.specialOffer.price : item.product.price,
        currency: item.product.currency
      }));

      const totalAmountByCurrency: Record<string, number> = {};
      items.forEach(item => {
        if (!totalAmountByCurrency[item.currency]) {
          totalAmountByCurrency[item.currency] = 0;
        }
        totalAmountByCurrency[item.currency] += item.price * item.quantity;
      });

      // Find if this user already has a linked CRM customer ID for this company
      let existingLinkedCrmCustomerId = null;
      let existingCustomerId = user.uid;
      try {
        const { getDocs } = await import('firebase/firestore');
        const qOrders = query(
          collection(db, 'orders'),
          where('createdBy', '==', user.uid)
        );
        const prevOrdersSnap = await getDocs(qOrders);
        const linkedOrder = prevOrdersSnap.docs.find(d => {
          const data = d.data();
          return data.companyId === clientSelectedCompany.id && !data.isDeleted && data.linkedCrmCustomerId;
        });
        if (linkedOrder) {
          existingLinkedCrmCustomerId = linkedOrder.data().linkedCrmCustomerId;
          existingCustomerId = existingLinkedCrmCustomerId;
        }
      } catch (err) {
        console.error('Error fetching past orders for linking:', err);
      }

      await setDoc(doc(db, 'orders', orderId), {
        companyId: clientSelectedCompany.id,
        customerId: existingCustomerId, // Use linked CRM ID if known
        ...(existingLinkedCrmCustomerId && { linkedCrmCustomerId: existingLinkedCrmCustomerId }),
        clientUid: user.uid,
        customerName: profile?.storeName || profile?.displayName || 'عميل',
        customerPhone: profile?.phone || '',
        customerAddress: profile?.address || 'طلب عبر التطبيق',
        source: 'customer',
        items: items,
        totalAmountByCurrency: totalAmountByCurrency,
        status: orderStages.length > 0 ? orderStages[0].name : 'pending', // Usually the first stage
        invoiceType: invoiceType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByName: profile?.displayName || user.displayName || 'عميل',
        updatedBy: user.uid,
        isDeleted: false
      });

      const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
      await setDoc(doc(db, 'notifications', notifId), {
        companyId: clientSelectedCompany.id,
        title: 'طلب جديد من عميل',
        message: `تم تسجيل طلب جديد رقم #${orderId.substring(0, 6)} من قِبل العميل المباشر ${profile?.displayName || 'مجهول'}`,
        type: 'client_order',
        orderId: orderId,
        readBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => console.error("Failed to create notification", err));

      toast.success('تم إرسال الطلب بنجاح وهو في انتظار التأكيد!');
      setCart([]);
      setIsCheckoutOpen(false);
      if (onNavigate) onNavigate('orders');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      toast.error('فشل إرسال الطلب برجاء المحاولة لاحقاً');
    } finally {
      setIsOrdering(false);
    }
  };

  const getCartQuantity = (displayId: string) => {
    const item = cart.find(item => item.product.displayId === displayId);
    return item ? item.quantity : 0;
  };

  const addToCart = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(item => item.product.displayId === product.displayId);
      if (existing) {
        return prev.map(item => item.product.displayId === product.displayId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (displayId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      return prev.map(item => {
        if (item.product.displayId === displayId) {
          const newQ = item.quantity + delta;
          if (newQ < 1) return item; 
          return { ...item, quantity: newQ };
        }
        return item;
      });
    });
  };

  const removeFromCart = (displayId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => prev.filter(item => item.product.displayId !== displayId));
  };

  const activeCategoriesList = useMemo(() => {
    const usedCatIds = new Set(products.map(p => p.categoryId).filter(Boolean));
    return [{ id: 'all', name: 'الكل' }, ...categories.filter(c => usedCatIds.has(c.id))];
  }, [products, categories]);

  const filteredProducts = products.flatMap(product => {
    const catName = categories.find(c => c.id === product.categoryId)?.name || '';
    const brandName = brands.find(b => b.id === product.brandId)?.name || '';

    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          brandName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || product.categoryId === activeCategory;
    
    if (!matchesSearch || !matchesCategory) return [];

    const entries = [];
    
    // Add regular product entry
    entries.push({ ...product, isOfferEntry: false, displayId: product.id });

    // Add special offer entry if active
    if (product.specialOffer?.isActive) {
      entries.push({ ...product, isOfferEntry: true, displayId: `${product.id}_offer` });
    }
    
    return entries;
  });

  const toggleFavorite = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const isFav = profile?.favoriteProductIds?.includes(product.id);
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        favoriteProductIds: isFav ? arrayRemove(product.id) : arrayUnion(product.id)
      });
      toast.success(isFav ? 'تم الإزالة من المفضلة' : 'تمت الإضافة للمفضلة');
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group cart totals by currency for display
  const cartTotalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    cart.forEach(item => {
      const price = item.product.specialOffer?.isActive ? item.product.specialOffer.price : item.product.price;
      const currency = item.product.currency || 'SAR';
      if (!totals[currency]) totals[currency] = 0;
      totals[currency] += price * item.quantity;
    });
    return totals;
  }, [cart]);

  if (!clientSelectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">الرجاء اختيار شركة أولاً</h2>
        <p className="text-gray-500 mb-6">يجب اختيار شركة من الواجهة الرئيسية لتتمكن من تصفح المنتجات وطلبها.</p>
        <Button onClick={() => onNavigate && onNavigate('home')} className="bg-green-600 hover:bg-green-700">
          العودة للشركات
        </Button>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-600" /></div>;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{clientSelectedCompany.name} - المنتجات</h2>
          <Button variant="link" onClick={() => setShowCompanyInfo(true)} className="px-0 h-auto text-blue-600 font-bold flex items-center gap-1 mt-1">
            <Info className="w-4 h-4" /> معلومات الشركة وسياستها
          </Button>
        </div>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
          {products.length} منتج
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input 
          placeholder="بحث عن منتج..." 
          className="pl-4 pr-10 h-12 rounded-xl bg-white border-gray-200"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {activeCategoriesList.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", 
              activeCategory === cat.id ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredProducts.map(product => {
          const qty = getCartQuantity(product.displayId);
          const isOffer = product.isOfferEntry;
          
          return (
          <div key={product.displayId} onClick={() => setSelectedProduct(product)} className={`bg-white rounded-xl p-3 shadow-sm border ${qty > 0 ? 'border-green-400 bg-green-50/10' : 'border-gray-100'} flex flex-col cursor-pointer hover:border-green-300 transition-colors ${product.inStock === false ? 'opacity-70' : ''}`}>
            <div className="w-full aspect-square rounded-lg bg-green-50 flex items-center justify-center mb-3 overflow-hidden relative">
              <button 
                onClick={(e) => toggleFavorite(product, e)}
                className="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 rounded-full hover:scale-110 transition-transform shadow-sm"
              >
                <Heart className={cn("w-5 h-5", profile?.favoriteProductIds?.includes(product.id) ? "fill-red-500 text-red-500" : "text-gray-400")} />
              </button>
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-green-300" />
              )}
              {isOffer && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  عرض خاص
                </div>
              )}
              {product.inStock === false && (
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                   <span className="bg-red-600 text-white font-bold px-3 py-1 rounded-full text-xs">نفدت الكمية</span>
                 </div>
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">{categories.find(c => c.id === product.categoryId)?.name || 'بدون تصنيف'}</p>
              <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2 line-clamp-2">{product.name} {isOffer ? '(عرض)' : ''}</h3>
              
              {isOffer && product.specialOffer?.bonus && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mb-2 w-fit">
                  <Gift className="w-3 h-3" />
                  بونص: {product.specialOffer.bonus}
                </div>
              )}
              {!isOffer && product.bonus && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mb-2 w-fit">
                  <Gift className="w-3 h-3" />
                  {product.bonus}
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-2 border-t border-gray-50">
              {isOffer ? (
                <div className="mb-2">
                  <p className="font-bold text-red-600 text-lg">
                    {product.specialOffer.price} <span className="text-[10px] font-normal text-gray-500">{product.currency} / {product.unit || 'حبة'}</span>
                  </p>
                  <p className="text-xs line-through text-gray-400">{product.price} {product.currency}</p>
                </div>
              ) : (
                <p className="font-bold text-green-700 text-lg mb-2">
                  {product.price} <span className="text-xs font-normal text-gray-500">{product.currency} / {product.unit || 'حبة'}</span>
                </p>
              )}
              
              {qty > 0 ? (
                <div className="flex items-center justify-between bg-green-50 rounded-lg p-1" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={(e) => qty === 1 ? removeFromCart(product.displayId, e) : updateQuantity(product.displayId, -1, e)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-green-700 rounded-md shadow-sm hover:bg-green-100"
                  >
                    {qty === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <input 
                    type="number"
                    min="1"
                    value={qty}
                    onClick={e => e.stopPropagation()}
                    onChange={(e) => {
                       const val = parseInt(e.target.value);
                       if (!isNaN(val) && val > 0) {
                         setCart(prev => {
                           const exists = prev.find(i => i.product.displayId === product.displayId);
                           if (exists) return prev.map(i => i.product.displayId === product.displayId ? { ...i, quantity: val } : i);
                           return [...prev, { product, quantity: val }];
                         });
                       }
                    }}
                    className="font-bold text-green-800 w-10 text-center bg-transparent outline-none"
                  />
                  <button 
                    onClick={(e) => updateQuantity(product.displayId, 1, e)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-green-700 rounded-md shadow-sm hover:bg-green-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-9 text-xs rounded-lg disabled:opacity-50" 
                  onClick={(e) => addToCart(product, e)}
                  disabled={product.inStock === false}
                >
                  <ShoppingCart className="w-3 h-3 ml-1" />
                  {product.inStock === false ? 'غير متوفر' : 'أضف للسلة'}
                </Button>
              )}
            </div>
          </div>
        )})}
      </div>
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          لا توجد منتجات متاحة حالياً
        </div>
      )}

      {/* Sticky Cart Toolbar */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-0 right-0 md:left-auto md:right-auto md:w-[calc(100%-16rem)] max-w-7xl mx-auto px-4 z-40 pointer-events-none">
          <div className="bg-green-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between pointer-events-auto">
             <div className="flex items-center gap-3">
               <div className="relative">
                 <ShoppingCart className="w-6 h-6" />
                 <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">
                   {cartTotalItems}
                 </span>
               </div>
               <div>
                  <p className="font-bold text-sm">إجمالي السلة</p>
                  <p className="text-xs text-green-100">
                    {Object.entries(cartTotalsByCurrency).map(([curr, total]) => (
                      <span key={curr} className="ml-2">{total} {curr}</span>
                    ))}
                  </p>
               </div>
             </div>
             
             <Button 
               variant="secondary" 
               className="bg-white text-green-700 hover:bg-green-50 font-bold px-6"
               onClick={() => setIsCheckoutOpen(true)}
             >
                متابعة الطلب
             </Button>
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>مراجعة الطلب</DialogTitle>
            <DialogDescription>
              الرجاء مراجعة الأصناف المحددة قبل إرسال الطلب. الطلب سيكون في انتظار التأكيد من قبل الشركة.
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-3">
              {cart.map((item) => {
                const price = item.product.specialOffer?.isActive ? item.product.specialOffer.price : item.product.price;
                return (
                  <div key={item.product.id} className="flex gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <div className="w-16 h-16 bg-white rounded-lg border border-gray-100 flex items-center justify-center shrink-0">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{item.product.name}</h4>
                      <p className="text-xs text-gray-500 mb-2">{price} {item.product.currency}</p>
                      
                      <div className="flex items-center gap-3 bg-white w-fit rounded-lg border border-gray-200">
                        <button 
                          onClick={() => item.quantity === 1 ? removeFromCart(item.product.id) : updateQuantity(item.product.id, -1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-r-lg"
                        >
                          {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                        </button>
                        <input 
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                             const val = parseInt(e.target.value);
                             if (!isNaN(val) && val > 0) {
                               setCart(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: val } : i));
                             }
                          }}
                          className="font-bold text-sm w-10 text-center outline-none bg-transparent"
                        />
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-l-lg"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-sm text-green-700 whitespace-nowrap">
                      {price * item.quantity} {item.product.currency}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-xl mt-4">
             <h4 className="font-bold text-gray-900 mb-3">نوع الدفع / الفاتورة</h4>
             <div className="flex gap-2 mb-4">
               <Button variant="outline" className={cn("flex-1", invoiceType === 'cash' ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600" : "bg-white border-gray-200")} onClick={() => setInvoiceType('cash')}>
                 نقدي
               </Button>
               {allowedInvoiceTypes.pending && (
                 <Button variant="outline" className={cn("flex-1", invoiceType === 'pending_cash' ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600" : "bg-white border-gray-200")} onClick={() => setInvoiceType('pending_cash')}>
                   نقدي معلق
                 </Button>
               )}
               {allowedInvoiceTypes.credit && (
                 <Button variant="outline" className={cn("flex-1", invoiceType === 'credit' ? "bg-blue-50 border-blue-600 text-blue-700 ring-1 ring-blue-600" : "bg-white border-gray-200")} onClick={() => setInvoiceType('credit')}>
                   آجل
                 </Button>
               )}
             </div>
             {!allowedInvoiceTypes.pending && !allowedInvoiceTypes.credit && (
               <p className="text-xs text-red-600 font-bold mb-2 break-words">بعض الأصناف في السلة تشترط الدفع النقدي فقط.</p>
             )}
             {!allowedInvoiceTypes.credit && allowedInvoiceTypes.pending && (
               <p className="text-xs text-orange-600 font-bold mb-2 break-words">بعض الأصناف في السلة لا تسمح بالدفع الآجل.</p>
             )}
             <div className="h-px bg-green-200 my-3"></div>
             <h4 className="font-bold text-gray-900 mb-2">الإجمالي</h4>
             <div className="space-y-1">
               {Object.entries(cartTotalsByCurrency).map(([curr, total]) => (
                <div key={curr} className="flex justify-between items-center font-bold text-green-800 text-lg">
                  <span>{curr}</span>
                  <span>{total}</span>
                </div>
               ))}
             </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} className="w-full sm:w-auto">
              تعديل السلة
            </Button>
            {(!profile?.phone || !profile?.storeName) ? (
              <Button 
                className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto text-white" 
                onClick={() => { setIsCheckoutOpen(false); onNavigate && onNavigate('profile'); }}
              >
                أكمل بيانات الحساب أولاً
              </Button>
            ) : (
              <Button 
                className="bg-green-600 w-full sm:w-auto hover:bg-green-700" 
                onClick={handlePlaceOrder}
                disabled={isOrdering || cart.length === 0}
              >
                {isOrdering ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                تأكيد وإرسال الطلب
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProductDetailsDialog 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        categories={categories}
        brands={brands}
      />

      <Dialog open={showCompanyInfo} onOpenChange={setShowCompanyInfo}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
               {clientSelectedCompany.logoUrl ? <img src={clientSelectedCompany.logoUrl} className="w-8 h-8 rounded" alt="logo" /> : <Building2 className="w-6 h-6 text-green-600" />}
               معلومات الشركة وسياساتها
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-1">اسم الشركة</p>
              <p className="font-medium text-gray-900">{clientSelectedCompany.name}</p>
            </div>
            {clientSelectedCompany.aboutUs && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-1"><AlignLeft className="w-4 h-4"/> نبذة عن الشركة</p>
                <p className="text-gray-800 text-sm whitespace-pre-wrap p-3 bg-gray-50 rounded-lg">{clientSelectedCompany.aboutUs}</p>
              </div>
            )}
            {clientSelectedCompany.notes && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-1"><Info className="w-4 h-4"/> سياسات الشركة والملاحظات</p>
                <p className="text-gray-800 text-sm whitespace-pre-wrap p-3 bg-blue-50/50 rounded-lg border border-blue-100">{clientSelectedCompany.notes}</p>
              </div>
            )}
            {clientSelectedCompany.workingHours && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-4 h-4"/> أوقات العمل</p>
                <p className="text-gray-800 text-sm">{clientSelectedCompany.workingHours}</p>
              </div>
            )}
            {clientSelectedCompany.address && (
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-1"><MapPin className="w-4 h-4"/> العنوان</p>
                <p className="text-gray-800 text-sm">{clientSelectedCompany.address}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowCompanyInfo(false)} className="bg-green-600 hover:bg-green-700 text-white w-full">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

