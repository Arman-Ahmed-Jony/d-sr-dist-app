import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-expect-error RN persistence export exists at runtime
  getReactNativePersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from 'firebase/firestore';

type Extra = {
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;
  useFirebaseEmulator?: boolean;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/** Prefer first non-empty value so blank app.json extras don't block .env. */
function configValue(...candidates: Array<string | undefined>): string {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

const firebaseConfig = {
  apiKey: configValue(
    extra.firebaseApiKey,
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    'demo-api-key',
  ),
  authDomain: configValue(
    extra.firebaseAuthDomain,
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    'demo.firebaseapp.com',
  ),
  projectId: configValue(
    extra.firebaseProjectId,
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    'sr-dist-app-demo',
  ),
  storageBucket: configValue(
    extra.firebaseStorageBucket,
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    'sr-dist-app-demo.appspot.com',
  ),
  messagingSenderId: configValue(
    extra.firebaseMessagingSenderId,
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    '0',
  ),
  appId: configValue(
    extra.firebaseAppId,
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    '1:0:web:demo',
  ),
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function createApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

app = createApp();

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager:
        Platform.OS === 'web'
          ? persistentMultipleTabManager()
          : persistentSingleTabManager(undefined),
    }),
  });
} catch {
  db = getFirestore(app);
}

export { app, auth, db, firebaseConfig };
