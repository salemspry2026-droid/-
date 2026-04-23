'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '@/lib/utils';

export function Onboarding() {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
//...

  const handleJoinEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;

    setLoading(true);
    try {
      // Find company by join code
      const q = query(collection(db, 'companies'), where('joinCode', '==', joinCode.toUpperCase()));
      const querySnapshot = await getDocs(q).catch(err => {
        handleFirestoreError(err, OperationType.LIST, `companies`);
        return null;
      });

      if (!querySnapshot || querySnapshot.empty) {
        toast.error('رمز الانضمام غير صحيح');
        setLoading(false);
        return;
      }

      const companyDoc = querySnapshot.docs[0];
      const companyId = companyDoc.id;

      // Create user profile as sales/employee
      await setDoc(doc(db, 'userProfiles', user.uid), {
        email: user.email,
        displayName: user.displayName || 'User',
        companyId: companyId,
        role: 'sales', // Set to sales (employee) instead of client
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `userProfiles/${user.uid}`));

      toast.success('تم الانضمام للشركة كموظف مبيعات بنجاح!');
    } catch (error: any) {
      toast.error(error.message || 'فشل الانضمام للشركة');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create user profile as independent client
      await setDoc(doc(db, 'userProfiles', user.uid), {
        email: user.email,
        displayName: user.displayName || 'Customer',
        companyId: '', // Clients don't belong to a specific company anymore
        role: 'client',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `userProfiles/${user.uid}`));

      toast.success('تم إنشاء حساب العميل بنجاح!');
    } catch (error: any) {
      toast.error(error.message || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !user) return;

    setLoading(true);
    try {
      // Generate a unique company ID
      const companyId = `comp_${Math.random().toString(36).substring(2, 11)}`;
      const generatedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create company document
      await setDoc(doc(db, 'companies', companyId), {
        name: companyName,
        joinCode: generatedJoinCode,
        ownerId: user.uid,
        isActive: true,
        companyType: 'other',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `companies/${companyId}`));

      // Create user profile as an owner
      await setDoc(doc(db, 'userProfiles', user.uid), {
        email: user.email,
        displayName: user.displayName || 'Owner',
        companyId: companyId,
        role: 'owner',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `userProfiles/${user.uid}`));

      toast.success('تم إنشاء الشركة بنجاح!');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء إنشاء الشركة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] p-4">
      <Card className="w-full max-w-md border-none shadow-lg rounded-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">مرحباً بك في نظام إدارة الطلبات</CardTitle>
          <CardDescription className="text-gray-500">لنقم بإعداد حسابك</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="join_client" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto p-1">
              <TabsTrigger value="join_client" className="py-2 px-1 text-xs sm:text-sm font-semibold whitespace-normal h-auto leading-tight text-center">التسجيل<br/>كعميل</TabsTrigger>
              <TabsTrigger value="join_employee" className="py-2 px-1 text-xs sm:text-sm font-semibold whitespace-normal h-auto leading-tight text-center">انضمام<br/>موظف</TabsTrigger>
              <TabsTrigger value="create" className="py-2 px-1 text-xs sm:text-sm font-semibold whitespace-normal h-auto leading-tight text-center">إنشاء<br/>شركة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="join_employee">
              <form onSubmit={handleJoinEmployee} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">رمز الانضمام (للموظفين)</Label>
                  <Input 
                    id="joinCode" 
                    placeholder="أدخل الرمز المكون من 6 أحرف" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    required
                    maxLength={10}
                    className="uppercase text-center tracking-widest text-lg"
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-base font-bold" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : null}
                  دخول كموظف مبيعات
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="join_client">
              <form onSubmit={handleJoinClient} className="space-y-4 text-center">
                <div className="py-4 text-gray-600 text-sm">
                  كونك عميلاً سيتيح لك تصفح جميع الشركات والمنتجات المتاحة في التطبيق وطلب ماتريد بسهولة.
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-12 rounded-xl text-base font-bold" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : null}
                  المتابعة كعميل
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="create">
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">اسم الشركة</Label>
                  <Input 
                    id="companyName" 
                    placeholder="أدخل اسم شركتك" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-xl text-base font-bold" disabled={loading}>
                  {loading ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : null}
                  إنشاء الشركة
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
