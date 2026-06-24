import { auth, db } from '@/lib/firebase';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const authService = {
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      throw error;
    }
  },

  getUserProfile: async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'userProfiles', uid));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  }
};
