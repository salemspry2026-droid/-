'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, updateDoc, arrayRemove } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingCart, Heart, Package, Trash2, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

interface CartItem {
  product: any;
  quantity: number;
}

export function ClientFavorites({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile, user } = useStore();
  const [favoriteProducts, setFavoriteProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile || !profile.favoriteProductIds || profile.favoriteProductIds.length === 0) {
      setFavoriteProducts([]);
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      try {
        const productIds = profile.favoriteProductIds as string[];
        
        // Fetch products in chunks of 30 due to Firestore 'in' limits
        const chunks = [];
        for (let i = 0; i < productIds.length; i += 30) {
          chunks.push(productIds.slice(i, i + 30));
        }

        const allProducts = [];
        for (const chunk of chunks) {
          const q = query(
            collection(db, 'products'),
            where('__name__', 'in', chunk),
            where('isDeleted', '==', false)
          );
          const snap = await getDocs(q);
          allProducts.push(...snap.docs.map(d => ({ id: d.id, displayId: d.id, ...d.data() })));
        }

        setFavoriteProducts(allProducts);

        // Fetch company info for these products
        const companyIdsArr = Array.from(new Set(allProducts.map((p: any) => p.companyId).filter(Boolean)));
        const compChunks = [];
        for (let i = 0; i < companyIdsArr.length; i += 30) {
          compChunks.push(companyIdsArr.slice(i, i + 30));
        }
        
        const allComps = [];
        for (const chunk of compChunks) {
          const qc = query(
            collection(db, 'companies'),
            where('__name__', 'in', chunk)
          );
          const snapC = await getDocs(qc);
          allComps.push(...snapC.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        setCompanies(allComps);

      } catch (err) {
        console.error('Failed to fetch favorites', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [profile?.favoriteProductIds]);

  const handleRemoveFavorite = async (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await updateDoc(doc(db, 'userProfiles', user.uid), {
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
        favoriteProductIds: arrayRemove(product.id)
      });
      setFavoriteProducts(prev => prev.filter(p => p.id !== product.id));
      toast.success('تم الإزالة من المفضلة');
    } catch (err) {
      toast.error('حدث خطأ');
    }
  };

  const addToCart = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === id) {
          const newQ = item.quantity + delta;
          if (newQ < 1) return item; 
          return { ...item, quantity: newQ };
        }
        return item;
      });
    });
  };

  const removeFromCart = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => prev.filter(item => item.product.id !== id));
  };

  const getCartQuantity = (id: string) => {
    const item = cart.find(item => item.product.id === id);
    return item ? item.quantity : 0;
  };

  const placeGroupedOrders = async () => {
    if (!user || cart.length === 0) return;
    setIsOrdering(true);
    
    // Group cart by companyId
    const groups: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const cid = item.product.companyId;
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(item);
    });

    try {
      const { getDocs } = await import('firebase/firestore');
      const qOrders = query(
        collection(db, 'orders'),
        where('createdBy', '==', user.uid)
      );
      const prevOrdersSnap = await getDocs(qOrders);
      const pastOrders = prevOrdersSnap.docs.map(d => d.data());

      for (const [companyId, itemsGroup] of Object.entries(groups)) {
        const orderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
        
        let existingLinkedCrmCustomerId = null;
        let existingCustomerId = user.uid;
        const linkedOrder = pastOrders.find(o => o.companyId === companyId && !o.isDeleted && o.linkedCrmCustomerId);
        if (linkedOrder) {
          existingLinkedCrmCustomerId = linkedOrder.linkedCrmCustomerId;
          existingCustomerId = existingLinkedCrmCustomerId;
        }

        const orderItems = itemsGroup.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.specialOffer?.isActive ? item.product.specialOffer.price : item.product.price,
          currency: item.product.currency
        }));

        const totalAmountByCurrency: Record<string, number> = {};
        orderItems.forEach(item => {
          if (!totalAmountByCurrency[item.currency]) totalAmountByCurrency[item.currency] = 0;
          totalAmountByCurrency[item.currency] += item.price * item.quantity;
        });

        // Determine restrictive invoiceType policy for the group
        let finalInvoiceType = 'cash'; // default fallback
        
        // Find if any product is cash_only
        const hasCashOnly = itemsGroup.some(item => item.product.invoiceTypeRestriction === 'cash_only');
        if (!hasCashOnly) {
          const hasCashOrPending = itemsGroup.some(item => item.product.invoiceTypeRestriction === 'cash_or_pending');
          if (hasCashOrPending) finalInvoiceType = 'pending_cash'; // or something safe. Actually 'cash' is always safe.
        }

        await setDoc(doc(db, 'orders', orderId), {
          companyId: companyId,
          customerId: existingCustomerId,
          ...(existingLinkedCrmCustomerId && { linkedCrmCustomerId: existingLinkedCrmCustomerId }),
          clientUid: user.uid,
          customerName: profile?.storeName || profile?.displayName || 'عميل',
          customerPhone: profile?.phone || '',
          customerAddress: profile?.address || 'طلب عبر التطبيق',
          source: 'customer',
          items: orderItems,
          totalAmountByCurrency: totalAmountByCurrency,
          status: 'pending', 
          invoiceType: finalInvoiceType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          createdByName: profile?.displayName || user.displayName || 'عميل',
          updatedBy: user.uid,
          isDeleted: false
        });

        const notifId = `notif_${Math.random().toString(36).substring(2, 11)}`;
        await setDoc(doc(db, 'notifications', notifId), {
          companyId: companyId,
          title: 'طلب جديد من عميل',
          message: `تم تسجيل طلب جديد رقم #${orderId.substring(0, 6)} من قِبل العميل المباشر`,
          type: 'client_order',
          orderId: orderId,
          readBy: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          updatedBy: user.uid,
          isDeleted: false
        }).catch(() => {});
      }

      toast.success(`تم إرسال ${Object.keys(groups).length} طلبات بنجاح للمصادر!`);
      setCart([]);
      setIsCheckoutOpen(false);
      if (onNavigate) onNavigate('orders');

    } catch (err) {
      console.error(err);
      toast.error('فشل تقديم الطلبات.');
    } finally {
      setIsOrdering(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-green-600" /></div>;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          المفضلة
        </h2>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">ليس لديك أي منتجات في المفضلة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {favoriteProducts.map(product => {
            const qty = getCartQuantity(product.id);
            const comp = companies.find(c => c.id === product.companyId);
            return (
              <div key={product.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col relative">
                <button 
                  onClick={(e) => handleRemoveFavorite(product, e)}
                  className="absolute top-2 left-2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 rounded-full text-red-500 hover:scale-110 transition-transform shadow-sm"
                >
                  <Heart className="w-5 h-5 fill-red-500" />
                </button>

                <div className="w-full aspect-square rounded-lg bg-gray-50 flex items-center justify-center mb-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-bold mb-1 truncate">{comp?.name || 'شركة'}</p>
                  <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2 line-clamp-2">{product.name}</h3>
                </div>
                
                <div className="mt-auto pt-2 border-t border-gray-50">
                  <p className="font-bold text-green-700 text-lg mb-2">
                    {product.specialOffer?.isActive ? product.specialOffer.price : product.price} <span className="text-xs font-normal text-gray-500">{product.currency}</span>
                  </p>
                  
                  {qty > 0 ? (
                    <div className="flex items-center justify-between bg-green-50 rounded-lg p-1">
                      <button onClick={(e) => qty === 1 ? removeFromCart(product.id, e) : updateQuantity(product.id, -1, e)} className="w-8 h-8 flex items-center justify-center bg-white text-green-700 rounded-md">
                        {qty === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                      </button>
                      <span className="font-bold">{qty}</span>
                      <button onClick={(e) => updateQuantity(product.id, 1, e)} className="w-8 h-8 flex items-center justify-center bg-white text-green-700 rounded-md">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <Button onClick={(e) => addToCart(product, e)} disabled={product.inStock === false} className="w-full bg-green-600 hover:bg-green-700 text-xs">
                      {product.inStock === false ? 'غير متوفر' : 'أضف للسلة'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-16 md:bottom-6 left-0 right-0 md:left-auto md:right-auto md:w-[calc(100%-16rem)] max-w-7xl mx-auto px-4 z-40 p-4">
          <Button onClick={() => setIsCheckoutOpen(true)} className="w-full bg-green-600 hover:bg-green-700 shadow-xl h-14 text-lg">
            <ShoppingCart className="w-5 h-5 ml-2" /> إتمام الطلب ({cart.length})
          </Button>
        </div>
      )}

      {/* Structured Checkout that splits by company */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
             <DialogTitle>تأكيد الطلبات المجمعة</DialogTitle>
             <DialogDescription>سيتم إرسال طلبات منفصلة لكل شركة حسب المنتجات.</DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {Object.entries(cart.reduce((g: any, item) => {
              const c = item.product.companyId;
              if(!g[c]) g[c] = [];
              g[c].push(item);
              return g;
            }, {})).map(([cId, items]: any) => {
               const cName = companies.find(c => c.id === cId)?.name || 'غير معروف';
               return (
                 <div key={cId} className="border border-green-200 rounded-xl overflow-hidden">
                   <div className="bg-green-50 p-2 font-bold text-green-800">لشـركـة: {cName}</div>
                   <div className="p-3 space-y-2 bg-white">
                     {items.map((i: any) => (
                       <div key={i.product.id} className="flex justify-between text-sm items-center border-b border-gray-50 pb-2">
                         <span>{i.quantity}x {i.product.name}</span>
                         <span className="font-bold">{(i.product.specialOffer?.isActive ? i.product.specialOffer.price : i.product.price) * i.quantity} {i.product.currency}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               );
            })}
          </div>

          <DialogFooter>
             <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>إلغاء</Button>
             <Button className="bg-green-600 hover:bg-green-700" onClick={placeGroupedOrders} disabled={isOrdering}>
               {isOrdering ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null} تأكيد وإرسال
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
