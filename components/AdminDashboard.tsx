'use client';

import { useState } from 'react';
import { ProductsManager } from './ProductsManager';
import { CustomersManager } from './CustomersManager';
import { OrdersManager } from './OrdersManager';
import { HomeTab } from './HomeTab';
import { useStore } from '@/lib/store';
import { NotificationsDialog } from './NotificationsDialog';
import { CallRecordingsManager } from './CallRecordingsManager';
import { ActiveCallOverlay } from './ActiveCallOverlay';
import { OrderRegistrationDialog } from './OrderRegistrationDialog';
import { LayoutGrid, ReceiptText, Package, Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

export function AdminDashboard() {
  const { profile, activeTab, setActiveTab, isNotificationsOpen, setIsNotificationsOpen, setSelectedOrderId } = useStore();
  const [isOrderRegistrationOpen, setIsOrderRegistrationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-20 md:pb-0 md:pr-64 flex flex-col transition-all duration-300">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 fixed top-0 bottom-0 right-0 bg-white border-l border-gray-200 z-40 shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">نظام الطلبات</h2>
          <p className="text-sm text-gray-500 mt-1">{profile?.name || 'مدير النظام'}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-2 px-4">
          <SidebarItem icon={<LayoutGrid className="w-5 h-5" />} label="الرئيسية" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <SidebarItem icon={<ReceiptText className="w-5 h-5" />} label="الطلبات" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
          <SidebarItem icon={<Package className="w-5 h-5" />} label="الأصناف" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <SidebarItem icon={<Users className="w-5 h-5" />} label="العملاء" isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
        </nav>
        <div className="p-4 border-t border-gray-100">
           <Button onClick={() => setIsOrderRegistrationOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2">
             <Plus className="w-5 h-5" />
             طلب جديد
           </Button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 w-full max-w-7xl mx-auto transition-all duration-300">
        <div className="w-full">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'orders' && <OrdersManager />}
          {activeTab === 'products' && <ProductsManager />}
          {activeTab === 'customers' && <CustomersManager />}
        </div>
      </main>

      <ActiveCallOverlay />
      <CallRecordingsManager />
      
      <OrderRegistrationDialog 
        open={isOrderRegistrationOpen} 
        onOpenChange={setIsOrderRegistrationOpen} 
      />

      <NotificationsDialog 
        open={isNotificationsOpen} 
        onOpenChange={setIsNotificationsOpen}
        onSelectOrder={(id) => {
          setSelectedOrderId(id);
          setActiveTab('orders');
        }}
      />

      {/* Floating Action Button (Mobile Only) */}
      <div className="md:hidden fixed bottom-24 right-6 z-50">
        <Button 
          onClick={() => setIsOrderRegistrationOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center text-white"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-6 py-2 flex justify-between items-center mx-auto">
        <NavItem icon={<LayoutGrid className="w-6 h-6" />} label="الرئيسية" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavItem icon={<ReceiptText className="w-6 h-6" />} label="الطلبات" isActive={activeTab === 'orders'} onClick={() => setActiveTab('orders')} />
        <NavItem icon={<Package className="w-6 h-6" />} label="الأصناف" isActive={activeTab === 'products'} onClick={() => setActiveTab('products')} />
        <NavItem icon={<Users className="w-6 h-6" />} label="العملاء" isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center gap-1 w-16 h-14 transition-colors", isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600")}>
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-right", isActive ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

