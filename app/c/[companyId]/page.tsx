'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useStore } from '@/lib/store';
import { Loader2, ArrowRight, UserPlus, Package, MapPin, Phone, Mail, BuildingIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

export default function PublicCompanyPage() {
  const { companyId } = useParams();
  const router = useRouter();
  const { user } = useStore();
  
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

        const companyData = { id: companySnap.id, ...companySnap.data() };
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
          where('companyId', '==', companyId),
          where('isDeleted', '==', false),
          where('isActive', '==', true)
        );
        
        const productsSnap = await getDocs(q);
        const productsData = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  const handleRegisterClick = () => {
    // If not logged in, take them to register. We can append ?companyId=.. but the app might have their own onboarding.
    if (!user) {
      router.push('/');
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <X className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{error}</h1>
          <Button onClick={() => router.push('/')} variant="outline">
            العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Top Bar for Registration */}
      {!user && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm sm:text-base font-medium">
              أهلاً بك في صفحة <strong>{company.name}</strong>! سجل كعميل جديد لتتمكن من رفع طلباتك بسهولة.
            </div>
            <Button 
              onClick={handleRegisterClick} 
              className="bg-white text-blue-700 hover:bg-gray-100 whitespace-nowrap shadow-sm font-bold"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              تسجيل حساب جديد
            </Button>
          </div>
        </div>
      )}

      {/* Company Header */}
      <div className="bg-white border-b relative">
         <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none" />
         <div className="container mx-auto max-w-5xl px-4 py-12 relative z-10">
           <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {company.logoUrl ? (
                <div className="w-32 h-32 rounded-2xl bg-white shadow-lg overflow-hidden border border-gray-100 flex-shrink-0 relative">
                   <Image src={company.logoUrl} alt={company.name} fill className="object-contain p-2" unoptimized referrerPolicy="no-referrer" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg flex items-center justify-center flex-shrink-0">
                   <BuildingIcon className="w-12 h-12" />
                </div>
              )}
              
              <div className="text-center md:text-right space-y-4 flex-1">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">{company.name}</h1>
                
                {(company.companyType || company.primaryCurrency) && (
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {company.companyType && <Badge variant="secondary" className="text-xs bg-gray-100">{company.companyType}</Badge>}
                    {company.primaryCurrency && <Badge variant="outline" className="text-xs">العملة: {company.primaryCurrency}</Badge>}
                  </div>
                )}

                {company.aboutUs && (
                  <p className="text-gray-600 max-w-2xl leading-relaxed text-lg">
                    {company.aboutUs}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-500 pt-2">
                  {company.address && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{company.address}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border" dir="ltr">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{company.email}</span>
                    </div>
                  )}
                </div>
              </div>
           </div>
         </div>
      </div>

      {/* Catalog Section */}
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex items-center justify-between mb-8">
           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <Package className="w-6 h-6 text-blue-600" />
             قائمة الأصناف والخدمات
           </h2>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أصناف معروضة حالياً</h3>
            <p className="text-gray-500">هذه الشركة لم تقم بإضافة أي أصناف بعد.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {products.map(product => (
              <Card key={product.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 bg-white overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </CardTitle>
                      {product.brand && <p className="text-xs text-gray-500 font-medium">{product.brand}</p>}
                    </div>
                    {product.categoryId !== 'none' && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none font-normal">
                        {product.categoryId}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-gray-50 px-4 py-3 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">السعر</span>
                      <div className="flex items-baseline gap-1" dir="ltr">
                        <span className="text-lg font-bold text-gray-900">{product.price.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">{product.currency}</span>
                      </div>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                        {product.description}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 border-t border-gray-50 mt-4 px-6 pt-4 pb-4">
                   <Button variant="ghost" onClick={handleRegisterClick} className="w-full text-blue-600 hover:bg-blue-50 font-medium">
                      التسجيل للطلب
                      <ArrowRight className="w-4 h-4 mr-2" />
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
