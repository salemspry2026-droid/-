'use client';

import { useState } from 'react';
import { ClientProducts } from './ClientProducts';
import { ClientOrders } from './ClientOrders';
import { ClientHomeTab } from './ClientHomeTab';
import ClientProfile from './ClientProfile';
import { useStore } from '@/lib/store';
import { NotificationsDialog } from './NotificationsDialog';
import { GlobalNotificationListener } from './GlobalNotificationListener';
import { LayoutGrid, ShoppingBag, ReceiptText, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClientDashboard() {
  const { profile, activeTab, setActiveTab, isNotificationsOpen, setIsNotificationsOpen, setSelectedOrderId, unreadNotifications } = useStore();

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 md:pb-0 md:pr-64 flex flex-col transition-all duration-300">
      <GlobalNotificationListener />
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 right-0 bg-white border-l border-gray-200 z-40 shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">بوابة العملاء</h2>
            <p className="text-sm text-gray-500 mt-1">{profile?.displayName || 'عميل'}</p>
          </div>
          <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 text-gray-500 hover:text-green-600 transition-colors">
            <Bell className="w-6 h-6" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in zoom-in">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-4">
          <SidebarItem icon={<LayoutGrid className="w-5 h-5" />} label="الرئيسية" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <SidebarItem icon={<ShoppingBag className="w-5 h-5" />} label="المنتجات" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <SidebarItem icon={<ReceiptText className="w-5 h-5" />} label="طلباتي" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarItem icon={<User className="w-5 h-5" />} label="حسابي" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>
      </aside>

      {/* Mobile Header (Only visible on mobile) */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-sm sticky top-0 z-30">
        <div>
          <h2 className="text-xl font-bold text-gray-900">بوابة العملاء</h2>
          <p className="text-xs text-gray-500">{profile?.displayName || 'عميل'}</p>
        </div>
        <button onClick={() => setIsNotificationsOpen(true)} className="relative p-2 text-gray-500 hover:text-green-600 transition-colors">
          <Bell className="w-6 h-6" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in zoom-in">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>
      </div>

      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto transition-all duration-300">
        <div className="w-full">
          {activeTab === 'home' && <ClientHomeTab onNavigate={setActiveTab} />}
          {activeTab === 'products' && <ClientProducts onNavigate={setActiveTab} />}
          {activeTab === 'orders' && <ClientOrders />}
          {activeTab === 'profile' && <ClientProfile />}
        </div>
      </main>

      <NotificationsDialog 
        open={isNotificationsOpen} 
        onOpenChange={setIsNotificationsOpen}
        onSelectOrder={(id) => {
          setSelectedOrderId(id);
          setActiveTab('orders');
        }}
      />

      {/* Bottom Navigation (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-6 py-2 flex justify-between items-center mx-auto">
        <NavItem icon={<LayoutGrid className="w-6 h-6" />} label="الرئيسية" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<ShoppingBag className="w-6 h-6" />} label="المنتجات" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} />
        <NavItem icon={<ReceiptText className="w-6 h-6" />} label="طلباتي" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <NavItem icon={<User className="w-6 h-6" />} label="حسابي" isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors", isActive ? "text-green-600" : "text-gray-400 hover:text-gray-600")}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-right", isActive ? "bg-green-50 text-green-700 font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
