// Importeer de benodigde functies van de Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDdNt987MgEFsi2AUsYTV-kyvXK_y9gmIs",
  authDomain: "buurtapp-v3-4.firebaseapp.com",
  projectId: "buurtapp-v3-4",
  storageBucket: "buurtapp-v3-4.appspot.com",
  messagingSenderId: "740445217879",
  appId: "1:740445217879:web:afa1154ca0c5894a29af12"
};

// Initialiseer de Firebase app met jouw configuratie
const app = initializeApp(firebaseConfig);

// Exporteer de services zodat andere bestanden deze kunnen gebruiken
export const db = getFirestore(app);
export const storage = getStorage(app);

if (import.meta.env.DEV) {
  // Verbind met de Firestore emulator
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  
  // Verbind met de Storage emulator
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  
  console.log("Applicatie is verbonden met de lokale Firebase emulators.");
}
