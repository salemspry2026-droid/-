'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ShoppingCart, Search, Package, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn } from '@/lib/utils';
import { ProductDetailsDialog } from './ProductDetailsDialog';

export function ClientProducts({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { profile, user, clientSelectedCompany } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    if (!clientSelectedCompany?.id) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'products'), 
      where('companyId', '==', clientSelectedCompany.id),
      where('isActive', '==', true),
      where('isDeleted', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prods);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    return () => unsubscribe();
  }, [clientSelectedCompany?.id]);

  const handlePlaceOrder = async (product: any) => {
    if (!clientSelectedCompany?.id || !user) return;
    setOrderingId(product.id);

    try {
      const orderId = `ord_${Math.random().toString(36).substring(2, 11)}`;
      
      await setDoc(doc(db, 'orders', orderId), {
        companyId: clientSelectedCompany.id,
        customerId: user.uid, // For self-service, user is the customer
        customerName: profile?.displayName || 'عميل',
        customerAddress: 'طلب من التطبيق',
        items: [{
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          currency: product.currency
        }],
        totalAmountByCurrency: {
          [product.currency]: product.price
        },
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`));

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

      toast.success('تم إرسال الطلب بنجاح!');
      if (onNavigate) onNavigate('orders');
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال الطلب');
    } finally {
      setOrderingId(null);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
        <h2 className="text-2xl font-bold text-gray-900">المنتجات</h2>
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
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", 
              activeCategory === cat ? "bg-green-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            )}
          >
            {cat === 'all' ? 'الكل' : cat}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="grid grid-cols-2 gap-3">
        {filteredProducts.map(product => (
          <div key={product.id} onClick={() => setSelectedProduct(product)} className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col cursor-pointer hover:border-green-300 transition-colors ${product.inStock === false ? 'opacity-70' : ''}`}>
            <div className="w-full aspect-square rounded-lg bg-green-50 flex items-center justify-center mb-3 overflow-hidden relative">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-10 h-10 text-green-300" />
              )}
              {product.specialOffer?.isActive && (
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
              <p className="text-xs text-gray-500 mb-1">{product.category || 'بدون تصنيف'}</p>
              <h3 className="font-bold text-gray-900 text-sm leading-tight mb-2 line-clamp-2">{product.name}</h3>
              
              {product.specialOffer?.isActive && product.specialOffer.bonus && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mb-2 w-fit">
                  <Gift className="w-3 h-3" />
                  بونص العرض: {product.specialOffer.bonus}
                </div>
              )}
              {!product.specialOffer?.isActive && product.bonus && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded mb-2 w-fit">
                  <Gift className="w-3 h-3" />
                  {product.bonus}
                </div>
              )}
            </div>
            
            <div className="mt-auto pt-2 border-t border-gray-50">
              {product.specialOffer?.isActive ? (
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
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white h-9 text-xs rounded-lg disabled:opacity-50" 
                onClick={(e) => { e.stopPropagation(); handlePlaceOrder(product); }}
                disabled={orderingId === product.id || product.inStock === false}
              >
                {orderingId === product.id ? <Loader2 className="w-3 h-3 ml-1 animate-spin" /> : <ShoppingCart className="w-3 h-3 ml-1" />}
                {product.inStock === false ? 'غير متوفر' : 'طلب الآن'}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          لا توجد منتجات متاحة حالياً
        </div>
      )}

      <ProductDetailsDialog 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
    </div>
  );
}
