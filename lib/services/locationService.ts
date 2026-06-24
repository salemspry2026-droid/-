import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export const locationService = {
  subscribeToLocations: (companyId: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'locations'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, onError);
  }
};
