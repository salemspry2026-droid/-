'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { notificationService } from '@/lib/services/notificationService';
import { orderService } from '@/lib/services/orderService';
import { toast } from 'sonner';

export function GlobalNotificationListener() {
  const { profile, user, setUnreadNotifications } = useStore();
  const initialLoadRef = useRef(true);
  const knownNotifIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!profile || !user?.uid || !profile.role || !profile.companyId) return;

    const unsubNotifs = notificationService.subscribeToNotifications(
      profile.companyId,
      profile.role,
      user.uid,
      (notifications) => {
        let unreadCount = 0;
        let hasNewUnread = false;
        const now = Date.now();

        notifications.forEach(data => {
          if (data.remindAt && data.remindAt?.toDate) {
            if (data.remindAt.toDate().getTime() > now) {
              return; // skip future reminders
            }
          }

          const isRead = data.readBy && data.readBy.includes(user.uid);
          if (!isRead) {
            unreadCount++;
            if (!initialLoadRef.current && !knownNotifIds.current.has(data.id)) {
              hasNewUnread = true;
              if (profile.role === 'client') {
                toast.info(`إشعار جديد: ${data.title}`);
              }
            }
          }
          knownNotifIds.current.add(data.id);
        });

        setUnreadNotifications(unreadCount);

        if (hasNewUnread) {
          try {
            const url = profile.role === 'client' 
              ? '/notification.mp3' 
              : 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
            const audio = new Audio(url);
            audio.play().catch(e => console.log('Audio play failed', e));
          } catch (err) {}
        }
      },
      (err) => {
        if ((err as any)?.code !== 'permission-denied') console.warn("Notif listener err:", err);
      }
    );

    let unsubOrders = () => {};
      
    if (['admin', 'owner', 'sales'].includes(profile.role)) {
      unsubOrders = orderService.subscribeToOrders(profile.companyId, () => {}, (error) => {
        if ((error as any).code !== 'permission-denied') console.warn("Orders listener err:", error);
      });
    }

    const timer = setTimeout(() => { initialLoadRef.current = false; }, 2000);

    return () => {
      unsubNotifs();
      unsubOrders();
      clearTimeout(timer);
    };
  }, [profile?.companyId, profile?.role, user?.uid, setUnreadNotifications, profile]);

  return null;
}
