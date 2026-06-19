import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, getDocs, Timestamp, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { Loader2, Bell, Clock, PackageCheck, AlertCircle } from 'lucide-react';

export function NotificationsDialog({ 
  open, 
  onOpenChange,
  onSelectOrder,
  onJoinRequest
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  onSelectOrder?: (orderId: string) => void,
  onJoinRequest?: (notif: any) => void
}) {
  const { profile, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [dbNotifications, setDbNotifications] = useState<any[]>([]);
  const [staleOrders, setStaleOrders] = useState<any[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open || !profile || !user?.uid) return;

    if (profile.role === 'client') {
      const qNotifs = query(
        collection(db, 'notifications'), 
        where('clientUid', '==', user.uid),
        where('isDeleted', '==', false)
      );
      const unsubNotifs = onSnapshot(qNotifs, (snap) => {
        setDbNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, (error) => {
        if ((error as any).code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'notifications');
        }
        setLoading(false);
      });
      return () => unsubNotifs();
    }

    if (!profile.companyId) return;

    // 1. Listen to database notifications
    const qNotifs = query(
      collection(db, 'notifications'), 
      where('companyId', '==', profile.companyId),
      where('isDeleted', '==', false)
    );

    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      setDbNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    // 2. Fetch Stale Orders (unconfirmed for more than 4 hours)
    // Client-side mapping
    let unsubOrders = () => {};
    if (profile.role && ['admin', 'owner', 'sales'].includes(profile.role) && profile.companyId) {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const qOrders = query(
        collection(db, 'orders'),
        where('companyId', '==', profile.companyId as string),
        where('isDeleted', '==', false),
        where('status', 'in', ['pending', 'processing']) // Unconfirmed
      );

      unsubOrders = onSnapshot(qOrders, (snap) => {
        const allPending = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const stales = allPending.filter((o: any) => {
          const createdAt = o.createdAt?.toDate ? o.createdAt.toDate() : new Date();
          return createdAt < fourHoursAgo;
        });
        setStaleOrders(stales);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      });
    }

    return () => {
      unsubNotifs();
      unsubOrders();
    };
  }, [open, profile?.companyId, profile?.role, user?.uid, profile]);

  const markAsRead = async (notification: any) => {
    if (!user?.uid || notification.readBy?.includes(user?.uid) || notification.isStaleAlert) return;
    try {
      await updateDoc(doc(db, 'notifications', notification.id), {
        readBy: [...(notification.readBy || []), user.uid],
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${notification.id}`);
    }
  };

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif);
    onOpenChange(false);
    if (notif.type === 'join_request' && onJoinRequest) {
      onJoinRequest(notif);
    } else if (notif.orderId && onSelectOrder) {
      onSelectOrder(notif.orderId);
    }
  };

  // Combine and sort notifications
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const now = Date.now();
  const visibleDbNotifications = dbNotifications.filter(n => {
    if (n.remindAt && n.remindAt?.toDate) {
      if (n.remindAt.toDate().getTime() > now) {
        return false;
      }
    }
    return true;
  });

  const combinedNotifications = [
    ...visibleDbNotifications,
    ...staleOrders.map(order => ({
      id: `stale-${order.id}`,
      title: 'طلب معلق يحتاج تأكيد',
      message: `طلب رقم #${order.id.substring(0, 6)} للعميل ${order.customerName} مسجل منذ وقت طويل ولم يتم تأكيده.`,
      type: 'stale_order',
      orderId: order.id,
      createdAt: order.createdAt,
      readBy: [],
      isStaleAlert: true
    }))
  ].sort((a: any, b: any) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return bTime - aTime;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] max-h-[85vh] flex flex-col p-0 overflow-hidden bg-[#F0F2F5]">
        <DialogHeader className="p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-800">
            <Bell className="w-5 h-5 text-orange-500" />
            الإشعارات
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : combinedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <Bell className="w-12 h-12 mb-4 text-gray-300" />
              <p>لا توجد إشعارات حالياً</p>
            </div>
          ) : (
            combinedNotifications.map(notif => {
              const isRead = notif.isStaleAlert ? false : notif.readBy?.includes(user?.uid);
              return (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer ${isRead ? 'border-gray-100 opacity-70' : 'border-blue-100 ring-1 ring-blue-50'}`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${notif.type === 'stale_order' ? 'bg-orange-100 text-orange-600' : notif.type === 'client_order' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                      {notif.type === 'stale_order' ? <Clock className="w-5 h-5" /> : 
                       notif.type === 'client_order' ? <PackageCheck className="w-5 h-5" /> : 
                       <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-bold ${isRead ? 'text-gray-700' : 'text-gray-900'}`}>{notif.title}</h4>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                      {notif.createdAt && (
                        <p className="text-[10px] text-gray-400 mt-2 font-mono" dir="ltr">
                          {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('ar-SA') : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
