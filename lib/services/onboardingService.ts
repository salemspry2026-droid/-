import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/utils';

export const onboardingService = {
  joinAsEmployee: async (joinCode: string, user: any) => {
    if (!joinCode.trim() || !user) throw new Error("Missing data");

    try {
      const q = query(collection(db, 'companies'), where('joinCode', '==', joinCode.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('رمز الانضمام غير صحيح');
      }

      const companyDoc = querySnapshot.docs[0];
      const selectedCompanyId = companyDoc.id;

      // Create user profile as pending employee
      await setDoc(doc(db, 'userProfiles', user.uid), {
        email: user.email,
        displayName: user.displayName || 'User',
        companyId: null, // Don't give access yet
        pendingCompanyId: selectedCompanyId,
        companyName: companyDoc.data().name || '',
        role: 'pending_employee',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      });

      // Create join request notification for the owner/admin
      await setDoc(doc(db, 'notifications', `join_${user.uid}`), {
        companyId: selectedCompanyId,
        type: 'join_request',
        title: 'طلب انضمام جديد',
        message: `المستخدم ${user.displayName || user.email} يطلب الانضمام كموظف لشركتك.`,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (error: any) {
      if (error.message === 'رمز الانضمام غير صحيح') throw error;
      handleFirestoreError(error, OperationType.CREATE, 'join_process');
      throw new Error('حدث خطأ أثناء تقديم طلب الانضمام.');
    }
  },

  joinAsClient: async (user: any, phone: string, storeName: string) => {
    if (!user || !phone.trim() || !storeName.trim()) throw new Error("Missing data");

    try {
      await setDoc(doc(db, 'userProfiles', user.uid), {
        email: user.email,
        displayName: user.displayName || 'Customer',
        phone: phone.trim(),
        storeName: storeName.trim(),
        companyId: '', // Clients don't belong to a specific company
        role: 'client',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, `userProfiles/${user.uid}`);
      throw new Error('فشل إنشاء حساب العميل.');
    }
  },

  createCompany: async (companyName: string, user: any) => {
    if (!companyName.trim() || !user) throw new Error("Missing data");

    try {
      const companyId = `comp_${Math.random().toString(36).substring(2, 11)}`;
      const generatedJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create company document
      await setDoc(doc(db, 'companies', companyId), {
        name: companyName,
        joinCode: generatedJoinCode,
        ownerId: user.uid,
        isActive: true,
        companyType: 'other',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      });

      // Create user profile as an owner
      await setDoc(doc(db, 'userProfiles', user.uid), {
        email: user.email,
        displayName: user.displayName || 'Owner',
        companyId: companyId,
        role: 'owner',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,
        isDeleted: false
      });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.CREATE, 'company_creation');
      throw new Error('حدث خطأ أثناء إنشاء الشركة.');
    }
  }
};
