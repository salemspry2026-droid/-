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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const catName = categories.find(c => c.id === p.categoryId)?.name || '';
      const brandName = brands.find(b => b.id === p.brandId)?.name || '';
      const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            catName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            brandName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || p.categoryId === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategory, categories, brands]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F0F2F5]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
    const brandName = brands.find(b => b.id === selectedProduct.brandId)?.name;
    const categoryName = categories.find(c => c.id === selectedProduct.categoryId)?.name;
    const isOffer = selectedProduct.specialOffer?.isActive;
    const finalPrice = isOffer ? selectedProduct.specialOffer.price : selectedProduct.price;
    const bonusText = isOffer && selectedProduct.specialOffer.bonus ? selectedProduct.specialOffer.bonus 
                      : (selectedProduct.bonusType === 'fixed' && selectedProduct.bonusFixedPercent ? `بونص ${selectedProduct.bonusFixedPercent}%` 
                      : (!selectedProduct.bonusType && selectedProduct.bonus ? selectedProduct.bonus : null));

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
  
              {bonusText && (
                <div>
                  <h3 className="font-bold text-base text-gray-900 mb-3">عروض وخصومات</h3>
                  <div className="flex items-center justify-between bg-gradient-to-l from-red-50 to-orange-50 p-4 rounded-xl border border-red-100 shadow-sm">
                     <div className="flex flex-col">
                        <span className="font-black text-red-700 text-lg">بونص خاص</span>
                        <span className="text-sm font-bold text-orange-600 mt-1">
                           {bonusText}
                        </span>
                     </div>
                     <div className="w-14 h-14 bg-white/60 text-red-600 rounded-full flex items-center justify-center shadow-inner relative overflow-hidden">
                        <Percent className="w-6 h-6 absolute" />
                     </div>
                  </div>
                </div>
              )}
  
           </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
           <Button onClick={handleRegisterClick} className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold h-14 rounded-xl text-lg shadow-xl shadow-purple-900/20 transition-transform active:scale-95">
              سجل الآن للطلب
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
          
          <div className="container mx-auto max-w-lg relative z-10 px-4 text-center pb-4">
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
        <div className="container mx-auto max-w-lg px-4 -mt-10 relative z-20">
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
        <div className="container mx-auto max-w-lg px-4 mt-6">
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
        <div className="container mx-auto max-w-lg px-4 mt-8 space-y-4">
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
             {categories.map(cat => (
               <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(cat.id)} 
                  className={cn("px-5 py-2.5 rounded-full whitespace-nowrap text-sm font-bold transition-all shadow-sm snap-start", activeCategory === cat.id ? "bg-purple-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}
               >
                 {cat.name}
               </button>
             ))}
           </div>
        </div>

        {/* Product List */}
        <div className="container mx-auto max-w-lg px-4 mt-6">
          {filteredProducts.length === 0 ? (
             <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                 <Package className="w-16 h-16 text-gray-200 mb-3" />
                 <h3 className="font-bold text-gray-900 mb-1">لا توجد نتائج</h3>
                 <p className="text-sm text-gray-500">حاول البحث بكلمات أخرى أو تغيير التصنيف.</p>
             </div>
          ) : (
            <div className="space-y-4 relative pb-28">
               {filteredProducts.map(p => {
                 const isOffer = p.specialOffer?.isActive;
                 const bonusTxt = p.specialOffer?.isActive && p.specialOffer.bonus ? p.specialOffer.bonus : p.bonus;
                 const hasDiscount = isOffer && p.price > p.specialOffer.price;
                 const discountPercent = hasDiscount ? Math.round(((p.price - p.specialOffer.price) / p.price) * 100) : 0;

                 return (
                  <div key={p.id} className="bg-white rounded-2xl p-3 sm:p-4 flex gap-4 border border-gray-100 shadow-sm cursor-pointer hover:border-purple-300 hover:shadow-md transition-all group relative overflow-hidden" onClick={() => setSelectedProduct(p)}>
                     {/* Floating % badge for discount */}
                     {hasDiscount && (
                       <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg z-10 shadow-sm">
                          {discountPercent}% خصم
                       </div>
                     )}

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
                       <div className="text-[11px] text-gray-500 font-bold mb-2 bg-gray-100 w-fit px-2 py-0.5 rounded-md">{p.unit || 'حبة'}</div>
                       
                       {bonusTxt && (
                          <div className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded mb-1.5 w-fit border border-red-100/50">
                            <Gift className="w-3 h-3" /> بونص {typeof bonusTxt === 'string' && bonusTxt.length > 15 ? 'متاح' : bonusTxt}
                          </div>
                       )}

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
             {company.logoUrl && <img src={company.logoUrl} alt="Logo" className="w-20 h-20 object-contain" />}
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
              <th className="p-3 border border-purple-900 font-bold w-12 text-center rounded-tr-xl">م</th>
              <th className="p-3 border border-purple-900 font-bold">الصنف</th>
              <th className="p-3 border border-purple-900 font-bold w-[25%]">الشكل / الماركة</th>
              <th className="p-3 border border-purple-900 font-bold w-20 text-center">العبوة</th>
              <th className="p-3 border border-purple-900 font-bold w-28 text-center bg-purple-800">السعر ({company.primaryCurrency || 'YER'})</th>
              <th className="p-3 border border-purple-900 font-bold w-40 text-center">العرض / البونص</th>
              <th className="p-3 border border-purple-900 font-bold w-20 text-center rounded-tl-xl">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => {
              const brand = brands.find(b => b.id === p.brandId)?.name || '';
              const isOffer = p.specialOffer?.isActive;
              const bonusText = isOffer && p.specialOffer.bonus ? p.specialOffer.bonus : (p.bonusType === 'fixed' && p.bonusFixedPercent ? `بونص ${p.bonusFixedPercent}%` : (!p.bonusType && p.bonus ? p.bonus : null));
              
              return (
                <tr key={p.id} className="border-b border-gray-200 even:bg-purple-50/40 print:break-inside-avoid">
                  <td className="p-3 text-center text-gray-500 font-bold">{idx + 1}</td>
                  <td className="p-3 font-bold flex items-center gap-3">
                    {p.imageUrl ? (
                      <div className="w-10 h-10 border border-gray-100 rounded bg-white flex items-center justify-center p-1 shrink-0">
                        <img src={p.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : <Package className="w-8 h-8 text-gray-300" />}
                    <span className="text-gray-900 text-base">{p.name}</span>
                  </td>
                  <td className="p-3 text-gray-600 font-medium text-xs">
                    {brand && <div className="text-gray-900 font-bold">{brand}</div>}
                    {p.categoryId && <div>{categories.find(c=>c.id===p.categoryId)?.name}</div>}
                  </td>
                  <td className="p-3 text-center text-gray-600 font-bold">{p.unit || 'حبة'}</td>
                  <td className="p-3 text-center font-black text-lg text-purple-900 bg-purple-50/20">
                    {isOffer ? p.specialOffer.price.toLocaleString() : p.price.toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-center">
                    {bonusText ? <span className="text-red-600 inline-flex items-center justify-center gap-1"><Gift className="w-3 h-3"/>{bonusText}</span> : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="p-3 text-center">
                    {p.inStock !== false ? (
                      <div className="inline-flex items-center justify-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-[10px] font-black"><CheckCircle className="w-3 h-3"/>متوفر</div>
                    ) : (
                      <div className="inline-flex justify-center text-red-500 bg-red-50 px-2 py-1 rounded-md text-[10px] font-black">غير متوفر</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

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
