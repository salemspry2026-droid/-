'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import { Loader2, ArrowRight, UserPlus, Package, MapPin, Phone, Mail, BuildingIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { AppLogo, AppLogoText } from '@/components/AppLogo';

export default function PublicCompanyPage() {
  const { companyId } = useParams();
  const router = useRouter();
  const { user, profile, isProfileLoaded, setClientSelectedCompany, setActiveTab } = useStore();
  
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');

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

        // Fetch products
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef,
          where('companyId', '==', companyId)
        );
        
        const productsSnap = await getDocs(q);
        const productsData = productsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(p => p.isDeleted === false && p.isActive === true);
        setProducts(productsData);
      } catch (err: any) {
        console.error("Error fetching company info:", err);
        setError('حدث خطأ أثناء تحميل بيانات الشركة. يرجى المحاولة لاحقاً.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  useEffect(() => {
    if (user && isProfileLoaded && profile && company) {
      setClientSelectedCompany(company);
      setActiveTab('products');
      router.replace('/');
    }
  }, [user, isProfileLoaded, profile, company, router, setClientSelectedCompany, setActiveTab]);

  const handleRegisterClick = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] p-4" dir="rtl">
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

  // If user is logged in, render nothing or loader while it redirects
  if (user && profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5]">
        <AppLogo className="w-16 h-16 mb-4 animate-pulse opacity-50" />
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 font-sans" dir="rtl">
      {/* Top Bar for Registration */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-white/10 p-1.5 rounded-lg shrink-0">
               <AppLogo className="w-6 h-6 grayscale brightness-200" />
             </div>
             <div className="text-sm sm:text-base font-medium">
               أهلاً بك في صفحة <strong>{company.name}</strong> الموثقة عبر <AppLogoText className="inline-flex text-white opacity-90 text-sm" />! سجل كعميل جديد لتتمكن من الطلب.
             </div>
          </div>
          <Button 
            onClick={handleRegisterClick} 
            className="bg-white text-purple-700 hover:bg-purple-50 whitespace-nowrap shadow-sm font-bold rounded-xl h-10 px-6 w-full sm:w-auto transition-transform hover:scale-105"
          >
            <UserPlus className="w-4 h-4 ml-2" />
            تسجيل حساب جديد
          </Button>
        </div>
      </div>

      {/* Company Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
         <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-100 rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none" />
         <div className="container mx-auto max-w-5xl px-4 py-12 relative z-10">
           <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {company.logoUrl ? (
                <div className="w-32 h-32 rounded-3xl bg-white shadow-xl overflow-hidden border-4 border-white flex-shrink-0 relative group">
                   <div className="absolute inset-0 bg-purple-600/10 group-hover:bg-transparent transition-colors z-10 pointer-events-none" />
                   <Image src={company.logoUrl} alt={company.name} fill className="object-contain p-2" unoptimized referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-700 text-white shadow-xl flex items-center justify-center flex-shrink-0 border-4 border-white">
                   <BuildingIcon className="w-12 h-12" />
                </div>
              )}
              
              <div className="text-center md:text-right space-y-4 flex-1">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{company.name}</h1>
                
                {(company.companyType || company.primaryCurrency) && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {company.companyType && <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700 border-none px-3 py-1">{company.companyType}</Badge>}
                    {company.primaryCurrency && <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 px-3 py-1">العملة: {company.primaryCurrency}</Badge>}
                  </div>
                )}

                {company.aboutUs && (
                  <p className="text-gray-600 max-w-2xl leading-relaxed text-lg">
                    {company.aboutUs}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 pt-2">
                  {company.address && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-sm font-medium">
                      <MapPin className="w-4 h-4 text-purple-500" />
                      <span>{company.address}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-sm font-medium" dir="ltr">
                      <Phone className="w-4 h-4 text-purple-500" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 shadow-sm font-medium">
                      <Mail className="w-4 h-4 text-purple-500" />
                      <span>{company.email}</span>
                    </div>
                  )}
                </div>
              </div>
           </div>
         </div>
      </div>

      {/* Catalog Section */}
      <div className="container mx-auto max-w-5xl px-4 py-12 relative z-10">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
               <Package className="w-5 h-5 text-purple-600" />
             </div>
             قائمة الأصناف والخدمات
           </h2>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-16 text-center shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد أصناف معروضة حالياً</h3>
            <p className="text-gray-500">هذه الشركة لم تقم بإضافة أي أصناف بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-gray-100 bg-white overflow-hidden rounded-2xl flex flex-col h-full">
                <CardHeader className="pb-3 flex-none">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg text-gray-900 mb-1 line-clamp-2 max-w-full group-hover:text-purple-700 transition-colors">
                        {product.name}
                      </CardTitle>
                      {product.brand && <p className="text-xs text-gray-500 font-bold">{product.brand}</p>}
                    </div>
                    {product.categoryId !== 'none' && (
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-none font-bold shrink-0 whitespace-nowrap">
                        {product.categoryId}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="bg-gray-50/80 px-4 py-3 rounded-xl flex items-center justify-between border border-gray-100">
                      <span className="text-sm font-bold text-gray-600">السعر</span>
                      <div className="flex items-baseline gap-1 bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm" dir="ltr">
                        <span className="text-lg font-black text-gray-900">{product.price.toLocaleString()}</span>
                        <span className="text-xs font-bold text-purple-600">{product.currency}</span>
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-gray-50 mt-4 px-6 pt-4 pb-4 flex-none bg-gray-50/30">
                   <Button variant="ghost" onClick={handleRegisterClick} className="w-full text-purple-700 hover:bg-purple-100 font-bold rounded-xl h-12 transition-colors">
                      سجل للطلب الان
                      <ArrowRight className="w-5 h-5 mr-2" />
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="text-center pb-8 opacity-70 flex flex-col items-center justify-center gap-2">
        <span className="text-sm font-medium text-gray-500">مدعوم بواسطة</span>
        <AppLogoText className="text-xl grayscale opacity-50" />
      </div>
    </div>
  );
}

