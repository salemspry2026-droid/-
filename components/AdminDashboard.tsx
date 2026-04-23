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
    <div className="min-h-screen bg-[#F0F2F5] pb-20">
      <main className="p-4 max-w-md mx-auto">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'orders' && <OrdersManager />}
        {activeTab === 'products' && <ProductsManager />}
        {activeTab === 'customers' && <CustomersManager />}
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

      {/* Floating Action Button */}
      <div className="fixed bottom-24 right-6 z-50">
        <Button 
          onClick={() => setIsOrderRegistrationOpen(true)}
          className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center text-white"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-6 py-2 flex justify-between items-center max-w-md mx-auto">
        <NavItem 
          icon={<LayoutGrid className="w-6 h-6" />} 
          label="الرئيسية" 
          isActive={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
        />
        <NavItem 
          icon={<ReceiptText className="w-6 h-6" />} 
          label="الطلبات" 
          isActive={activeTab === 'orders'} 
          onClick={() => setActiveTab('orders')} 
        />
        <NavItem 
          icon={<Package className="w-6 h-6" />} 
          label="الأصناف" 
          isActive={activeTab === 'products'} 
          onClick={() => setActiveTab('products')} 
        />
        <NavItem 
          icon={<Users className="w-6 h-6" />} 
          label="العملاء" 
          isActive={activeTab === 'customers'} 
          onClick={() => setActiveTab('customers')} 
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
        isActive ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
