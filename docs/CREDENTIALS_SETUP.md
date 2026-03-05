# Buurtconciërge App — Benodigde gegevens & sleutels

> Dit bestand legt uit welke API-sleutels en wachtwoorden je nodig hebt, **waarvoor** ze dienen en **waar** je ze kunt vinden of aanmaken.

---

## Overzicht

| Sleutel                    | Doel                                                 | Verplicht    | Opslaan in       |
| -------------------------- | ---------------------------------------------------- | ------------ | ---------------- |
| `VITE_FIREBASE_API_KEY`    | Firebase (Auth, Firestore, Storage, Functions)       | ✅ Ja         | `.env.local`     |
| `VITE_GOOGLE_MAPS_API_KEY` | Kaarten in Statistieken, Achterpaden, Registratie    | ✅ Ja         | `.env.local`     |
| `VITE_GEMINI_API_KEY`      | AI-samenvattingen & dagelijkse wijkupdates           | ✅ Ja         | `.env.local`     |
| `GMAIL_USER`               | E-mail versturen (uitnodigingen, herinneringen)      | ⏳ Optioneel* | Firebase Secrets |
| `GMAIL_APP_PASSWORD`       | Wachtwoord voor Gmail-app (niet je eigen wachtwoord) | ⏳ Optioneel* | Firebase Secrets |
| `VITE_USE_EMULATORS`       | Firebase emulators inschakelen tijdens ontwikkeling  | 🔧 Dev only   | `.env.local`     |

> *E-mail werkt zonder Gmail, maar uitnodigings- en herinneringsmails worden dan **niet** daadwerkelijk verstuurd. De HTML-versie wordt wel opgeslagen in Firestore (bruikbaar voor handmatige verzending).

---

## 1. Firebase API Key (`VITE_FIREBASE_API_KEY`)

**Waarvoor:** Verbinding met Firebase (inloggen, database, bestanden opslaan, servercode uitvoeren).

