import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';

export const notificationService = {
  subscribeToNotifications: (companyId: string, profileRole: string, userUid: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!companyId || !profileRole || !userUid) return () => {};
    
    let q;
    if (profileRole === 'client') {
      q = query(
        collection(db, 'notifications'), 
        where('clientUid', '==', userUid),
        where('isDeleted', '==', false)
      );
    } else {
      q = query(
        collection(db, 'notifications'), 
        where('companyId', '==', companyId),
        where('isDeleted', '==', false)
      );
    }

    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    }, onError);
  },

  markAsRead: async (notifId: string, readers: string[], newReaderId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), {
      readBy: [...readers, newReaderId],
      updatedAt: serverTimestamp(),
      updatedBy: newReaderId
    });
  },

  markAsReadWithStatusCheck: async (notifId: string, readBy: string[], userUid: string) => {
     if (!readBy.includes(userUid)) {
       await updateDoc(doc(db, 'notifications', notifId), {
         readBy: [...readBy, userUid],
         updatedAt: serverTimestamp(),
         updatedBy: userUid
       });
     }
  },

  deleteNotification: async (notifId: string, userId: string) => {
    await updateDoc(doc(db, 'notifications', notifId), {
      isDeleted: true,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
  },

  createNotification: async (notificationData: any, userId: string) => {
    const { remindAt, ...rest } = notificationData;
    const notifId = `notif_${crypto.randomUUID()}`;
    const { Timestamp } = await import('firebase/firestore');
    
    await setDoc(doc(db, 'notifications', notifId), {
      ...rest,
      ...(remindAt && { remindAt: typeof remindAt === 'number' ? Timestamp.fromMillis(remindAt) : remindAt }),
      readBy: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
      isDeleted: false
    });
    return notifId;
  }
};
