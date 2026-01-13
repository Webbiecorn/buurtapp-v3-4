import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore, setLogLevel } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDdNt987MgEFsi2AUsYTV-kyvXK_y9gmIs",
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

function initializeFirebase() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app, 'us-central1'); // Specificeer regio indien nodig

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

// Initialiseer direct
initializeFirebase();

// In productie, zet het log level op 'error' om interne SDK fouten te voorkomen en console noise te verminderen.
if (import.meta.env.PROD) {
  setLogLevel('error');
}

// Exporteer de instanties
export { app, auth, db, storage, functions };


// Getter function to ensure db is always initialized
export function getDb(): Firestore {
  if (!db) {
    initializeFirebase();
  }
  return db;
}
