// Importeer de benodigde functies van de Firebase SDK
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- Nieuwe import

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
export const storage = getStorage(app); // <-- Nieuwe export
