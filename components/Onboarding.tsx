'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { onboardingService } from '@/lib/services/onboardingService';

import { AppLogo, AppLogoText } from './AppLogo';

export function Onboarding() {
  const { user } = useStore();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  // Client state
  const [clientPhone, setClientPhone] = useState('');
  const [clientStoreName, setClientStoreName] = useState('');
  
  const handleJoinEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !user) return;

    setLoading(true);
    try {
      await onboardingService.joinAsEmployee(joinCode, user);
      toast.success('تم إرسال طلب الانضمام! في انتظار موافقة الشركة.');
    } catch (error: any) {
      toast.error(error.message || 'فشل إرسال طلب الانضمام');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !clientPhone.trim() || !clientStoreName.trim()) return;

    setLoading(true);
    try {
      await onboardingService.joinAsClient(user, clientPhone, clientStoreName);
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
      await onboardingService.createCompany(companyName, user);
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
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <AppLogo className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 flex justify-center items-center gap-2">
            مرحباً بك في <AppLogoText className="text-2xl" />
          </CardTitle>
          <CardDescription className="text-gray-500">نُدير أعمالك .. نربط عملاءك .. ننمي مبيعاتك</CardDescription>
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
                <div className="py-2 text-gray-600 text-sm">
                  كونك عميلاً سيتيح لك تصفح جميع الشركات والمنتجات المتاحة في التطبيق وطلب ماتريد بسهولة.
                </div>
                <div className="space-y-4 text-right">
                  <div className="space-y-2 text-right">
                    <Label htmlFor="clientPhone">رقم الهاتف <span className="text-red-500">*</span></Label>
                    <Input 
                      id="clientPhone" 
                      placeholder="أدخل رقم الهاتف للتواصل" 
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      required
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label htmlFor="clientStoreName">اسم المحل / اسم العميل <span className="text-red-500">*</span></Label>
                    <Input 
                      id="clientStoreName" 
                      placeholder="أدخل اسم المحل أو اسمك كعميل" 
                      value={clientStoreName}
                      onChange={(e) => setClientStoreName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-12 rounded-xl text-base font-bold mt-2" disabled={loading}>
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
