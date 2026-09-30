import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut, 
  browserPopupRedirectResolver,
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  initializeAuth 
} from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const isNewApp = !getApps().length;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

let auth: any;
if (typeof window !== 'undefined') {
  try {
    auth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    auth = getAuth(app);
  }
} else {
  auth = getAuth(app);
}

const db = typeof window !== 'undefined'
  ? (isNewApp
      ? initializeFirestore(app, {
          experimentalForceLongPolling: true,
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        }, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app, firebaseConfig.firestoreDatabaseId))
  : getFirestore(app, firebaseConfig.firestoreDatabaseId);

const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export { 
  app, 
  auth, 
  db, 
  storage, 
  googleProvider, 
  browserPopupRedirectResolver,
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signOut 
};
