import { auth, db, storage } from '@/lib/firebase';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  },

  updateUserProfile: async (uid: string, data: any) => {
    try {
      await updateDoc(doc(db, 'userProfiles', uid), data);
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }
  },
  
  uploadProfileImage: async (uid: string, file: Blob) => {
    try {
      const storageRef = ref(storage, `clientLogos/${uid}/${Date.now()}_logo.jpg`);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw error;
    }
  },

  subscribeToUserProfile: (uid: string, onData: (data: any | null) => void, onError: (error: any) => void) => {
    const profileRef = doc(db, 'userProfiles', uid);
    return onSnapshot(profileRef, (docSnap: any) => {
      if (docSnap.exists()) {
        onData({ id: docSnap.id, ...docSnap.data() });
      } else {
        onData(null);
      }
    }, onError);
  },

  toggleFavoriteProduct: async (uid: string, productId: string, isCurrentlyFav: boolean) => {
    try {
      const { arrayUnion, arrayRemove, serverTimestamp } = require('firebase/firestore');
      await updateDoc(doc(db, 'userProfiles', uid), {
        updatedAt: serverTimestamp(),
        updatedBy: uid,
        favoriteProductIds: isCurrentlyFav ? arrayRemove(productId) : arrayUnion(productId)
      });
    } catch (error) {
      console.error("Error toggling favorite product:", error);
      throw error;
    }
  },

  findClientByPhone: async (phone: string) => {
    try {
      const { query, collection, where, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'userProfiles'),
        where('phone', '==', phone),
        where('role', '==', 'client')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      return null;
    } catch (error) {
      console.error("Error looking up client by phone:", error);
      return null;
    }
  },

  findClientsWithFavoriteProduct: async (companyId: string, productId: string) => {
    try {
      const { query, collection, where, getDocs } = require('firebase/firestore');
      const q = query(
        collection(db, 'userProfiles'),
        where('companyId', '==', companyId),
        where('role', '==', 'client'),
        where('favoriteProductIds', 'array-contains', productId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    } catch (error) {
      console.error("Error finding clients with favorite product:", error);
      return [];
    }
  }
};
