// Importeer de benodigde functies van de Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDdNt987MgEFsi2AUsYTV-kyvXK_y9gmIs",
  authDomain: "buurtapp-v3-4.firebaseapp.com",
  projectId: "buurtapp-v3-4",
  storageBucket: "buurtapp-v3-4.firebasestorage.app",
  messagingSenderId: "740445217879",
  appId: "1:740445217879:web:afa1154ca0c5894a29af12"
};

// Initialiseer de Firebase app met jouw configuratie
const app = initializeApp(firebaseConfig);

// Exporteer de services zodat andere bestanden deze kunnen gebruiken
export const db = getFirestore(app);
export const storage = getStorage(app);

// Gebruik emulators alleen als expliciet aangezet via VITE_USE_EMULATORS=true
const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true';
if (useEmulators) {
  // Verbind met de Firestore emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8083);
  // Verbind met de Storage emulator
  connectStorageEmulator(storage, '127.0.0.1', 9201);
  console.log("Applicatie is verbonden met de lokale Firebase emulators op aangepaste poorten.");
} else if (import.meta.env.DEV) {
  console.log("DEV zonder emulators: verbonden met Firebase project 'buurtapp-v3-4'. Zet VITE_USE_EMULATORS=true om lokaal te verbinden.");
}
