import { db } from '@/lib/firebase';
import { collection, doc, query, where, getDocs, getDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

export const companyService = {
  subscribeToCompanyStaff: (companyId: string, onData: (staff: any[]) => void) => {
    if (!companyId) return () => {};
    const q = query(
      collection(db, 'userProfiles'),
      where('companyId', '==', companyId)
    );
    return onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.role !== 'client') {
          users.push({ id: doc.id, ...data });
        }
      });
      onData(users);
    });
  },

  subscribeToAllCompanies: (onData: (data: any[]) => void, onError?: (err: any) => void) => {
    const q = query(
      collection(db, 'companies'),
      where('isDeleted', '==', false)
    );
    return onSnapshot(q, (snapshot) => {
      onData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, onError);
  },

  subscribeToCompany: (companyId: string, onData: (data: any | null) => void, onError?: (err: any) => void) => {
    if (!companyId) return () => {};
    const companyRef = doc(db, 'companies', companyId);
    return onSnapshot(companyRef, (docSnap) => {
      if (docSnap.exists()) {
        onData({ id: docSnap.id, ...docSnap.data() });
      } else {
        onData(null);
      }
    }, onError);
  },

  updateEmployee: async (empId: string, data: any, userId: string, companyId?: string) => {
    try {
      await updateDoc(doc(db, 'userProfiles', empId), {
        ...data,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      });
      if (companyId) {
        import('@/lib/services/auditLogService').then(({ auditLogService }) => {
          auditLogService.logAction(companyId, 'UPDATE_EMPLOYEE_ROLE', { empId, keysChanged: Object.keys(data) }, userId);
        });
      }
    } catch (error) {
      console.error("Error updating employee", error);
      throw error;
    }
  },

  getCompaniesByIds: async (companyIds: string[]) => {
    if (!companyIds || companyIds.length === 0) return [];
    try {
      const chunks = [];
      for (let i = 0; i < companyIds.length; i += 30) {
        chunks.push(companyIds.slice(i, i + 30));
      }
      const allComps = [];
      for (const chunk of chunks) {
        const q = query(
          collection(db, 'companies'),
          where('__name__', 'in', chunk)
        );
        const snap = await getDocs(q);
        allComps.push(...snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any })));
      }
      return allComps;
    } catch (error) {
      console.error("Error fetching companies by ids", error);
      throw error;
    }
  },

  getCompanyById: async (companyId: string) => {
    if (!companyId) return null;
    try {
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) return null;
      const data = companySnap.data();
      if (data.isDeleted) return null;
      return { id: companySnap.id, ...data };
    } catch (error) {
      console.error("Error fetching company details:", error);
      throw error;
    }
  },

  getCompanyStaff: async (companyId: string) => {
    if (!companyId) return [];
    try {
      const q = query(
        collection(db, 'userProfiles'),
        where('companyId', '==', companyId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    } catch (error) {
      console.error("Error fetching company staff:", error);
      throw error;
    }
  },

  updateCompanySettings: async (companyId: string, settingsData: any, userId: string) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        ...settingsData,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
    } catch (error) {
      console.error("Error updating company:", error);
      throw error;
    }
  }
};
