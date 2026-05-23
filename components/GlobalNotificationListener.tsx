'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function GlobalNotificationListener() {
  const { profile, user, setUnreadNotifications } = useStore();
  const initialLoadRef = useRef(true);
  const knownNotifIds = useRef<Set<string>>(new Set());

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

        snap.docs.forEach(doc => {
          const data = doc.data();
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

    const unsub = onSnapshot(qNotifs, (snap) => {
      let unreadCount = 0;
      let hasNewUnread = false;

      snap.docs.forEach(doc => {
        const data = doc.data();
        const isRead = data.readBy && data.readBy.includes(user.uid);
        if (!isRead) {
          unreadCount++;
          if (!initialLoadRef.current && !knownNotifIds.current.has(doc.id)) {
            hasNewUnread = true;
          }
        }
        knownNotifIds.current.add(doc.id);
      });

      // Stale orders check
      let unsubOrders = () => {};
      
      if (['admin', 'owner', 'sales'].includes(profile.role)) {
        const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
        const qOrders = query(
          collection(db, 'orders'),
          where('companyId', '==', profile.companyId),
          where('isDeleted', '==', false),
          where('status', 'in', ['pending', 'processing']) // Unconfirmed
        );

        // We just use another snapshot for stale orders to add to the count
        unsubOrders = onSnapshot(qOrders, (ordersSnap) => {
          const stales = ordersSnap.docs.filter((o: any) => {
            const data = o.data();
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
            return createdAt < fourHoursAgo;
          });
          
          setUnreadNotifications(unreadCount + stales.length);
          
          if (hasNewUnread) {
            // Play sound
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.error("Audio play blocked", e));
            } catch (err) {}
          }
        });
      } else {
        setUnreadNotifications(unreadCount);
        if (hasNewUnread) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.error("Audio play blocked", e));
          } catch (err) {}
        }
      }

      initialLoadRef.current = false;
      return () => unsubOrders();
      
    }, (error) => {
      console.error("Error fetching notifications", error);
    });

    return () => {
      unsub();
    };
  }, [profile?.companyId, user?.uid, setUnreadNotifications]);

  return null;
}
