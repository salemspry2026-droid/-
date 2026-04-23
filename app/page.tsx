'use client';

import { useStore } from '@/lib/store';
import { signInWithPopup, googleProvider, auth, signOut } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogOut } from 'lucide-react';
import { Onboarding } from '@/components/Onboarding';
import { AdminDashboard } from '@/components/AdminDashboard';
import { ClientDashboard } from '@/components/ClientDashboard';

export default function Home() {
  const { user, profile, isAuthReady, isProfileLoaded } = useStore();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F0F2F5] p-4">
        <Card className="w-full max-w-md border-none shadow-lg rounded-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">نظام إدارة الطلبات</CardTitle>
            <CardDescription className="text-gray-500">تسجيل الدخول للمتابعة</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-6">
            <Button onClick={handleLogin} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-xl text-base font-bold">
              تسجيل الدخول باستخدام Google
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
