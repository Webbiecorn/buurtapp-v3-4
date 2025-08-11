// Importeer de benodigde functies van de Firebase SDK
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
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

// Optionele App Check initialisatie (aanbevolen als Storage/App Check enforcement aanstaat)
// Gebruik VITE_RECAPTCHA_V3_SITE_KEY of VITE_APP_CHECK_SITE_KEY voor de site key
if (typeof window !== 'undefined') {
  // Debug token inschakelen in development indien gewenst
  const enableDebug = import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG === 'true';
  if (enableDebug) {
    // @ts-ignore - globale debug toggle voor App Check
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.log('[AppCheck] Debug token enabled');
  }

  const siteKey = (import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY || import.meta.env.VITE_APP_CHECK_SITE_KEY) as string | undefined;
  if (siteKey && siteKey.trim()) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey.trim()),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('[AppCheck] Initialized with reCAPTCHA v3');
    } catch (e) {
      console.warn('[AppCheck] Kon niet initialiseren:', e);
    }
  } else if (!import.meta.env.DEV) {
    console.warn('[AppCheck] Geen site key geconfigureerd (VITE_RECAPTCHA_V3_SITE_KEY).');
  }
}

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
