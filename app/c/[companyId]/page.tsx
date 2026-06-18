'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import { Loader2, ArrowRight, UserPlus, Package, MapPin, Phone, Mail, BuildingIcon, X, Search, FileText, CheckCircle, Share2, ShieldCheck, Truck, Percent, Headphones, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { AppLogoText } from '@/components/AppLogo';
import { cn } from '@/lib/utils';

export default function PublicCompanyPage() {
  const { companyId } = useParams();
  const router = useRouter();
  const { user, profile, isProfileLoaded, setClientSelectedCompany, setActiveTab } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeBrand, setActiveBrand] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId || typeof companyId !== 'string') return;
      
      try {
        const companyRef = doc(db, 'companies', companyId);
        const companySnap = await getDoc(companyRef);
        
        if (!companySnap.exists()) {
          setError('لم يتم العثور على الشركة المطلوبة.');
          setLoading(false);
          return;
        }

        const companyData: any = { id: companySnap.id, ...companySnap.data() };
        if (companyData.isDeleted) {
           setError('تم حذف هذه الشركة.');
           setLoading(false);
           return;
        }
        
        setCompany(companyData);
      } catch (err: any) {
        console.error("Error fetching company info:", err);
        setError('حدث خطأ أثناء تحميل بيانات الشركة: ' + err.message);
        setLoading(false);
        return;
      }

      try {
        const productsRef = collection(db, 'products');
        const qProducts = query(productsRef, where('companyId', '==', companyId));
        const productsSnap = await getDocs(qProducts);
        const productsData = productsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(p => !p.isDeleted && p.isActive !== false);
        setProducts(productsData);
      } catch (err: any) {
        console.warn("Product fetch error", err);
      }

      try {
        const categoriesRef = collection(db, 'productCategories');
        const qCategories = query(categoriesRef, where('companyId', '==', companyId));
        const categoriesSnap = await getDocs(qCategories);
        const categoriesData = categoriesSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(c => !c.isDeleted);
        setCategories(categoriesData);
      } catch (err: any) {
         console.warn("Category fetch error", err);
      }

      try {
        // Fetch brands
        const brandsRef = collection(db, 'productBrands');
        const qBrands = query(brandsRef, where('companyId', '==', companyId));
        const brandsSnap = await getDocs(qBrands);
        const brandsData = brandsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(b => !b.isDeleted);
        setBrands(brandsData);
      } catch (err: any) {
        console.warn("Brand fetch error", err);
      }

      setLoading(false);
    };

    fetchCompanyData();
  }, [companyId]);

  useEffect(() => {
    // If a logged in user hits this page, redirect them.
    if (user && isProfileLoaded && profile && company) {
      setClientSelectedCompany(company);
      setActiveTab('products');
      router.replace('/');
    }
  }, [user, isProfileLoaded, profile, company, router, setClientSelectedCompany, setActiveTab]);

  const handleRegisterClick = () => {
    router.push('/');
  };

  const allCategories = useMemo(() => {
    const cats = new Map();
    categories.forEach(c => cats.set(c.id, { id: c.id, name: c.name }));
    products.forEach(p => {
      if (p.categoryId && typeof p.categoryId === 'string' && !cats.has(p.categoryId)) {
        cats.set(p.categoryId, { id: p.categoryId, name: p.categoryId });
      }
      if (p.category && typeof p.category === 'string' && !cats.has(p.category)) {
        cats.set(p.category, { id: p.category, name: p.category });
      }
    });

    const usedCatIds = new Set(products.flatMap(p => [p.categoryId, p.category]).filter(Boolean));
    return Array.from(cats.values()).filter((c: any) => usedCatIds.has(c.id));
  }, [categories, products]);

  const allBrands = useMemo(() => {
    const bMap = new Map();
    brands.forEach(b => bMap.set(b.id, { id: b.id, name: b.name }));
    products.forEach(p => {
      if (p.brandId && typeof p.brandId === 'string' && !bMap.has(p.brandId)) {
        bMap.set(p.brandId, { id: p.brandId, name: p.brandId });
      }
      if (p.brand && typeof p.brand === 'string' && !bMap.has(p.brand)) {
         bMap.set(p.brand, { id: p.brand, name: p.brand });
      }
    });

    const usedBrandIds = new Set(products.flatMap(p => [p.brandId, p.brand]).filter(Boolean));
    return Array.from(bMap.values()).filter((b: any) => usedBrandIds.has(b.id));
  }, [brands, products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const catName = categories.find(c => c.id === p.categoryId)?.name || (p.category && !p.category.startsWith('cat_') && p.category !== 'none' ? p.category : '');
      const brandName = brands.find(b => b.id === p.brandId)?.name || (p.brand && !p.brand.startsWith('brand_') && p.brand !== 'none' ? p.brand : '');
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.scientificName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            brandName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory || p.category === activeCategory;
      const matchesBrand = activeBrand === 'all' || p.brandId === activeBrand || p.brand === activeBrand;
      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchQuery, activeCategory, activeBrand, categories, brands]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#F0F2F5]" dir="rtl">
        <div className="bg-gradient-to-br from-[#2E0B5B] to-[#4C1D95] pt-10 pb-20 rounded-b-[40px] shadow-lg relative overflow-hidden">
          <div className="container mx-auto max-w-7xl px-4 text-center relative z-10">
             <div className="w-24 h-24 mx-auto bg-white/20 rounded-2xl animate-pulse mb-5 shadow-2xl border-[3px] border-white/10"></div>
             <div className="h-8 bg-white/20 rounded-md w-48 mx-auto mb-2 animate-pulse"></div>
             <div className="h-4 bg-white/20 rounded-md w-32 mx-auto animate-pulse"></div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-2xl shadow-xl p-5 border border-purple-50 flex justify-between gap-4">
             <div className="flex-1 bg-gray-100 rounded-md animate-pulse h-16"></div>
             <div className="flex-1 bg-gray-100 rounded-md animate-pulse h-16"></div>
             <div className="flex-1 bg-gray-100 rounded-md animate-pulse h-16"></div>
          </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 mt-8 space-y-4 relative z-20">
           <div className="h-14 bg-white rounded-2xl animate-pulse shadow-sm"></div>
           <div className="flex gap-2 pb-2">
             <div className="w-20 h-10 bg-gray-200 rounded-full animate-pulse shrink-0"></div>
             <div className="w-24 h-10 bg-gray-200 rounded-full animate-pulse shrink-0"></div>
             <div className="w-32 h-10 bg-gray-200 rounded-full animate-pulse shrink-0"></div>
           </div>
        </div>

        <div className="container mx-auto max-w-7xl px-4 mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-16 relative z-20">
           {[...Array(6)].map((_, i) => (
             <div key={i} className="bg-white rounded-2xl p-4 animate-pulse shadow-sm border border-gray-100 flex gap-4">
                <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0"></div>
                <div className="flex-1 space-y-3 py-2">
                   <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                   <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                   <div className="h-6 bg-gray-200 rounded w-1/2 mt-4"></div>
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F0F2F5] p-4" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <X className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{error}</h1>
          <Button onClick={() => router.push('/')} variant="outline" className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700">
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  if (user && profile) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#F0F2F5]">
        <AppLogoText className="text-2xl mb-4 animate-pulse opacity-50" />
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // --- Render Product Details Sheet (Overlay) ---
  if (selectedProduct) {
    const brandName = brands.find(b => b.id === selectedProduct.brandId)?.name || (selectedProduct.brand && !selectedProduct.brand.startsWith('brand_') && selectedProduct.brand !== 'none' ? selectedProduct.brand : undefined);
    const categoryName = categories.find(c => c.id === selectedProduct.categoryId)?.name || (selectedProduct.category && !selectedProduct.category.startsWith('cat_') && selectedProduct.category !== 'none' ? selectedProduct.category : undefined);
    const isOffer = selectedProduct.specialOffer?.isActive;
    const finalPrice = isOffer ? selectedProduct.specialOffer.price : selectedProduct.price;

    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col print:hidden animate-in fade-in slide-in-from-bottom-4 duration-300" dir="rtl">
        {/* Detail Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-800/10 bg-purple-700 text-white shadow-sm shrink-0">
          <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <ArrowRight className="w-6 h-6" />
          </button>
          <span className="font-bold text-lg">تفاصيل الصنف</span>
          <button onClick={() => {
             if (navigator.share) {
                navigator.share({
                  title: `${company.name} - ${selectedProduct.name}`,
                  url: window.location.href
                }).catch(console.error);
             }
          }} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
  
        <div className="flex-1 overflow-y-auto pb-24">
           {/* Detail Image */}
           <div className="bg-gray-50/50 p-8 flex justify-center relative border-b border-gray-100">
              {selectedProduct.inStock !== false ? (
                 <div className="absolute top-4 right-4 bg-green-50 text-green-700 px-3 py-1 rounded-lg text-xs font-bold border border-green-200 flex items-center gap-1.5 shadow-sm">
                    متوفر <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                 </div>
              ) : (
                 <div className="absolute top-4 right-4 bg-red-50 text-red-700 px-3 py-1 rounded-lg text-xs font-bold border border-red-200 shadow-sm">
                    غير متوفر
                 </div>
              )}
              <div className="w-64 h-64 relative mix-blend-multiply">
                 {selectedProduct.imageUrl ? (
                   <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} fill className="object-contain p-2" unoptimized referrerPolicy="no-referrer" />
                 ) : <Package className="w-32 h-32 text-gray-300 absolute inset-0 m-auto" />}
              </div>
           </div>
           
           <div className="p-6 space-y-6">
              <div>
                 <h1 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{selectedProduct.name}</h1>
                 <p className="text-gray-500 font-medium">{selectedProduct.unit || 'حبة'}</p>
              </div>
  
              <div className="bg-purple-50/50 p-5 rounded-2xl flex items-center justify-between border border-purple-100/50 shadow-sm">
                 <div className="text-purple-900 font-bold">سعر الصنف</div>
                 <div className="flex flex-col items-end">
                   <div className="flex items-baseline gap-1">
                     <span className="text-3xl font-black text-purple-700">{finalPrice.toLocaleString()}</span>
                     <span className="text-sm font-bold text-gray-500">{company.primaryCurrency || 'YER'}</span>
                   </div>
                   {isOffer && selectedProduct.price > finalPrice && (
                     <div className="text-xs text-gray-400 line-through">
                        {selectedProduct.price.toLocaleString()} {company.primaryCurrency || 'YER'}
                     </div>
                   )}
                 </div>
              </div>
  
              {(brandName || categoryName) && (
                <div className="grid grid-cols-2 gap-3">
                   {brandName && (
                     <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="overflow-hidden">
                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">الماركة</div>
                           <div className="font-bold text-gray-900 text-sm truncate">{brandName}</div>
                        </div>
                     </div>
                   )}
                   {categoryName && (
                     <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center gap-3 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="overflow-hidden">
                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">التصنيف</div>
                           <div className="font-bold text-gray-900 text-sm truncate">{categoryName}</div>
                        </div>
                     </div>
                   )}
                </div>
              )}
  
              {selectedProduct.description && (
                <div>
                  <h3 className="font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    وصف الصنف
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    {selectedProduct.description}
                  </p>
                </div>
              )}
  
              {selectedProduct.notes && (
                <div>
                  <h3 className="font-bold text-base text-gray-900 mb-3">ملاحظات</h3>
                  <p className="text-gray-600 leading-relaxed text-sm bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                    {selectedProduct.notes}
                  </p>
                </div>
              )}

              {/* Expiry Dates */}
              {selectedProduct.expiryDates && selectedProduct.expiryDates.length > 0 && (
                <div>
                   <h3 className="font-bold text-base text-gray-900 mb-3 flex items-center gap-2">
                     <CheckCircle className="w-4 h-4 text-purple-600" />
                     تواريخ الصلاحية
                   </h3>
                   <div className="flex flex-wrap gap-2 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      {selectedProduct.expiryDates.map((d: string, i: number) => (
                         <span key={i} className="bg-purple-50 text-purple-800 font-bold px-3 py-1.5 rounded-lg border border-purple-100 shadow-sm" dir="ltr">{d}</span>
                      ))}
                   </div>
                </div>
              )}

              {/* Main Bonus Display */}
              <div className="bg-gradient-to-br from-white to-purple-50/30 p-4 rounded-xl border border-purple-100 shadow-sm">
                 <h3 className="font-bold text-base text-purple-900 mb-3 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-500" />
                    عروض وبونص
                 </h3>
                 
                 {isOffer && (
                    <div className="mb-4 space-y-2 text-sm bg-red-50 p-4 rounded-xl border border-red-100">
                       <h4 className="font-bold text-red-700 border-b border-red-200 pb-2 mb-2">عرض خاص نشط</h4>
                       <div className="flex justify-between">
                          <span className="text-red-900 font-bold">سعر العرض:</span>
                          <span className="text-red-700 font-bold">{selectedProduct.specialOffer.price} {company.primaryCurrency || 'YER'}</span>
                       </div>
                       {selectedProduct.specialOffer.bonus && (
                          <div className="flex justify-between">
                             <span className="text-red-900 font-bold">بونص العرض:</span>
                             <span className="text-orange-600 font-bold">{selectedProduct.specialOffer.bonus}</span>
                          </div>
                       )}
                       {selectedProduct.specialOffer.targetExpiryDate && selectedProduct.specialOffer.targetExpiryDate !== 'any' && (
                          <div className="flex justify-between">
                             <span className="text-red-900 font-bold">يستهدف تاريخ:</span>
                             <span dir="ltr" className="text-gray-700 font-medium">{selectedProduct.specialOffer.targetExpiryDate}</span>
                          </div>
                       )}
                       {selectedProduct.specialOffer.condition === 'quantity' && selectedProduct.specialOffer.quantity && (
                          <div className="flex justify-between">
                             <span className="text-red-900 font-bold">كمية العرض المنشطة:</span>
                             <span>{selectedProduct.specialOffer.quantity}</span>
                          </div>
                       )}
                       {selectedProduct.specialOffer.condition === 'time' && selectedProduct.specialOffer.endDate && (
                          <div className="flex justify-between text-red-600">
                             <span className="font-bold">ينتهي في:</span>
                             <span dir="ltr">{selectedProduct.specialOffer.endDate}</span>
                          </div>
                       )}
                    </div>
                 )}

                 <div className="text-sm">
                     {selectedProduct.bonusType === 'fixed' ? (
                        <p className="font-bold text-gray-800 bg-white p-3 rounded-lg border border-gray-100">
                          بونص ثابت نسبة: <span className="text-orange-600 font-black text-lg">{selectedProduct.bonusFixedPercent}%</span> من الكمية المطلوبة
                        </p>
                     ) : selectedProduct.bonusType === 'tiered' && selectedProduct.bonusTiers && selectedProduct.bonusTiers.length > 0 ? (
                        <div className="space-y-2">
                           <p className="font-bold text-gray-800 mb-1">بونص شرائح حسب الكمية (متدرج):</p>
                           <div className="space-y-2">
                              {selectedProduct.bonusTiers.map((tier: any, idx: number) => (
                                 <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                    <div className="flex flex-wrap gap-1 text-gray-700 font-medium items-center">
                                       <span className="bg-gray-100 px-2 py-1 rounded-md">من {tier.minQty}</span>
                                       <span className="bg-gray-100 px-2 py-1 rounded-md">{tier.maxQty ? `إلى ${tier.maxQty}` : 'فأكثر'}</span>
                                       {tier.invoiceType && tier.invoiceType !== 'all' && (
                                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md text-[11px] font-bold">
                                             ({tier.invoiceType === 'cash' ? 'للنقدي' : tier.invoiceType === 'credit' ? 'للآجل' : 'للنقدي المعلق'})
                                          </span>
                                       )}
                                    </div>
                                    <span className="font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">◀ بونص {tier.percent}%</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     ) : (!isOffer && selectedProduct.bonus) ? (
                         <p className="font-bold text-gray-800 bg-white p-3 rounded-lg border border-gray-100"><span className="text-purple-700">البونص الأساسي:</span> {selectedProduct.bonus}</p>
                     ) : !isOffer ? (
                         <p className="text-gray-500 italic">لا يوجد عروض خاصة أو بونص لهذا الصنف حالياً.</p>
                     ) : null}
                 </div>
              </div>

              {/* Sales Policies */}
              <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-4">
                 <h3 className="font-bold text-indigo-900 border-b border-indigo-200 pb-2 text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    سياسات البيع المطبقة
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mt-2">
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                       <p className="font-bold text-gray-700 mb-1">طريقة الدفع المسموحة:</p>
                       <p className="text-indigo-700 font-bold">
                          {selectedProduct.invoiceTypeRestriction === 'all' || !selectedProduct.invoiceTypeRestriction ? 'مسموح بجميع الطرق (نقدي، آجل)' : ''}
                          {selectedProduct.invoiceTypeRestriction === 'cash_only' ? 'نقدي فقط (غير مسموح بالآجل)' : ''}
                          {selectedProduct.invoiceTypeRestriction === 'cash_or_pending' ? 'نقدي أو نقدي معلق (غير مسموح بالآجل)' : ''}
                       </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-indigo-50 shadow-sm">
                       <p className="font-bold text-gray-700 mb-1">قيود بيع العملة:</p>
                       <p className="text-indigo-700 font-bold">
                          {selectedProduct.currencyRestrictionType === 'any' || !selectedProduct.currencyRestrictionType ? 'مرونة البيع بأي عملة متوفرة' : ''}
                          {selectedProduct.currencyRestrictionType === 'primary_only' ? `بواسطة العملة الأساسية للصنف فقط (${selectedProduct.currency})` : ''}
                          {selectedProduct.currencyRestrictionType === 'specific' ? `يباع بعملات محددة فقط: ${selectedProduct.specificCurrencies?.join(' ، ')}` : ''}
                       </p>
                    </div>
                 </div>
              </div>
  
           </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
           <Button 
             onClick={handleRegisterClick} 
             disabled={selectedProduct.inStock === false}
             className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold h-14 rounded-xl text-lg shadow-xl shadow-purple-900/20 transition-transform active:scale-95 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed text-center"
           >
              {selectedProduct.inStock !== false ? 'سجل الآن للطلب' : 'غير متوفر حالياً لا يمكن تسجيل الطلب'}
           </Button>
        </div>
      </div>
    );
  }

  // --- Main Catalog View ---
  return (
    <>
      <div className="min-h-[100dvh] bg-[#F4F5F8] font-sans pb-10 print:hidden" dir="rtl">
        {/* Top Header Section */}
        <div className="bg-gradient-to-br from-[#2E0B5B] to-[#4C1D95] text-white pt-10 pb-20 relative rounded-b-[40px] shadow-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
          
          <div className="container mx-auto max-w-7xl relative z-10 px-4 text-center pb-4">
            <div className="w-24 h-24 mx-auto bg-white rounded-2xl shadow-2xl flex items-center justify-center p-2 mb-5 border-[3px] border-white/20 relative group">
               {company.logoUrl ? (
                  <Image src={company.logoUrl} alt="Logo" fill className="object-contain p-2 rounded-xl" unoptimized referrerPolicy="no-referrer" />
               ) : (
                  <BuildingIcon className="w-12 h-12 text-purple-700" />
               )}
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tight drop-shadow-md">{company.name}</h1>
            {company.companyType && <p className="text-purple-200 text-sm font-medium mb-5">{company.companyType}</p>}
            
            <div className="flex flex-col items-center justify-center gap-1.5 mt-2">
               <p className="text-xl font-bold">شريكك الموثوق</p>
               <p className="opacity-90 font-medium">في تأمين كافة احتياجاتك</p>
            </div>
          </div>
        </div>

        {/* Stats Flow */}
        <div className="container mx-auto max-w-7xl px-4 -mt-10 relative z-20">
          <div className="bg-white rounded-2xl shadow-xl p-5 flex justify-between items-center text-center divide-x divide-x-reverse divide-gray-100 border border-purple-50/50 backdrop-blur-sm">
             <div className="flex-1">
               <div className="text-purple-700 font-black text-2xl mb-1">+{products.length}</div>
               <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">صنف متوفر</div>
             </div>
             <div className="flex-1">
               <div className="text-purple-700 font-black text-2xl mb-1">100<span className="text-sm">%</span></div>
               <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">جودة عالية</div>
             </div>
             <div className="flex-1">
               <div className="text-purple-700 font-black text-2xl mb-1">✓</div>
               <div className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">توصيل سريع</div>
             </div>
          </div>
        </div>

        {/* Contact Strip */}
        <div className="container mx-auto max-w-7xl px-4 mt-6">
          <div className="flex justify-between items-center bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-purple-600" />
              </div>
              <span className="font-bold truncate max-w-[120px] sm:max-w-[200px]">{company.address || 'اليمن'}</span>
            </div>
            <div className="w-[1px] h-8 bg-gray-200 shrink-0"></div>
            <div className="flex items-center gap-2 text-purple-700 font-bold" dir="ltr">
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-purple-600" />
              </div>
              <span className="truncate">{company.phone || '-'}</span>
            </div>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="container mx-auto max-w-7xl px-4 mt-8 space-y-4">
           <h2 className="text-lg font-black text-gray-900 mx-1">جميع الأصناف</h2>
           <div className="relative group">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 group-focus-within:text-purple-600 transition-colors" />
              <input 
                 type="text" 
                 placeholder="ابحث عن صنف أو اسم دواء..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-white border border-gray-200 rounded-2xl h-14 pr-12 pl-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all shadow-sm font-medium"
              />
           </div>
           
           <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x">
             <button 
                onClick={() => setActiveCategory('all')} 
                className={cn("px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm snap-start", activeCategory === 'all' ? "bg-purple-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
             >
               الكل
             </button>
             {allCategories.map((cat: any) => (
               <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(cat.id)} 
                  className={cn("px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm snap-start", activeCategory === cat.id ? "bg-purple-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
               >
                 {cat.name}
               </button>
             ))}
           </div>

           {allBrands.length > 0 && (
             <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x mt-2">
               <button 
                  onClick={() => setActiveBrand('all')} 
                  className={cn("px-5 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all shadow-sm snap-start", activeBrand === 'all' ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
               >
                 كل العلامات
               </button>
               {allBrands.map((brand: any) => (
                 <button 
                    key={brand.id} 
                    onClick={() => setActiveBrand(brand.id)} 
                    className={cn("px-5 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all shadow-sm snap-start", activeBrand === brand.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
                 >
                   {brand.name}
                 </button>
               ))}
             </div>
           )}
        </div>

        {/* Product List */}
        <div className="container mx-auto max-w-7xl px-4 mt-6">
          {filteredProducts.length === 0 ? (
             <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                 <Package className="w-16 h-16 text-gray-200 mb-3" />
                 <h3 className="font-bold text-gray-900 mb-1">لا توجد نتائج</h3>
                 <p className="text-sm text-gray-500">حاول البحث بكلمات أخرى أو تغيير التصنيف.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative pb-28">
               {filteredProducts.map(p => {
                 const isOffer = p.specialOffer?.isActive;
                 const hasDiscount = isOffer && p.price > p.specialOffer.price;
                 const discountPercent = hasDiscount ? Math.round(((p.price - p.specialOffer.price) / p.price) * 100) : 0;
                 const brandName = brands.find(b => b.id === p.brandId)?.name || (p.brand && !p.brand.startsWith('brand_') && p.brand !== 'none' ? p.brand : undefined);
                 const categoryName = categories.find(c => c.id === p.categoryId)?.name || (p.category && !p.category.startsWith('cat_') && p.category !== 'none' ? p.category : undefined);

                 return (
                  <div key={p.id} className="bg-white rounded-2xl p-3 sm:p-4 flex flex-col gap-3 border border-gray-100 shadow-sm cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group relative overflow-hidden" onClick={() => setSelectedProduct(p)}>
                     {/* Floating % badge for discount */}
                     {hasDiscount && (
                       <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg z-10 shadow-sm">
                          {discountPercent}% خصم
                       </div>
                     )}

                     <div className="flex gap-4">
                       {/* Image Left */}
                       <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-gray-50/80 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-gray-100 group-hover:bg-purple-50/30 transition-colors">
                          {p.inStock !== false ? (
                            <div className="absolute top-1.5 left-1.5 bg-green-50 text-green-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1 z-10 shadow-sm">
                               متوفر <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                          ) : (
                            <div className="absolute top-1.5 left-1.5 bg-red-50 text-red-700 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-100 z-10 shadow-sm">
                               غير متوفر
                            </div>
                          )}
                          {p.imageUrl ? (
                            <Image src={p.imageUrl} alt={p.name} fill className="object-contain p-2 mix-blend-multiply" unoptimized referrerPolicy="no-referrer" />
                          ) : <Package className="w-8 h-8 text-purple-200" />}
                       </div>

                       {/* Content Right */}
                       <div className="flex-1 flex flex-col justify-center min-w-0 pr-1">
                         <h3 className="font-black text-gray-900 text-sm sm:text-base leading-tight mb-1 line-clamp-2 pr-4">{p.name}</h3>
                         {p.scientificName && (
                           <div className="text-[11px] text-gray-500 italic mb-1.5">{p.scientificName}</div>
                         )}
                         <div className="flex flex-wrap items-center gap-1 mb-2">
                           <div className="text-[11px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-md">{p.unit || 'حبة'}</div>
                           {categoryName && (
                              <div className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 font-bold px-2 py-0.5 rounded-md truncate max-w-[80px]">{categoryName}</div>
                           )}
                           {brandName && (
                              <div className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 font-bold px-2 py-0.5 rounded-md truncate max-w-[80px]">{brandName}</div>
                           )}
                           {p.isNewProduct && (
                              <div className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 font-bold px-2 py-0.5 rounded-md">جديد</div>
                           )}
                           {p.isLowStock && (
                              <div className="text-[10px] text-orange-700 bg-orange-50 border border-orange-100 font-bold px-2 py-0.5 rounded-md">قارب</div>
                           )}
                         </div>
                         
                         <div className="mt-auto flex items-end gap-2">
                            <span className="font-black text-purple-700 text-lg sm:text-xl leading-none">
                              {isOffer ? p.specialOffer.price.toLocaleString() : p.price.toLocaleString()}
                            </span>
                            <span className="text-[10px] sm:text-xs text-gray-500 font-black mb-0.5">{company.primaryCurrency || 'YER'}</span>
                            
                            {hasDiscount && (
                              <span className="text-[11px] text-gray-400 line-through mb-0.5 font-bold">{p.price}</span>
                            )}
                         </div>
                       </div>
                     </div>

                     {/* Bonus Box */}
                     <div className="mt-2 bg-gray-50/80 rounded-xl p-2 border border-gray-100/80">
                        {isOffer && p.specialOffer.bonus ? (
                           <div className="flex items-center gap-1 text-[11px] font-black text-red-600 bg-red-50/80 px-2 py-1 rounded w-fit border border-red-100/50">
                             <Gift className="w-3.5 h-3.5" /> بونص العرض: {p.specialOffer.bonus}
                           </div>
                        ) : p.bonusType === 'fixed' && p.bonusFixedPercent ? (
                           <div className="flex items-center gap-1 text-[11px] font-black text-orange-600 bg-orange-50/80 px-2 py-1 rounded w-fit border border-orange-100/50">
                             <Gift className="w-3.5 h-3.5" /> بونص ثابت: {p.bonusFixedPercent}%
                           </div>
                        ) : p.bonusType === 'tiered' && p.bonusTiers && p.bonusTiers.length > 0 ? (
                           <div className="flex flex-col gap-1.5">
                             <div className="flex items-center gap-1 text-[11px] font-bold text-gray-700">
                               <Gift className="w-3.5 h-3.5 text-blue-500" /> بونص حسب الكمية:
                             </div>
                             <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                                {p.bonusTiers.map((tier: any, i: number) => (
                                   <div key={i} className="flex flex-col bg-white border border-blue-100 rounded-md py-1 px-2 shrink-0 shadow-sm min-w-[70px] text-center">
                                      <span className="text-[9px] text-gray-500 font-bold">من {tier.minQty} {tier.maxQty ? `إلى ${tier.maxQty}` : '+'}</span>
                                      {tier.invoiceType && tier.invoiceType !== 'all' && (
                                         <span className="text-[8px] text-blue-500 font-bold bg-blue-50 rounded px-1 my-0.5 max-w-full truncate">
                                            {tier.invoiceType === 'cash' ? 'نقدي' : tier.invoiceType === 'credit' ? 'آجل' : 'نقدي/معلق'}
                                         </span>
                                      )}
                                      <span className="text-[11px] font-black text-blue-700">+{tier.percent}%</span>
                                   </div>
                                ))}
                             </div>
                           </div>
                        ) : p.bonus ? (
                           <div className="flex items-center gap-1 text-[11px] font-black text-purple-600 bg-purple-50/80 px-2 py-1 rounded w-fit border border-purple-100/50">
                             <Gift className="w-3.5 h-3.5" /> بونص {typeof p.bonus === 'string' && p.bonus.length > 25 ? 'متاح' : p.bonus}
                           </div>
                        ) : (
                           <div className="text-[11px] text-gray-400 font-bold italic px-1">بدون بونص</div>
                        )}
                     </div>
                  </div>
                 )
               })}
            </div>
          )}
        </div>

        {/* Floating Download Button */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none px-4">
           <Button 
               onClick={() => window.print()} 
               className="pointer-events-auto bg-purple-700 hover:bg-purple-800 text-white rounded-full h-14 px-8 shadow-[0_8px_30px_rgb(126,34,206,0.5)] font-bold text-base w-full sm:w-auto transition-transform active:scale-95 flex items-center gap-3 border-2 border-white/20"
           >
             <FileText className="w-5 h-5" />
             طلب قائمة الأسعار ( PDF )
           </Button>
        </div>
      </div>

      {/* --- Printable PDF Price List (Hidden on Screen, Visible on Print) --- */}
      <div className="hidden print:block w-full bg-white text-black p-4" dir="rtl">
          <div className="flex justify-between items-end border-b-4 border-purple-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
             {company.logoUrl && <div className="w-20 h-20 relative shrink-0"><Image src={company.logoUrl} alt="Logo" fill className="object-contain" unoptimized referrerPolicy="no-referrer" /></div>}
             <div>
               <h1 className="text-3xl font-black text-purple-900 mb-1">{company.name}</h1>
               {company.companyType && <p className="text-sm font-bold text-gray-600">{company.companyType}</p>}
             </div>
          </div>
          <div className="text-left">
             <h2 className="text-4xl font-black text-purple-900 mb-2">قائمة الأسعار</h2>
             <p className="text-sm font-bold text-gray-500">
               الأسعار سارية اعتباراً من {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
             </p>
          </div>
        </div>
        
        {/* Features Banner */}
        <div className="flex justify-between bg-purple-50 p-4 rounded-xl mb-6 border border-purple-100">
           <div className="flex items-center gap-3">
             <ShieldCheck className="w-8 h-8 text-purple-700" />
             <div>
               <div className="font-bold text-gray-900 text-sm">جودة مضمونة</div>
               <div className="text-[10px] font-bold text-gray-500">منتجات أصلية 100%</div>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <Truck className="w-8 h-8 text-purple-700" />
             <div>
               <div className="font-bold text-gray-900 text-sm">توصيل سريع</div>
               <div className="text-[10px] font-bold text-gray-500">استجابة لجميع الطلبات</div>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <Percent className="w-8 h-8 text-purple-700" />
             <div>
               <div className="font-bold text-gray-900 text-sm">أسعار تنافسية</div>
               <div className="text-[10px] font-bold text-gray-500">أفضل الأسعار المتاحة</div>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <Headphones className="w-8 h-8 text-purple-700" />
             <div>
               <div className="font-bold text-gray-900 text-sm">دعم فني</div>
               <div className="text-[10px] font-bold text-gray-500">خدمة عملاء متميزة</div>
             </div>
           </div>
        </div>

        {/* Table */}
        <table className="w-full text-right border-collapse mb-10 text-sm">
          <thead>
            <tr className="bg-purple-900 text-white">
              <th className="p-3 border border-purple-900 font-bold w-12 text-center rounded-tr-xl print:text-xs">م</th>
              <th className="p-3 border border-purple-900 font-bold print:text-xs">الصنف</th>
              <th className="p-3 border border-purple-900 font-bold print:text-xs">الاسم العلمي</th>
              <th className="p-3 border border-purple-900 font-bold w-[12%] print:text-xs">العلامة التجارية</th>
              <th className="p-3 border border-purple-900 font-bold w-[12%] print:text-xs">الفئة</th>
              <th className="p-3 border border-purple-900 font-bold w-12 text-center print:text-xs">العبوة</th>
              <th className="p-3 border border-purple-900 font-bold w-20 text-center bg-purple-800 print:text-xs">السعر ({company.primaryCurrency || 'YER'})</th>
              <th className="p-3 border border-purple-900 font-bold w-40 text-center print:text-xs">البونص</th>
              <th className="p-3 border border-purple-900 font-bold w-16 text-center rounded-tl-xl print:text-xs">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, idx) => {
              const brand = brands.find(b => b.id === p.brandId)?.name || (p.brand && !p.brand.startsWith('brand_') && p.brand !== 'none' ? p.brand : '-');
              const category = categories.find(c => c.id === p.categoryId)?.name || (p.category && !p.category.startsWith('cat_') && p.category !== 'none' ? p.category : '-');
              const isOffer = p.specialOffer?.isActive;
              
              return (
                <tr key={p.id} className="border-b border-gray-200 even:bg-purple-50/40 print:break-inside-avoid">
                  <td className="p-2 print:p-1.5 text-center text-gray-500 font-bold print:text-[11px]">{idx + 1}</td>
                  <td className="p-2 print:p-1.5 font-bold flex items-center gap-2 print:text-[11px]">
                    {p.imageUrl ? (
                      <div className="w-8 h-8 print:w-6 print:h-6 min-w-[24px] border border-gray-100 rounded bg-white relative flex shrink-0 p-0.5">
                        <Image src={p.imageUrl} alt="" fill className="object-contain" unoptimized referrerPolicy="no-referrer" />
                      </div>
                    ) : <Package className="w-6 h-6 print:w-5 print:h-5 text-gray-300 shrink-0" />}
                    <span className="text-gray-900">{p.name}</span>
                  </td>
                  <td className="p-2 print:p-1.5 text-gray-600 italic text-xs print:text-[11px] font-medium">{p.scientificName || '-'}</td>
                  <td className="p-2 print:p-1.5 text-gray-800 font-bold text-xs print:text-[11px]">{brand}</td>
                  <td className="p-2 print:p-1.5 text-gray-600 font-bold text-xs print:text-[11px]">{category}</td>
                  <td className="p-2 print:p-1.5 text-center text-gray-600 font-bold print:text-[11px]">{p.unit || 'حبة'}</td>
                  <td className="p-2 print:p-1.5 text-center font-black text-base print:text-sm text-purple-900 bg-purple-50/20">
                    {isOffer ? p.specialOffer.price.toLocaleString() : p.price.toLocaleString()}
                  </td>
                  <td className="p-2 print:p-1.5 font-bold text-center">
                    {isOffer && p.specialOffer.bonus ? (
                      <span className="text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded text-xs print:text-[10px] print:border-none print:bg-transparent inline-block whitespace-nowrap">{p.specialOffer.bonus}</span>
                    ) : p.bonusType === 'fixed' && p.bonusFixedPercent ? (
                      <span className="text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded text-xs print:text-[10px] print:border-none print:bg-transparent inline-block whitespace-nowrap">{p.bonusFixedPercent}% ثابت</span>
                    ) : p.bonusType === 'tiered' && p.bonusTiers && p.bonusTiers.length > 0 ? (
                      <div className="flex flex-col gap-0.5 items-center justify-center">
                         {p.bonusTiers.map((tier: any, i: number) => (
                           <div key={i} className="text-[10px] print:text-[9px] text-blue-800 bg-blue-50 border border-blue-100 print:bg-transparent print:border-none px-1 py-0.5 rounded leading-tight whitespace-nowrap min-w-max" dir="rtl">
                             من {tier.minQty} {tier.maxQty ? `إلى ${tier.maxQty}` : 'فأكثر'} {tier.invoiceType && tier.invoiceType !== 'all' ? <span className="text-gray-500 print:text-[8px] font-medium mx-1">({tier.invoiceType === 'cash' ? 'نقدي' : tier.invoiceType === 'credit' ? 'آجل' : 'نقدي معلق'})</span> : ''}: <span className="font-black text-orange-600 mr-1" dir="ltr">+{tier.percent}%</span>
                           </div>
                         ))}
                      </div>
                    ) : p.bonus ? (
                      <span className="text-purple-600 bg-purple-50 border border-purple-100 px-1.5 py-0.5 rounded text-xs print:text-[10px] print:border-none print:bg-transparent inline-block whitespace-nowrap">{p.bonus}</span>
                    ) : '-'}
                  </td>
                  <td className="p-2 print:p-1.5 text-center">
                    {p.inStock !== false ? (
                      <div className="inline-flex items-center justify-center text-green-600 bg-green-50 print:bg-transparent px-2 py-1 rounded-md text-[10px] print:text-[10px] font-black min-w-[50px]"><CheckCircle className="w-3 h-3 ml-0.5 print:hidden"/>متوفر</div>
                    ) : (
                      <div className="inline-flex justify-center text-red-500 bg-red-50 print:bg-transparent px-2 py-1 rounded-md text-[10px] print:text-[10px] font-black min-w-[50px]">غير متوفر</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Branding Footer */}
        <div className="mt-16 pt-8 border-t-2 border-gray-100 flex justify-center items-center text-gray-400">
           <AppLogoText className="text-xl grayscale opacity-60" />
        </div>

        {/* Footer Details */}
        <div className="flex items-stretch justify-between bg-purple-50 rounded-xl border border-purple-100 overflow-hidden mb-4 print:break-inside-avoid">
          <div className="p-6">
             <h3 className="font-black text-purple-900 mb-2">للتواصل وطلب المنتجات</h3>
             <div className="flex items-center gap-2 text-purple-800 font-bold text-xl" dir="ltr">
               <Phone className="w-5 h-5"/> {company.phone || '-'}
             </div>
          </div>
          <div className="p-6 bg-purple-100/50 flex-1 border-r border-purple-200">
            <h3 className="font-black text-purple-900 mb-2">شروط عامة</h3>
            <ul className="text-xs font-bold text-purple-800 space-y-1 list-disc list-inside">
              <li>الأسعار لا تشمل ضريبة القيمة المضافة (إن وجدت).</li>
              <li>يحق للشركة تعديل الأسعار دون إشعار مسبق.</li>
              <li>مدة التوصيل تعتمد على الموقع وتوفر المخزون.</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-between items-center text-xs text-white bg-purple-900 p-4 rounded-xl font-bold print:break-inside-avoid">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4"/>{company.address || '-'}</div>
          <div className="flex items-center gap-2" dir="ltr"><Phone className="w-4 h-4"/>{company.phone || '-'}</div>
          <div className="flex items-center gap-2"><Mail className="w-4 h-4"/>{company.email || '-'}</div>
        </div>
      </div>
    </>
  );
}