**Waar vinden:**
1. Ga naar [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klik op project **buurtapp-v3-4**
3. Klik op het tandwiel ⚙️ → **Projectinstellingen**
4. Scroll naar beneden naar **Jouw apps**
5. Klik op het web-app icoon (`</>`) — als er al een app staat, klik erop
6. Kopieer de waarde bij `apiKey`

**Opslaan in `.env.local`:**
```
VITE_FIREBASE_API_KEY=AIzaSy...jouw-sleutel-hier
```

> De overige Firebase-gegevens (projectId, appId, etc.) staan al hardcoded in `src/firebase.ts` — je hoeft alleen de `apiKey` in te stellen.

---

## 2. Google Maps API Key (`VITE_GOOGLE_MAPS_API_KEY`)

**Waarvoor:** Kaartweergave in de statistiekenpagina, de Achterpaden-module en bij registraties.

**Waar aanmaken:**
1. Ga naar [https://console.cloud.google.com](https://console.cloud.google.com)
2. Selecteer (of maak) hetzelfde project als Firebase: **buurtapp-v3-4**
3. Ga naar **API's en services** → **Credentials** (linkermenu)
4. Klik **+ Maak credentials aan** → **API-sleutel**
5. Kopieer de sleutel
6. Klik op de sleutel → beperk hem tot onderstaande API's (aanbevolen):
   - Maps JavaScript API
   - Maps Embed API (optioneel)

**API inschakelen** (als dat nog niet is gedaan):
- Ga naar **API's en services** → **Bibliotheek**
- Zoek "Maps JavaScript API" en klik **Inschakelen**

**Opslaan in `.env.local`:**
```
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...jouw-sleutel-hier
```

> **Let op:** Beperk de sleutel in Google Cloud Console tot jouw domeinen (`buurtapp-v3-4.web.app`, `localhost`) om misbruik te voorkomen.

---

## 3. Google Gemini API Key (`VITE_GEMINI_API_KEY`)

**Waarvoor:** AI-gegenereerde samenvattingen van meldingen en automatische dagelijkse wijkupdates.

**Waar aanmaken:**
1. Ga naar [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Klik **API-sleutel maken**
3. Selecteer het project **buurtapp-v3-4** (of maak een nieuwe sleutel)
4. Kopieer de sleutel

**Opslaan in `.env.local`:**
```
VITE_GEMINI_API_KEY=AIzaSy...jouw-sleutel-hier
```

> De gratis tier is voldoende voor normaal gebruik. Zie [Google AI Studio](https://aistudio.google.com) voor limieten.

---

## 4. Gmail e-mail (optioneel, voor uitnodigingsmails)

**Waarvoor:** Automatisch versturen van uitnodigings- en herinneringsmails naar nieuwe gebruikers via Firebase Cloud Functions.

### Stap A — Gmail App-wachtwoord aanmaken

Een App-wachtwoord is een **apart** wachtwoord speciaal voor apps — NIET je gewone Google-wachtwoord.

**Vereiste:** 2-staps verificatie moet ingeschakeld zijn op het Gmail-account.

1. Ga naar [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Scroll naar **Inloggen bij Google** → klik **2-staps verificatie** (en stel dit in als het er nog niet is)
3. Ga daarna naar [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Kies bij **App selecteren**: "Andere (eigen naam)" → typ bijv. `BuurtApp`
5. Klik **Genereren** — kopieer het 16-cijferige wachtwoord (bijv. `abcd efgh ijkl mnop`)
6. Sla dit wachtwoord op — je ziet het maar één keer!

### Stap B — Sleutels instellen als Firebase Secret

Firebase Secrets worden **niet** in `.env.local` opgeslagen, maar beveiligd in de Firebase-omgeving zelf.

Voer deze commando's uit in de terminal (in de projectmap):

```bash
firebase functions:secrets:set GMAIL_USER
# Voer in: het Gmail-adres (bijv. info@jouworganisatie.nl)

firebase functions:secrets:set GMAIL_APP_PASSWORD
# Voer in: het 16-cijferige App-wachtwoord (zonder spaties)
```

### Stap C — Nodemailer activeren in de code

Na het instellen van de secrets moet je de verzending in de code activeren:

1. Open `functions/src/sendWelcomeEmail.ts`
2. Zoek het commentaarblok `NODEMAILER` en verwijder de `//` voor de relevante regels
3. Open `functions/src/checkExpiredInvites.ts`
4. Uncomment de import bovenaan en het `transporter.sendMail(...)` blok
5. Installeer nodemailer: `cd functions && npm install nodemailer @types/nodemailer`
6. Deploy: `firebase deploy --only functions`

---

## 5. `.env.local` — compleet voorbeeld

Maak het bestand `.env.local` aan in de **root van het project** (naast `package.json`):

```env
# Firebase
VITE_FIREBASE_API_KEY=AIzaSy...

# Google Maps (voor kaarten)
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# Google Gemini AI (voor AI-samenvattingen)
VITE_GEMINI_API_KEY=AIzaSy...

# Emulators inschakelen tijdens lokale ontwikkeling (optioneel)
VITE_USE_EMULATORS=false

# Extra logging in de browser-console (optioneel)
VITE_ENABLE_LOGGING=true
```

> ⚠️ **Dit bestand nooit committen naar Git.** Het staat al in `.gitignore` — controleer dat met `git status`.

---

## 6. Emulatorpoorten (lokale ontwikkeling)

Als je `VITE_USE_EMULATORS=true` instelt, verbindt de app met lokale Firebase-emulators:

| Dienst    | Poort |
| --------- | ----- |
| Firestore | 8083  |
| Storage   | 9201  |
| Auth      | 9100  |
| Functions | 5101  |

Start de emulators met:
```bash
firebase emulators:start
```

Start daarna de app in een tweede terminal:
```bash
npm run dev
```

---

## Samenvatting — prioriteiten

| #   | Wat                                      | Urgentie                             |
| --- | ---------------------------------------- | ------------------------------------ |
| 1   | `VITE_FIREBASE_API_KEY` instellen        | 🔴 Direct nodig                       |
| 2   | `VITE_GOOGLE_MAPS_API_KEY` instellen     | 🔴 Direct nodig (kaarten)             |
| 3   | `VITE_GEMINI_API_KEY` instellen          | 🟡 Nodig voor AI-functies             |
| 4   | Gmail App-wachtwoord + Secrets instellen | 🟢 Later (e-mail werkt ook handmatig) |

---

*Bijgehouden door: GitHub Copilot | Aangemaakt: 5 maart 2026*
