'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { signInWithPopup, signInWithRedirect, getRedirectResult, googleProvider, auth, signOut } from '@/lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
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

export default function Home() {
  const { user, profile, isAuthReady, isProfileLoaded } = useStore();
  
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getRedirectResult(auth).catch(error => {
      console.error("Redirect redirect result error:", error);
    });
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
      }
    } catch (error: any) {
      console.error("Auth failed:", error);
      let msg = 'حدث خطأ غير متوقع';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      else if (error.code === 'auth/email-already-in-use') msg = 'هذا البريد الإلكتروني مسجل مسبقاً';
      else if (error.code === 'auth/weak-password') msg = 'كلمة المرور ضعيفة جداً';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed:", error);
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
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mt-2">نظام إدارة الطلبات</CardTitle>
            <CardDescription className="text-gray-500">
              {authMode === 'login' && 'تسجيل الدخول للمتابعة'}
              {authMode === 'register' && 'إنشاء حساب جديد'}
              {authMode === 'forgot' && 'استعادة كلمة المرور'}
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
              {authMode !== 'forgot' && (
                <div className="space-y-1">
                  <Label>كلمة المرور</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" dir="ltr" className="text-right" />
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-bold mt-2">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {authMode === 'login' ? 'دخول بحساب مخصص' : authMode === 'register' ? 'تسجيل كجديد' : 'إرسال الرابط'}
              </Button>
            </form>

            <div className="flex flex-wrap items-center justify-between text-sm">
              {authMode === 'login' ? (
                <>
                  <button type="button" onClick={() => setAuthMode('forgot')} className="text-blue-600 hover:underline">نسيت كلمة المرور؟</button>
                  <button type="button" onClick={() => setAuthMode('register')} className="text-blue-600 hover:underline font-bold">إنشاء حساب مخصص</button>
                </>
              ) : (
                <button type="button" onClick={() => setAuthMode('login')} className="text-blue-600 hover:underline mx-auto">العودة لتسجيل الدخول</button>
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
