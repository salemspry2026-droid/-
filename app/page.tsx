'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, auth, signOut } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendSignInLinkToEmail
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Onboarding } from '@/components/Onboarding';
import { AdminDashboard } from '@/components/AdminDashboard';
import { ClientDashboard } from '@/components/ClientDashboard';
import { LandingPage } from '@/components/LandingPage';

import { AppLogo, AppLogoText } from '@/components/AppLogo';

export default function Home() {
  const { user, profile, isAuthReady, isProfileLoaded } = useStore();
  
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'emailLink'>('login');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch(error => {
      console.error("Redirect redirect result error:", error);
    });

    // Check if the current URL is an incoming Firebase Email Sign-In Link
    if (typeof window !== 'undefined' && isSignInWithEmailLink(auth, window.location.href)) {
      setShowLogin(true);
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');
      if (!emailForSignIn) {
        emailForSignIn = window.prompt('يرجى تأكيد البريد الإلكتروني لإكمال تسجيل الدخول:');
      }
      if (emailForSignIn) {
        setLoading(true);
        signInWithEmailLink(auth, emailForSignIn, window.location.href)
          .then(() => {
            window.localStorage.removeItem('emailForSignIn');
            toast.success('تم تسجيل الدخول بنجاح عبر رابط البريد الإلكتروني');
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch((error: any) => {
            console.error('Email link sign in error:', error);
            toast.error('تعذر تسجيل الدخول بالرابط: ' + (error.message || 'الرابط غير صالح أو منتهي'));
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, []);

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('الرجاء إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'login') {
        if (!password) { toast.error('الرجاء إدخال كلمة المرور'); return; }
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === 'register') {
        if (!password) { toast.error('الرجاء إدخال كلمة المرور'); return; }
        if (!name) { toast.error('الرجاء إدخال الاسم المخصص'); return; }
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(res.user, { displayName: name });
      } else if (authMode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        toast.success('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني');
        setAuthMode('login');
      } else if (authMode === 'emailLink') {
        const actionCodeSettings = {
          url: typeof window !== 'undefined' ? window.location.origin : 'https://orderflow-topaz.vercel.app',
          handleCodeInApp: true,
          android: {
            packageName: 'com.flowexa.app',
            installApp: false,
            minimumVersion: '1',
          },
          linkDomain: 'gen-lang-client-0196712383.firebaseapp.com',
        };
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('emailForSignIn', email);
        }
        toast.success('تم إرسال رابط الدخول السريع إلى بريدك الإلكتروني بنجاح!');
      }
    } catch (error: any) {
      console.error("Auth failed:", error);
      let msg = 'حدث خطأ غير متوقع: ' + (error.message || error.code || '');
      
      const code = error.code as string;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') {
        msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (code === 'auth/email-already-in-use') {
        msg = 'هذا البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول.';
      } else if (code === 'auth/weak-password') {
        msg = 'كلمة المرور ضعيفة جداً، يجب أن تكون 6 أحرف على الأقل.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = 'النطاق الحالي غير مصرح به. يرجى إضافة رابط Vercel إلى قائمة Authorized domains في إعدادات Firebase Authentication.';
      } else if (code === 'auth/operation-not-allowed') {
        msg = 'طريقة تسجيل الدخول هذه غير مفعلة. يرجى الذهاب إلى إعدادات Firebase Authentication وتفعيل (Email/Password) أو مزود الدخول المطلوب.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'فشل الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت أو أن رابط Vercel مسموح به في إعدادات Google Cloud API Key.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'تم حظر الحساب مؤقتاً بسبب محاولات تسجيل دخول خاطئة كثيرة. يرجى إعادة المحاولة لاحقاً أو استعادة كلمة المرور.';
      }
      
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google login failed:", error);
      if (error.code === 'auth/unauthorized-domain') {
          toast.error('لم يتم تفويض رابط Vercel. يرجى الذهاب إلى إعدادات Firebase Authentication ثم Authorized domains وإضافة رابط Vercel الخاص بك.');
      } else if (error.code === 'auth/operation-not-allowed') {
          toast.error('تسجيل الدخول عبر جوجل غير مفعل. يرجى تفعيله من إعدادات Firebase Authentication.');
      } else if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          toast.error('فشل الدخول عبر جوجل: ' + (error.message || error.code || 'يرجى التأكد من إضافة رابط Vercel ضمن إعدادات Firebase Auth.'));
      }
    }
  };

  const handleGoogleLoginRedirect = async () => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Redirect login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    if (!showLogin) {
      return <LandingPage onLoginClick={() => setShowLogin(true)} />;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] p-4" dir="rtl">
        <Card className="w-full max-w-md border-none shadow-lg rounded-2xl relative">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setShowLogin(false)}>
            <LogOut className="w-5 h-5 text-gray-400 rotate-180" />
          </Button>
          <CardHeader className="text-center pb-2 pt-8">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AppLogo className="w-16 h-16" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mt-2 flex justify-center items-center gap-2">
              <AppLogoText className="text-2xl" />
            </CardTitle>
            <CardDescription className="text-gray-500">
              {authMode === 'login' && 'تسجيل الدخول للمتابعة'}
              {authMode === 'register' && 'إنشاء حساب جديد'}
              {authMode === 'forgot' && 'استعادة كلمة المرور'}
              {authMode === 'emailLink' && 'الدخول برابط سحري للبريد (بدون كلمة مرور)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            
            <form onSubmit={handleEmailAction} className="flex flex-col gap-3">
              {authMode === 'register' && (
                <div className="space-y-1">
                  <Label>اسم الموظف / العميل</Label>
                  <Input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="الاسم الكامل" />
                </div>
              )}
              <div className="space-y-1">
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@example.com" dir="ltr" className="text-right" />
              </div>
              {authMode !== 'forgot' && authMode !== 'emailLink' && (
                <div className="space-y-1">
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" dir="ltr" className="text-right" />
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-bold mt-2">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {authMode === 'login' ? 'دخول بحساب مخصص' : authMode === 'register' ? 'تسجيل كجديد' : authMode === 'emailLink' ? 'إرسال رابط الدخول للبريد' : 'إرسال رابط الاستعادة'}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between text-sm gap-2">
              {authMode === 'login' ? (
                <>
                  <button type="button" onClick={() => setAuthMode('forgot')} className="text-blue-600 hover:underline">نسيت كلمة المرور؟</button>
                  <button type="button" onClick={() => setAuthMode('emailLink')} className="text-emerald-700 hover:underline font-semibold">دخول برابط بدون كلمة مرور</button>
                  <button type="button" onClick={() => setAuthMode('register')} className="text-blue-600 hover:underline font-bold">إنشاء حساب مخصص</button>
                </>
              ) : (
                <button type="button" onClick={() => setAuthMode('login')} className="text-blue-600 hover:underline mx-auto">العودة لتسجيل الدخول بكلمة المرور</button>
              )}
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-500">أو</span></div>
            </div>

            <Button type="button" onClick={handleGoogleLogin} variant="outline" className="w-full text-gray-700 h-10 rounded-lg text-sm font-bold border-gray-300">
               الدخول السريع (جوجل المعتاد)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isProfileLoaded || !profile) {
    return <Onboarding />;
  }

  if (profile.role === 'pending_employee') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0F2F5] p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">في انتظار موافقة الشركة</h2>
          <p className="text-gray-500 mb-6 font-medium leading-relaxed">
            لقد تم إرسال طلب انضمامك إلى &quot;{profile.companyName || 'الشركة'}&quot;. يرجى الانتظار حتى يقوم مدير الشركة بقبول طلبك.
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 ml-2" />
            تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5]">
      {(profile.role === 'admin' || profile.role === 'owner' || profile.role === 'sales') ? (
        <AdminDashboard />
      ) : (
        <ClientDashboard />
      )}
    </div>
  );
}
