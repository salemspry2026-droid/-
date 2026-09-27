import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, indexedDBLocalPersistence, browserLocalPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const isNewApp = !getApps().length;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

let auth;
if (isNewApp && typeof window !== 'undefined') {
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

const db = isNewApp
  ? initializeFirestore(app, {
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    }, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app, firebaseConfig.firestoreDatabaseId);

const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut };
