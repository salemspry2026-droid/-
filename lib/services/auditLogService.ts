import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const auditLogService = {
  logAction: async (
    companyId: string,
    action: string,
    details: any,
    userId: string
  ) => {
    try {
      const docRef = doc(collection(db, 'auditLogs'));
      await setDoc(docRef, {
        companyId,
        action,
        details,
        createdAt: serverTimestamp(),
        createdBy: userId,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error writing audit log:", error);
      // We don't throw because audit logging shouldn't break the main flow usually, 
      // but if strictly required, we could throw.
    }
  }
};
