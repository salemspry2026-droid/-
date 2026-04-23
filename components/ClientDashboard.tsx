'use client';

import { useState } from 'react';
import { ClientProducts } from './ClientProducts';
import { ClientOrders } from './ClientOrders';
import { ClientHomeTab } from './ClientHomeTab';
import { useStore } from '@/lib/store';
import { NotificationsDialog } from './NotificationsDialog';
import { LayoutGrid, ShoppingBag, ReceiptText, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ClientDashboard() {
  const { activeTab, setActiveTab, isNotificationsOpen, setIsNotificationsOpen, setSelectedOrderId } = useStore();

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <main className="p-4 max-w-md mx-auto">
        {activeTab === 'home' && <ClientHomeTab onNavigate={setActiveTab} />}
        {activeTab === 'products' && <ClientProducts onNavigate={setActiveTab} />}
        {activeTab === 'orders' && <ClientOrders />}
        {activeTab === 'profile' && <div className="p-4 text-center text-gray-500">الملف الشخصي (قريباً)</div>}
      </main>

      <NotificationsDialog 
        open={isNotificationsOpen} 
        onOpenChange={setIsNotificationsOpen}
        onSelectOrder={(id) => {
          setSelectedOrderId(id);
          setActiveTab('orders');
        }}
      />

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-6 py-2 flex justify-between items-center max-w-md mx-auto">
        <NavItem 
          icon={<LayoutGrid className="w-6 h-6" />} 
          label="الرئيسية" 
          isActive={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
        />
        <NavItem 
          icon={<ShoppingBag className="w-6 h-6" />} 
          label="المنتجات" 
          isActive={activeTab === 'products'} 
          onClick={() => setActiveTab('products')} 
        />
        <NavItem 
          icon={<ReceiptText className="w-6 h-6" />} 
          label="طلباتي" 
          isActive={activeTab === 'orders'} 
          onClick={() => setActiveTab('orders')} 
        />
        <NavItem 
          icon={<User className="w-6 h-6" />} 
          label="حسابي" 
          isActive={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
        />
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors",
        isActive ? "text-green-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
