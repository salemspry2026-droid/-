'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Search, Package, MapPin, ChevronLeft, LogOut, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth, signOut } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import Image from 'next/image';
import { Input } from '@/components/ui/input';

export function ClientHomeTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { setClientSelectedCompany, profile, user, setIsNotificationsOpen, unreadNotifications } = useStore();
  const [companies, setCompanies] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch all active companies
    const qCompanies = query(
      collection(db, 'companies'), 
      where('isDeleted', '==', false)
    );

    const unsubCompanies = onSnapshot(qCompanies, (snapshot) => {
      setCompanies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
      setLoading(false);
    });

    return () => unsubCompanies();
  }, [user?.uid]);

  const filteredCompanies = companies.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.companyType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectCompany = (company: any) => {
    setClientSelectedCompany(company);
    onNavigate('products');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header Profile Section */}
      <div className="bg-green-600 rounded-b-[2rem] p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-10 pointer-events-none">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white blur-3xl"></div>
          <div className="absolute -left-10 bottom-0 w-32 h-32 rounded-full bg-green-300 blur-2xl"></div>
        </div>
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-green-100 text-sm mb-1 font-medium">مرحباً بك،</p>
            <h2 className="text-2xl font-bold">{profile?.displayName || 'عميلنا العزيز'}</h2>
            <p className="text-green-100 text-sm mt-2 flex items-center gap-1 opacity-90">
              تصفح الشركات والمنتجات بسهولة
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-green-700/50 rounded-full h-10 w-10 shrink-0 relative" onClick={() => setIsNotificationsOpen(true)}>
              <Bell className="w-5 h-5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in zoom-in">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-red-500 hover:text-white rounded-full h-10 w-10 shrink-0 transition-colors" onClick={handleLogout} title="تسجيل الخروج">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Companies List */}
      <div className="px-4 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input 
            placeholder="ابحث عن شركة، مجال المقاولات، الأدوية..." 
            className="pl-4 pr-10 bg-white border-transparent focus-visible:ring-green-500 rounded-xl h-12 text-base shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4 px-1 mt-2">
            <Building2 className="w-4 h-4 text-green-600" />
            الشركات المتاحة
          </h3>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse bg-white border-none shadow-sm rounded-2xl overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-xl shrink-0" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCompanies.map(company => (
                <Card 
                  key={company.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer bg-white border border-gray-100 rounded-2xl group"
                  onClick={() => handleSelectCompany(company)}
                >
                  <CardContent className="p-0">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 relative z-10 w-full">
                        <div className="w-14 h-14 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-green-200 transition-colors">
                          {company.logoUrl ? (
                            <Image src={company.logoUrl} alt={company.name} fill className="object-contain p-2" sizes="56px" referrerPolicy="no-referrer" />
                          ) : (
                            <Building2 className="w-7 h-7 text-gray-300" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 line-clamp-1 mb-1 group-hover:text-green-700 transition-colors">{company.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                            {company.companyType && (
                              <span className="bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <Package className="w-3 h-3" />
                                {company.companyType === 'other' ? company.companyTypeOther : 
                                company.companyType === 'pharmaceuticals' ? 'أدوية ومستلزمات طبية' :
                                company.companyType === 'food' ? 'مواد غذائية' :
                                company.companyType === 'cosmetics' ? 'مستحضرات تجميل' : company.companyType}
                              </span>
                            )}
                            {company.address && (
                              <span className="flex items-center gap-1 line-clamp-1 shrink-0"><MapPin className="w-3 h-3" /> {company.address}</span>
                            )}
                          </div>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-gray-300 group-hover:text-green-600 transition-colors shrink-0 mr-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-dashed border-gray-200">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">لم يتم العثور على شركات تطابق بحثك</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
