# Webbie-BuurtApp-Setup-Getting-Started.md

**Laatst bijgewerkt:** 17 februari 2026

## 🚀 BuurtApp - Complete Setup Guide

Deze guide helpt je (of een AI assistant) om de BuurtApp lokaal te draaien vanaf scratch.

---

## 📋 Prerequisites

### Systeem Requirements
- **Node.js:** v20.x of hoger
- **npm:** v10.x of hoger
- **Git:** Latest version
- **Firebase CLI:** `npm install -g firebase-tools`
- **Code Editor:** VSCode (aanbevolen) + extensies:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - GitHub Copilot (optioneel)

### Accounts Nodig
- **Google Account** (voor Firebase)
- **Firebase Project** (gratis Spark plan voldoende voor development)
- **Google Maps API Key** (voor kaart features)
- **Google Gemini API Key** (voor AI chat feature)

---

## 🔧 Setup Stappen

### 1. Repository Clonen
```bash
git clone https://github.com/Webbiecorn/buurtapp-v3-4.git
cd buurtapp-v3-4
```

### 2. Dependencies Installeren
```bash
# Main app dependencies
npm install

# Firebase Functions dependencies (optioneel, alleen indien je functions locally wilt testen)
cd functions
npm install
cd ..
```

**Expected install time:** ~2 minuten

### 3. Environment Variables Setup

Create `.env.local` in project root:

```bash
# .env.local (NIET COMMITTEN!)

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Google Maps API (voor kaart features)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Google Gemini API (voor AI chat)
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**Hoe krijg je deze keys?**

**Firebase Keys:**
1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Selecteer/maak project
3. Ga naar Project Settings (tandwiel icoon)
4. Scroll naar "Your apps" → Web app
5. Kopieer config values

**Google Maps API:**
1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Maps JavaScript API** + **Places API**
3. Credentials → Create API Key
4. Restrict key (HTTP referrers)

**Gemini API:**
1. Ga naar [Google AI Studio](https://makersuite.google.com/app/apikey)
2. "Get API Key" → Create key
3. Kopieer key

### 4. Firebase Project Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase (kies bestaand project)
firebase init

# Select:
# - Firestore
# - Storage
# - Functions
# - Hosting
# - Emulators (voor local testing)

# Voor emulators kies:
# - Authentication Emulator (port 9099)
# - Firestore Emulator (port 8081)
# - Storage Emulator (port 9199)
# - Functions Emulator (port 5001)
```

### 5. Firestore Security Rules Deployen

```bash
# Deploy alleen rules (niet de hele app)
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### 6. Seed Data (Optioneel)

Voor testing met dummy data:

```bash
# Start emulators
firebase emulators:start

# In andere terminal:
npm run seed  # (indien seed script beschikbaar)
# Of: Gebruik Firebase Console om handmatig test data toe te voegen
```

---

## 🏃 Development Workflow

### Local Development (zonder Firebase Emulators)

```bash
# Start dev server
npm run dev

# App draait op: http://localhost:5173
```

**Let op:** Dit gebruikt productie Firebase. Pas op met test data!

### Local Development (met Firebase Emulators - AANBEVOLEN)

```bash
# Terminal 1: Start emulators
firebase emulators:start

# Terminal 2: Start dev server
npm run dev
```

**Voordelen:**
- Geen productie data raak je aan
- Offline development mogelijk
- Firestore/Auth/Storage lokaal
- Reset data via emulator UI

**Emulator UI:** http://localhost:4000

### Veelgebruikte Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run preview         # Preview production build
npm run lint            # Run ESLint
firebase emulators:start # Start Firebase emulators

# Testing
npm run test            # Run tests (indien geconfigureerd)
npm run test:watch      # Watch mode

# Deployment
npm run build           # Build
firebase deploy         # Deploy alles
firebase deploy --only hosting  # Alleen hosting
firebase deploy --only firestore:rules  # Alleen rules
```

---

## 📦 Project Structure Reminder

