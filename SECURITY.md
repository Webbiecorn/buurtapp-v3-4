# 🔒 Security Guidelines - Buurtapp v3-4

## ⚠️ BELANGRIJK: Voor je naar GitHub pusht

### Gevoelige Data NOOIT Committen!

De volgende bestanden bevatten **gevoelige informatie** en mogen **NOOIT** naar GitHub:

```bash
❌ .env
❌ .env.local
❌ .env.development
❌ .env.production
❌ firebase-emulator-data/
❌ serviceAccountKey.json
❌ Firebase Admin credentials
```

### ✅ Wat WEL veilig is om te committen:

```bash
✅ .env.example          # Bevat alleen placeholder values
✅ Source code          # Zonder hardcoded keys
✅ firebase.json        # Configuratie zonder secrets
✅ firestore.rules      # Security rules
```

---

## 🔑 API Keys Beheer

### Huidige API Keys (Status: November 2025)

⚠️ **ACTIE VEREIST:** De volgende keys zijn mogelijk gecompromitteerd en moeten worden gereset:

1. **Google Maps API Key**
   - Locatie: Was hardcoded in `MapPage.tsx` (nu gefixed)
   - Value: `AIzaSyD9BrD8NTc5cynkTNL9PPfcp-A76Kb8o3Q`
   - **ACTIE:** 
     1. Ga naar [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     2. Delete de oude key
     3. Maak een NIEUWE key aan met restricties
     4. Update `.env.local` met nieuwe key

2. **Google Gemini API Key**
   - Moet in `.env.local` staan als `VITE_GEMINI_API_KEY`
   - **ACTIE:** Haal nieuwe key op van [AI Studio](https://aistudio.google.com/app/apikey)

3. **Firebase Credentials**
   - Config staat in `src/firebase.ts` (public config, OK)
   - Admin credentials mogen NOOIT in git
   - Gebruik Firebase Functions voor server-side operaties

---

## 🛡️ API Key Restricties Instellen

### Google Maps API Key Restricties:

1. **Application restrictions:**
   - HTTP referrers (websites)
   - Voeg toe: `https://buurtapp-v3-4.web.app/*`
   - Voor development: `http://localhost:5173/*`

2. **API restrictions:**
   - Beperk tot alleen Maps JavaScript API
   - Geocoding API (indien nodig)

### Google Gemini API Key Restricties:

1. Maak aparte keys voor:
   - Development (onbeperkt)
   - Production (IP/referrer restricted)

---

## 📝 .env.local Setup (NIET IN GIT!)

Maak een `.env.local` bestand aan (wordt genegeerd door git):

```bash
# Google Maps API Keys
VITE_GOOGLE_MAPS_API_KEY=YOUR_NEW_RESTRICTED_API_KEY_HERE
VITE_GOOGLE_MAP_LIGHT_ID=a685a3b57e7894f1a94dffc2
VITE_GOOGLE_MAP_DARK_ID=a685a3b57e7894f1a94dffc2

# Google Gemini AI API Key
VITE_GEMINI_API_KEY=YOUR_NEW_GEMINI_API_KEY_HERE

# Firebase Emulator (development only)
VITE_USE_EMULATORS=true
```

---

## 🚨 In Geval van Compromitteerde Keys

Als je per ongeluk een API key hebt gecommit naar GitHub:

### Stap 1: Revoke de key ONMIDDELLIJK
```bash
# Google Cloud Console -> API & Services -> Credentials -> Delete key
```

### Stap 2: Genereer nieuwe key met restricties

### Stap 3: Update lokaal
```bash
# Update .env.local met nieuwe key
```

### Stap 4: Verwijder uit git history (optioneel maar aanbevolen)
```bash
# Gebruik BFG Repo-Cleaner of git filter-branch
# OF: maak nieuwe repo zonder history
```

---

## ✅ Checklist voor GitHub Push

Voordat je `git push` doet:

- [ ] Geen `.env` files gecommit?
- [ ] Geen hardcoded API keys in code?
- [ ] Geen Firebase admin credentials?
- [ ] Geen test passwords/emails?
- [ ] `.gitignore` up-to-date?
- [ ] Alleen `.env.example` in repo?

Run deze check:
```bash
# Check voor gevoelige data
git diff --cached | grep -E "apiKey|API_KEY|SECRET|PASSWORD|firebase.*apiKey"
```

Als er matches zijn → **STOP** en verwijder ze eerst!

---

## 🔐 Firebase Security Rules

Zorg ervoor dat je Firestore rules goed zijn ingesteld:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Alleen authenticated users
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Specifieke collections met rol-based access
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId 
                   || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Beheerder';
    }
  }
}
```

---

## � Role-Based Access Control (RBAC)

### Gebruikersrollen

De applicatie kent drie hoofdrollen:

1. **Beheerder** - Volledige toegang tot alle functionaliteit
   - Kan gebruikers uitnodigen en beheren
   - Kan alle data bekijken en wijzigen
   - Heeft toegang tot Admin pagina
   - Kan module-restricties instellen

2. **Conciërge** - Operationele rol
   - Kan eigen data creëren en bewerken
   - Kan meldingen, projecten en dossiers beheren
   - Kan deelnemen aan projecten
   - Kan urenregistratie bijhouden

3. **Viewer** - Alleen lezen
   - Kan data bekijken maar niet wijzigen
   - Geen toegang tot urenregistratie
   - Geen toegang tot beheerfuncties

### Module-Restrictie (Nieuw - februari 2026)

Voor nog granulairdere toegangscontrole kunnen Beheerders per gebruiker specifieke modules toewijzen:

**Beschikbare Modules:**
- Dashboard
- Meldingen
- Projecten
- Woningdossiers
- Urenregistratie
- Statistieken
- Rapportages
- Contacten
- Achterpaden
- Updates
- Beheer (alleen Beheerders)

**Implementatie:**
- Opgeslagen in `users/{uid}/allowedModules: string[]`
- Client-side enforcement via route guards
- Automatische redirect bij ongeautoriseerde toegang
- Backwards compatible: users zonder `allowedModules` krijgen volledige toegang

**Use Case - Externe Partners:**
```typescript
{
  name: "Centrada Medewerker",
  email: "partner@centrada.nl",
  role: "Viewer",  // Read-only
  allowedModules: ["achterpaden"]  // Alleen Achterpaden module
}
```

### Client-Side Access Control

**Route Protection** (in `App.tsx`):
```typescript
<ProtectedRoute 
  roles={[UserRole.Beheerder, UserRole.Concierge]} 
  moduleKey="meldingen"
