import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import fallbackConfig from '../../firebase-applet-config.json';

/**
 * Firebase configuration.
 *
 * Prefer environment variables (VITE_FIREBASE_*) so the app can point to the
 * operator's own Firebase project without editing source. Falls back to the
 * bundled `firebase-applet-config.json` for backwards compatibility.
 *
 * Firebase web config values (apiKey, appId, etc.) are NOT secrets — access
 * control is enforced server-side by `firestore.rules`.
 */
const env = import.meta.env;

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY || (fallbackConfig as any).apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (fallbackConfig as any).authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || (fallbackConfig as any).projectId,
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET || (fallbackConfig as any).storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    (fallbackConfig as any).messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || (fallbackConfig as any).appId,
  measurementId:
    env.VITE_FIREBASE_MEASUREMENT_ID || (fallbackConfig as any).measurementId,
};

/** Optional non-default Firestore database id. */
const firestoreDatabaseId: string | undefined =
  env.VITE_FIREBASE_DATABASE_ID || (fallbackConfig as any).firestoreDatabaseId;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

/**
 * Initialize Firestore with an offline-first persistent cache so the app keeps
 * working during connectivity drops (offshore) and re-syncs when back online.
 * Multi-tab manager keeps several browser tabs consistent.
 */
function createFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firestoreDatabaseId || undefined,
    );
  } catch {
    // initializeFirestore throws if already initialized (e.g. HMR) — reuse it.
    return firestoreDatabaseId
      ? getFirestore(app, firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const firestore = createFirestore();
export const auth = getAuth(app);
export default app;
