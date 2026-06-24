import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';

export const settingsService = {
  subscribeToCompanySettings: (companyId: string, onData: (data: any) => void) => {
    if (!companyId) return () => {};
    return onSnapshot(doc(db, 'companies', companyId), (doc) => {
      onData(doc.exists() ? { id: doc.id, ...doc.data() } : null);
    });
  },

  updateCompanyCurrencies: async (companyId: string, primaryCurrency: string, secondaryCurrencies: string[], exchangeRates: Record<string, number>, userId: string) => {
    await updateDoc(doc(db, 'companies', companyId), {
      primaryCurrency,
      secondaryCurrencies,
      exchangeRates,
      updatedAt: serverTimestamp(),
      updatedBy: userId
    });
  },

  subscribeToCollection: (companyId: string, collectionName: string, onData: (data: any[]) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, collectionName),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    });
  },

  addDocument: async (companyId: string, collectionName: string, data: any, userId: string) => {
    return await addDoc(collection(db, collectionName), {
      ...data,
      companyId,
      createdBy: userId,
      createdAt: serverTimestamp(),
      isDeleted: false
    });
  },

  updateDocument: async (collectionName: string, docId: string, data: any, userId: string) => {
    await updateDoc(doc(db, collectionName, docId), {
      ...data,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    });
  },

  softDeleteDocument: async (collectionName: string, docId: string, userId: string) => {
    await updateDoc(doc(db, collectionName, docId), {
      isDeleted: true,
      updatedBy: userId,
      updatedAt: serverTimestamp()
    });
  }
};
