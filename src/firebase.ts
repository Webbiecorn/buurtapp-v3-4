import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore, setLogLevel } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";
import { getPerformance, Performance } from "firebase/performance";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "buurtapp-v3-4.firebaseapp.com",
  projectId: "buurtapp-v3-4",
  storageBucket: "buurtapp-v3-4.firebasestorage.app",
  messagingSenderId: "740445217879",
  appId: "1:740445217879:web:afa1154ca0c5894a29af12"
};

// Singleton pattern om race conditions te voorkomen
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;
let analytics: Analytics | null = null;
let performance: Performance | null = null;

async function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'us-central1'); // Specificeer regio indien nodig
// Initialize Analytics (only in production and if supported)
    if (import.meta.env.PROD && await isSupported()) {
      analytics = getAnalytics(app);
    }

    // Initialize Performance Monitoring (only in production)
    if (import.meta.env.PROD) {
      try {
        performance = getPerformance(app);
        console.log('Firebase Performance Monitoring initialized');
      } catch (error) {
        console.warn('Failed to initialize Firebase Performance:', error);
      }
    }

    const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
    if (useEmulators) {
      console.log("Connecting to Firebase Emulators...");
      connectFirestoreEmulator(db, '127.0.0.1', 8083);
      connectStorageEmulator(storage, '127.0.0.1', 9201);
      connectAuthEmulator(auth, 'http://127.0.0.1:9100');
      connectFunctionsEmulator(functions, "127.0.0.1", 5101);
    }
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'us-central1');
  }
}

// Initialiseer direct, performance
initializeFirebase();

// In productie, zet het log level op 'error' om interne SDK fouten te voorkomen en console noise te verminderen.
if (import.meta.env.PROD) {
  setLogLevel('error');
}

// Exporteer de instanties
export { app, auth, db, storage, functions, analytics };


// Getter function to ensure db is always initialized
export function getDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}
