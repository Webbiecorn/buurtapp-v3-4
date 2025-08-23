// src/firebase.ts

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // DIT IS DE CORRECTIE VOOR DE CORS-FOUT:
  storageBucket: "buurtapp-v3-4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// App Check initialisatie
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  try {
    // DIT IS DE CORRECTIE VOOR DE 'getAppCheck' FOUT:
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.error("App Check initialization failed", err);
  }
}

// Emulator connections
if (import.meta.env.DEV) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9100");
    connectFirestoreEmulator(db, '127.0.0.1', 8083);
    connectStorageEmulator(storage, '127.0.0.1', 9201);
    connectFunctionsEmulator(functions, '127.0.0.1', 5101);
    console.log("Connected to Firebase emulators");
  } catch (err) {
    console.warn("Failed to connect to emulators. Already connected?", err);
  }
}

export { auth, db, storage, functions };