>
  <IssuesPage />
</ProtectedRoute>
```

**Menu Filtering** (in `AppShell.tsx`):
```typescript
// Filter nav items op rol én module toegang
const filteredNavItems = navItems.filter(item => {
  if (!currentUser) return false;
  if (!item.roles.includes(currentUser.role)) return false;
  
  // Check module toegang
  if (currentUser.allowedModules && currentUser.allowedModules.length > 0) {
    return currentUser.allowedModules.includes(item.moduleKey);
  }
  
  return true;
});
```

### Security Best Practices

✅ **DO:**
- Implementeer rol checks op zowel client als server
- Gebruik Firebase Security Rules voor database toegang
- Valideer gebruikersinput altijd server-side
- Log toegang tot gevoelige functies
- Implementeer rate limiting voor API calls

❌ **DON'T:**
- Vertrouw alleen op client-side beveiliging
- Hardcode rollen of permissions in code
- Geef te veel toegang "voor het gemak"
- Vergeet audit logs voor admin acties
- Sla gevoelige data onversleuteld op

---

## 📞 Contact

Bij beveiligingsvragen of incidents:
- **Email:** kevin@webbiecorn.nl
- **GitHub Security Advisories:** [Private reporting](https://github.com/Webbiecorn/buurtapp-v3-4/security/advisories)

---

**Laatste update:** 23 februari 2026  
**Status:** ✅ Module-restrictie functionaliteit geïmplementeerd