```
buurtapp-v3-4/
├── .env.local              # Env vars (NIET IN GIT!)
├── .github/
│   └── copilot-instructions.md  # Copilot guidelines
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts       # Functions export
│   │   ├── inviteUser.ts  # User invitation
│   │   └── sendWelcomeEmail.ts
│   └── package.json
├── public/
│   ├── icons/             # PWA icons
│   └── sw.js              # Service Worker
├── src/
│   ├── components/        # Reusable components
│   ├── context/
│   │   └── AppContext.tsx # Global state
│   ├── pages/             # Page components (routes)
│   ├── services/          # Firebase clients, external APIs
│   ├── utils/             # Helper functions
│   ├── types.ts           # TypeScript interfaces
│   ├── firebase.ts        # Firebase initialization
│   └── index.tsx          # App entry
├── firebase.json          # Firebase config
├── firestore.rules        # Firestore security
├── storage.rules          # Storage security
├── vite.config.ts         # Vite config
└── package.json
```

---

## 🔑 First Time Setup Checklist

- [ ] Node.js en npm geïnstalleerd
- [ ] Repository gecloned
- [ ] `npm install` succesvol
- [ ] `.env.local` aangemaakt met alle keys
- [ ] Firebase CLI geïnstalleerd (`firebase --version` werkt)
- [ ] `firebase login` succesvol
- [ ] Firebase project geselecteerd/aangemaakt
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Emulators geconfigureerd (optioneel)
- [ ] `npm run dev` draait zonder errors
- [ ] App opent op localhost:5173
- [ ] Login werkt (maak test user via Firebase Console)

---

## 🐛 Common Setup Issues

### Issue 1: "Module not found" errors
**Oplossing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue 2: "Firebase app not initialized"
**Oorzaak:** .env.local keys niet correct of ontbreken

**Oplossing:**
1. Check `.env.local` bestaat in root
2. Check alle `VITE_` prefixes aanwezig zijn
3. Restart dev server (`npm run dev`)

### Issue 3: Firestore permission denied
**Oorzaak:** Security rules nog niet deployed of te restrictief

**Oplossing:**
```bash
firebase deploy --only firestore:rules
# Of: Gebruik emulators (rules zijn relaxed)
```

### Issue 4: Google Maps niet zichtbaar
**Oorzaak:** API key ontbreekt of niet restricted

**Oplossing:**
1. Check `VITE_GOOGLE_MAPS_API_KEY` in .env.local
2. Check API enabled in Google Cloud Console
3. Check billing account (Maps API vereist credit card, maar heeft free tier)

### Issue 5: Port 5173 already in use
**Oplossing:**
```bash
# Kill process op port
lsof -ti:5173 | xargs kill -9

# Of: gebruik andere port
npm run dev -- --port 3000
```

---

## 🔐 Security Best Practices

### Development
- ✅ Gebruik `.env.local` voor secrets
- ✅ `.env.local` staat in `.gitignore`
- ✅ Gebruik Firebase Emulators voor development
- ✅ Test met test users, niet productie accounts

### Production
- ✅ Firebase Security Rules deployed en getest
- ✅ API Keys restricted (HTTP referrers)
- ✅ Environment variables in Firebase Hosting
- ✅ HTTPS only (Firebase Hosting doet dit automatisch)

---

## 📚 Volgende Stappen

Na succesvolle setup:

1. **Lees:** `Webbie--BuurtApp-Overzicht-Modules-[datum].md` voor app architectuur
2. **Check:** `.github/copilot-instructions.md` voor code conventions
3. **Bekijk:** Module prompt bestanden voor feature details
4. **Start coding:** Begin met kleine wijziging om workflow te testen

---

## 🆘 Hulp Nodig?

**Resources:**
- Firebase Docs: https://firebase.google.com/docs
- Vite Docs: https://vitejs.dev
- React Docs: https://react.dev
- Tailwind Docs: https://tailwindcss.com

**Error Database:**
Check `Webbie-BuurtApp-Errors-Resolved.md` (indien beschikbaar) voor veelvoorkomende errors.

**AI Assistant:**
Upload dit bestand + `Webbie--BuurtApp-Overzicht-Modules-[datum].md` naar ChatGPT/Claude voor context.

---

**Setup Time Estimate:**
- Eerste keer: ~45 minuten
- Met ervaring: ~15 minuten

Succes! 🚀
