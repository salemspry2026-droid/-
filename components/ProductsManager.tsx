'use client';

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Plus, Sparkles, Package, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, cn, hasPermission } from '@/lib/utils';
import { GoogleGenAI } from '@google/genai';
import { ProductFormDialog } from './ProductFormDialog';

import { ProductDetailsDialog } from './ProductDetailsDialog';

export function ProductsManager() {
  const { profile, user } = useStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!profile?.companyId) return;

    const qProducts = query(collection(db, 'products'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qCats = query(collection(db, 'productCategories'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));
    const qBrands = query(collection(db, 'productBrands'), where('companyId', '==', profile.companyId), where('isDeleted', '==', false));

    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    const unsubCats = onSnapshot(qCats, (snap) => setCategories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const unsubBrands = onSnapshot(qBrands, (snap) => setBrands(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    return () => { unsubProducts(); unsubCats(); unsubBrands(); };
  }, [profile?.companyId]);

  const activeCategoriesList = useMemo(() => {
    // Only show categories that have products, plus 'all'
    const usedCatIds = new Set(products.map(p => p.categoryId).filter(Boolean));
    return [{ id: 'all', name: 'الكل' }, ...categories.filter(c => usedCatIds.has(c.id))];
  }, [products, categories]);

  const filteredProducts = products.filter(product => {
    const catName = categories.find(c => c.id === product.categoryId)?.name || '';
    const brandName = brands.find(b => b.id === product.brandId)?.name || '';
    
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          brandName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategoryId === 'all' || product.categoryId === activeCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">الأصناف</h2>
        <div className="flex items-center gap-2">
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold">
            {products.length} صنف
          </span>
          {hasPermission(profile, 'products', 'create') && (
            <button type="button" onClick={() => setIsFormOpen(true)} className="inline-flex items-center justify-center shrink-0 w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer">
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input 
          placeholder="بحث بالاسم أو العلامة التجارية..." 
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
            onClick={() => setActiveCategoryId(cat.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors", 
              activeCategoryId === cat.id ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map(product => (
          <div key={product.id} onClick={() => setSelectedProduct(product)} className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex gap-4 cursor-pointer hover:border-blue-300 transition-colors ${product.inStock === false ? 'opacity-75' : ''}`}>
              <div className="w-20 h-20 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden relative p-1">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain pointer-events-none" />
              ) : (
                <Package className="w-8 h-8 text-blue-300" />
              )}
              {product.specialOffer?.isActive && (
                <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
                  عرض
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight">{product.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {categories.find(c => c.id === product.categoryId)?.name || 'بدون تصنيف'}
                    {product.brandId && ` • ${brands.find(b => b.id === product.brandId)?.name || ''}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                    {product.isActive ? 'مفعل' : 'غير مفعل'}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap", product.inStock !== false ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600")}>
                    {product.inStock !== false ? 'في المخزون' : 'نفدت الكمية'}
                  </span>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between items-end flex-wrap gap-2">
                {product.specialOffer?.isActive ? (
                  <div>
                    <p className="font-bold text-red-600 text-lg">
                      {product.specialOffer.price} <span className="text-sm font-normal text-gray-500">{product.currency} / {product.unit || 'حبة'}</span>
                    </p>
                    <p className="text-xs line-through text-gray-400">{product.price} {product.currency}</p>
                  </div>
                ) : (
                  <p className="font-bold text-blue-900 text-lg">
                    {product.price} <span className="text-sm font-normal text-gray-500">{product.currency} / {product.unit || 'حبة'}</span>
                  </p>
                )}
                
                {product.specialOffer?.isActive && product.specialOffer.bonus && (
                  <div className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                    <Gift className="w-3 h-3" />
                    بونص مميز: {product.specialOffer.bonus}
                  </div>
                )}
                {!product.specialOffer?.isActive && product.bonusType === 'fixed' && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                    <Gift className="w-3 h-3" />
                    بونص {product.bonusFixedPercent}%
                  </div>
                )}
                {!product.specialOffer?.isActive && product.bonusType === 'tiered' && product.bonusTiers?.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded w-fit">
                    <Gift className="w-3 h-3" />
                    بونص شرائح
                  </div>
                )}
                {!product.specialOffer?.isActive && !product.bonusType && product.bonus && (
                  <div className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                    <Gift className="w-3 h-3" />
                    بونص خاص: {product.bonus}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 font-bold bg-white rounded-xl border border-gray-100">
            لا توجد أصناف مطابقة للبحث &quot;{searchQuery}&quot;
          </div>
        )}
      </div>

      <ProductDetailsDialog 
        product={selectedProduct} 
        isOpen={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)}
        onEdit={(p) => {
            setSelectedProduct(null);
            setEditingProduct(p);
        }} 
        categories={categories}
        brands={brands}
      />

      <ProductFormDialog 
         productToEdit={editingProduct} 
         isOpen={!!editingProduct || isFormOpen} 
         onOpenChange={(v) => {
             if (!v) {
                setEditingProduct(null);
                setIsFormOpen(false);
             }
         }} 
      />
    </div>
  );
}
