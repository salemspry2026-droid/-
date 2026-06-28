import { db } from '@/lib/firebase';
import { collection, doc, query, where, getDocs, getDoc, updateDoc, setDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';

export const customerService = {
  subscribeToAllCustomers: (companyId: string, onData: (data: any[]) => void, onError?: (err: any) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'customers'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    }, onError);
  },

  subscribeToPaginatedCustomers: (
    companyId: string,
    limitCount: number,
    onData: (data: any[]) => void,
    onError?: (err: any) => void
  ) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'customers'),
      where('companyId', '==', companyId),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    return onSnapshot(q, (snap) => {
      onData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
    }, onError);
  },
  getCustomersByCompanyId: async (companyId: string) => {
    if (!companyId) return [];
    try {
      const q = query(
        collection(db, 'customers'),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() as any }))
        .filter(c => !c.isDeleted);
    } catch (error) {
      console.error("Error fetching customers:", error);
      throw error;
    }
  },

  createCustomer: async (customerId: string, companyId: string, customerData: any, userId: string) => {
    try {
      const docRef = doc(db, 'customers', customerId || `cust_${crypto.randomUUID()}`);
      await setDoc(docRef, {
        ...customerData,
        companyId,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  },

  updateCustomer: async (customerId: string, customerData: any, userId: string, companyId?: string) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, {
        ...customerData,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
      if (companyId) {
        import('@/lib/services/auditLogService').then(({ auditLogService }) => {
          auditLogService.logAction(companyId, 'UPDATE_CUSTOMER', { customerId, keysChanged: Object.keys(customerData) }, userId);
        });
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  },

  softDeleteCustomer: async (customerId: string, userId: string, companyId?: string) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
      if (companyId) {
        import('@/lib/services/auditLogService').then(({ auditLogService }) => {
          auditLogService.logAction(companyId, 'DELETE_CUSTOMER', { customerId }, userId);
        });
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  }
};
