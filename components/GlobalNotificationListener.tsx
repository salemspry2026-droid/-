'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { toast } from 'sonner';

export function GlobalNotificationListener() {
  const { profile, user, setUnreadNotifications } = useStore();
  const initialLoadRef = useRef(true);
  const knownNotifIds = useRef<Set<string>>(new Set());

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile || !user?.uid) return;

    if (profile.role === 'client') {
      const qNotifs = query(
        collection(db, 'notifications'), 
        where('clientUid', '==', user.uid),
        where('isDeleted', '==', false)
      );
      
      const unsub = onSnapshot(qNotifs, (snap) => {
        let unreadCount = 0;
        let hasNewUnread = false;
        const now = Date.now();

        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.remindAt && data.remindAt?.toDate) {
            if (data.remindAt.toDate().getTime() > now) {
              return; // skip future reminders
            }
          }

          const isRead = data.readBy && data.readBy.includes(user.uid);
          if (!isRead) {
            unreadCount++;
            if (!initialLoadRef.current && !knownNotifIds.current.has(doc.id)) {
              hasNewUnread = true;
              toast.info(`إشعار جديد: ${data.title}`);
            }
          }
          knownNotifIds.current.add(doc.id);
        });

        setUnreadNotifications(unreadCount);
        
        if (hasNewUnread) {
          // Play sound
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play failed', e));
        }
      }, (err) => {
        if ((err as any)?.code !== 'permission-denied') console.warn("Notif client err:", err);
      });

      const timer = setTimeout(() => { initialLoadRef.current = false; }, 2000);
      return () => { unsub(); clearTimeout(timer); };
    }

    if (!profile.companyId) return;

    const qNotifs = query(
      collection(db, 'notifications'), 
      where('companyId', '==', profile.companyId),
      where('isDeleted', '==', false)
    );

      const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      let unreadCount = 0;
      let hasNewUnread = false;
      const now = Date.now();

      snap.docs.forEach(doc => {
        const data = doc.data();
        if (data.remindAt && data.remindAt?.toDate) {
          if (data.remindAt.toDate().getTime() > now) {
            return; // skip future reminders
          }
        }

        const isRead = data.readBy && data.readBy.includes(user.uid);
        if (!isRead) {
          unreadCount++;
          if (!initialLoadRef.current && !knownNotifIds.current.has(doc.id)) {
            hasNewUnread = true;
          }
        }
        knownNotifIds.current.add(doc.id);
      });
      
      setUnreadNotifications(unreadCount);

      if (hasNewUnread) {
        try {
          // Play sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.error("Audio play blocked", e));
        } catch (err) {}
      }
      initialLoadRef.current = false;

    }, (error) => {
      if ((error as any).code !== 'permission-denied') console.warn("Notif listener err:", error);
    });

    let unsubOrders = () => {};
      
    if (profile.role && ['admin', 'owner', 'sales'].includes(profile.role) && profile.companyId) {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      const qOrders = query(
        collection(db, 'orders'),
        where('companyId', '==', profile.companyId as string),
        where('isDeleted', '==', false),
        where('status', 'in', ['pending', 'processing']) // Unconfirmed
      );

      unsubOrders = onSnapshot(qOrders, (ordersSnap) => {
        const stales = ordersSnap.docs.filter((o: any) => {
          const data = o.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          return createdAt < fourHoursAgo;
        });
        
        // This will update repeatedly but that's better than leaking listeners
        // Just adding an extra warning for stale orders would require syncing state.
      }, (error) => {
        if ((error as any).code !== 'permission-denied') console.warn("Orders listener err:", error);
      });
    }

    return () => {
      unsubNotifs();
      unsubOrders();
    };
  }, [profile?.companyId, profile?.role, user?.uid, setUnreadNotifications]);

  return null;
}
