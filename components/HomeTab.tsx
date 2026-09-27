'use client';

import { useStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Settings, Bell, PhoneCall, CheckCircle2, Clock, Package, Plus, LogOut, Shield, TrendingUp } from 'lucide-react';
import { OfflineStatus } from './OfflineStatus';
import { DownloadAppButton } from './DownloadAppButton';
import { useState, useEffect } from 'react';
import { auth, signOut } from '@/lib/firebase';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CompanySettingsDialog } from './CompanySettings';

import { OrderDetailsDialog } from './OrderDetailsDialog';
import { AdministrationDialog } from './AdministrationDialog';
import { orderService } from '@/lib/services/orderService';
import { settingsService } from '@/lib/services/settingsService';

export function HomeTab() {
  const { profile, setIsNotificationsOpen, setIsCallRecordingsOpen, setActiveTab, unreadNotifications } = useStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderStages, setOrderStages] = useState<any[]>([]);
  const [companyCurrency, setCompanyCurrency] = useState('ر.س');
  const [isCompanySettingsOpen, setIsCompanySettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  
  const [dashboardStats, setDashboardStats] = useState({
    todayCount: 0,
    delegateCount: 0,
    customerCount: 0,
    totalSalesToday: 0,
    avgSalesToday: 0,
    stageCounts: {} as Record<string, number>
  });
  
  useEffect(() => {
    // Data Migration: Disabled to prevent permission loops
  }, [orders.length, profile?.companyId]);
  
  useEffect(() => {
    if (!profile?.companyId) return;

    const unsubCompany = settingsService.subscribeToCompanySettings(profile.companyId, (data) => {
      if (data) {
        setCompanyCurrency(data.primaryCurrency || 'ر.س');
      }
    });

    const unsubStages = orderService.subscribeToOrderStages(profile.companyId, (stages) => {
      setOrderStages(stages);
      
      // Fetch dashboard stats after stages are loaded
      orderService.getDashboardStats(profile.companyId, companyCurrency, stages).then(stats => {
        if (stats) setDashboardStats(stats);
      }).catch(err => console.error("Error fetching stats:", err));
    }, (error) => console.error(error));

    const unsubOrders = orderService.subscribeToRecentOrders(profile.companyId, 5, (fetched) => {
      setOrders(fetched);
    });

    return () => {
      unsubCompany();
      unsubStages();
      unsubOrders();
    };
  }, [profile?.companyId, companyCurrency]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const { totalSalesToday, todayCount, delegateCount, customerCount, avgSalesToday, stageCounts } = dashboardStats;

  const fallbackStages = [
    { id: 'pending', name: 'جديد', color: 'bg-blue-50 text-blue-900 border-blue-200', iconBg: 'bg-blue-600 text-white', iconContent: 'NEW' },
    { id: 'processing', name: 'مراجعة', color: 'bg-orange-50 text-orange-600 border-orange-200', iconBg: 'bg-orange-100 text-orange-500', iconContent: <Clock className="w-4 h-4"/> },
    { id: 'completed', name: 'مؤكد', color: 'bg-green-50 text-green-600 border-green-200', iconBg: 'bg-green-100 text-green-500', iconContent: <CheckCircle2 className="w-4 h-4"/> },
    { id: 'delivered', name: 'مُسلّم', color: 'bg-gray-100 text-gray-700 border-gray-200', iconBg: 'bg-gray-200 text-gray-500', iconContent: <Package className="w-4 h-4"/> }
  ];

  const stagesToDisplay = orderStages.length > 0 
    ? orderStages.map((s, idx) => {
        let colorClass = 'bg-gray-50 text-gray-800';
        let iconClass = 'bg-gray-200 text-gray-600';
        if (idx === 0) { colorClass = 'bg-blue-50 text-blue-900'; iconClass = 'bg-blue-600 text-white'; }
        else if (idx === 1) { colorClass = 'bg-orange-50 text-orange-600'; iconClass = 'bg-orange-100 text-orange-500'; }
        else if (idx === 2) { colorClass = 'bg-green-50 text-green-600'; iconClass = 'bg-green-100 text-green-500'; }
        else if (idx === 3) { colorClass = 'bg-purple-50 text-purple-700'; iconClass = 'bg-purple-100 text-purple-600'; }
        
        return {
          id: s.name, // The user sets custom string names like "قيد التجهيز", which becomes the status value
          name: s.name,
          color: colorClass,
          iconBg: iconClass,
          iconContent: idx === 0 ? 'NEW' : <Clock className="w-4 h-4"/>
        };
      })
    : fallbackStages;

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col gap-4">
        <OfflineStatus />
        <DownloadAppButton variant="outline" label="تحميل تطبيق أندرويد APK" className="w-full h-12 text-base rounded-xl" />

        <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{profile?.companyName || 'الشركة'}</p>
              <p className="text-xs text-gray-500">{profile?.role === 'owner' ? 'مالك' : profile?.role === 'admin' ? 'مدير' : 'مبيعات'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="text-red-500 bg-red-50 hover:bg-red-100" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Welcome & Date */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">مرحباً {profile?.displayName}</h2>
          <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
            <Shield className="w-3 h-3" /> {profile?.role === 'owner' ? 'مالك' : 'مبيعات'}
          </span>
        </div>
        <p className="text-sm text-gray-500">{format(new Date(), 'EEEE، d MMMM yyyy', { locale: ar })}</p>
      </div>

      {/* Sales Summary Card */}
      <div className="bg-[#2E5CA6] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
        <p className="text-blue-100 text-sm mb-2">إجمالي مبيعات اليوم</p>
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-4xl font-bold">{totalSalesToday.toLocaleString()}</span>
          <span className="text-xl">{companyCurrency}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-blue-100 border-t border-blue-400/30 pt-4">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span>{todayCount} طلب</span>
          </div>
          <div className="flex items-center gap-1 opacity-75">
            <span>(</span>
            <span className="text-blue-200">{delegateCount} مندوب</span>
            <span>-</span>
            <span className="text-purple-200">{customerCount} عميل</span>
            <span>)</span>
          </div>
          <div className="flex items-center gap-1 mr-auto">
            <TrendingUp className="w-4 h-4" />
            <span>متوسط {avgSalesToday.toLocaleString(undefined, {maximumFractionDigits:0})} {companyCurrency}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Status Cards */}
      <div className={`pb-2 hide-scrollbar flex w-full ${stagesToDisplay.length > 5 ? 'gap-3 overflow-x-auto' : 'gap-2 md:gap-3 justify-between'}`}>
        {stagesToDisplay.map((stage) => {
          const count = stageCounts[stage.id || stage.name] || 0;
          const isScrollable = stagesToDisplay.length > 5;
          return (
            <div key={stage.id} className={`${stage.color} ${isScrollable ? 'shrink-0 w-28' : 'flex-1 min-w-0'} rounded-xl p-2 md:p-3 flex flex-col items-center justify-center text-center gap-1`}>
              <div className={`${stage.iconBg} ${typeof stage.iconContent === 'string' ? 'text-[9px] px-1 py-0.5 md:text-[10px] md:px-1.5 md:py-0.5' : 'w-5 h-5 md:w-6 md:h-6'} rounded font-bold mb-1 flex items-center justify-center shrink-0`}>
                {stage.iconContent}
              </div>
              <span className="text-lg md:text-2xl font-bold">{count}</span>
              <span className="text-[9px] md:text-xs opacity-80 whitespace-nowrap overflow-hidden text-ellipsis w-full px-0.5">{stage.name}</span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          variant="outline" 
          className="flex-1 bg-white border-gray-200 text-gray-700 h-12 rounded-xl"
          onClick={() => setIsCompanySettingsOpen(true)}
        >
          <Building2 className="w-4 h-4 ml-2 text-blue-600" /> معلومات الشركة
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 bg-white border-gray-200 text-gray-700 h-12 rounded-xl"
          onClick={() => setIsAdminOpen(true)}
        >
          <Settings className="w-4 h-4 ml-2 text-green-600" /> الإدارة
        </Button>
        <Button 
          variant="outline" 
          className="flex-1 bg-white border-gray-200 text-gray-700 h-12 rounded-xl relative overflow-hidden"
          onClick={() => setIsNotificationsOpen(true)}
        >
          <Bell className="w-4 h-4 ml-2 text-orange-500" /> الإشعارات
          {unreadNotifications > 0 && (
            <span className="absolute top-1 left-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-in zoom-in">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </Button>
      </div>

      {/* Call Recordings Manager */}
      <Button 
        variant="outline" 
        onClick={() => setIsCallRecordingsOpen(true)}
        className="w-full bg-green-50/50 border-green-200 text-green-700 border-dashed h-12 rounded-xl"
      >
        <PhoneCall className="w-4 h-4 ml-2" /> سجل تسجيلات المكالمات الواردة من العملاء
      </Button>

      {/* Latest Orders */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">آخر الطلبات</h3>
          <Button variant="link" className="text-blue-600 p-0 h-auto" onClick={() => setActiveTab('orders')}>الكل</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.slice(0, 3).map(order => {
            let timeString = '';
            if (order.createdAt) {
               const then = order.createdAt.toDate();
               timeString = format(then, 'hh:mm a', { locale: ar });
               const diffDays = Math.floor((new Date().getTime() - then.getTime()) / (1000 * 3600 * 24));
               if (diffDays === 0) timeString = `اليوم، ${timeString}`;
               else if (diffDays === 1) timeString = `أمس، ${timeString}`;
               else timeString = `${diffDays} أيام مضت`;
            }
            const totalsMap = order.totalAmountByCurrency || {};
            const currencyEntries = Object.entries(totalsMap);
            return (
            <Card key={order.id} className="border-none shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setSelectedOrderDetails(order)}>
              <CardContent className="p-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg shrink-0">
                    {order.customerName?.charAt(0) || 'ع'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-bold text-gray-900">{order.customerName}</p>
                       {order.source === 'customer' ? (
                          <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">العميل</span>
                        ) : (
                          <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">المندوب</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-xs text-gray-500">{order.id.substring(0, 8)}</p>
                       {timeString && <p className="text-xs text-gray-400 font-medium whitespace-nowrap">• {timeString}</p>}
                    </div>
                  </div>
                </div>
                <div className="text-left flex flex-col items-end">
                  {currencyEntries.length > 0 ? (
                    currencyEntries.map(([curr, amount]) => (
                      <p key={curr} className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                        {Number(amount).toLocaleString()} {curr}
                      </p>
                    ))
                  ) : (
                    <p className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                      0 {companyCurrency}
                    </p>
                  )}
                  <p className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded inline-block mt-1">
                    {(() => {
                       const st = order.status;
                       const stage = orderStages.find(s => s.id === st || s.name === st);
                       if (stage) return stage.name;
                       if (st === 'pending') return orderStages.length > 0 ? orderStages[0].name : 'جديد';
                       if (st === 'processing') return 'قيد المراجعة';
                       if (st === 'completed') return 'مؤكد';
                       if (st === 'approved') return orderStages.length > 1 ? orderStages[1].name : 'معتمد';
                       return st;
                    })()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )})}
          {orders.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">لا توجد طلبات بعد</p>
          )}
        </div>
      </div>

      <CompanySettingsDialog 
        open={isCompanySettingsOpen} 
        onOpenChange={setIsCompanySettingsOpen} 
      />
      <AdministrationDialog 
        open={isAdminOpen} 
        onOpenChange={setIsAdminOpen} 
      />
      <OrderDetailsDialog
        open={!!selectedOrderDetails}
        onOpenChange={(open) => !open && setSelectedOrderDetails(null)}
        order={selectedOrderDetails}
        stages={orderStages}
      />
    </div>
  );
}

function LogOutIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
  );
}

function ShieldIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  );
}

function TrendingUpIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
  );
}

function TruckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="15" height="10" x="1" y="3" rx="3"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  );
}
