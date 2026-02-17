# Webbie Knowledge Base - Structuur & Templates

## 📚 Master Documentatie Systeem voor AI Assistants

Dit document beschrijft de complete knowledge base structuur voor het Webbie bedrijf, zodat elke AI assistant meteen volledige context heeft over bedrijf, apps, tech stack, en solved problems.

---

## 🗂️ Documentatie Structuur

```
webbie-knowledge-base/
├── 00-START-HERE.md                          # Master index, start hier
├── 01-Bedrijf/
│   ├── Webbie-Bedrijfsprofiel.md            # Wie, wat, missie, visie
│   ├── Webbie-Services-Prijzen.md           # Diensten & tarieven
│   ├── Webbie-Klanten-Portfolio.md          # Klanten overzicht
│   ├── Webbie-Business-Metrics.md           # Omzet, projecten, status
│   └── Webbie-Team-Expertise.md             # Team (of solo) skills
├── 02-Apps-Portfolio/
│   ├── Webbie-Apps-Overzicht.md             # Alle apps in één oogopslag
│   ├── Webbie-App-BuurtApp.md               # Per app complete info
│   ├── Webbie-App-[OtherId].md              # Template herhalen
│   └── Webbie-Apps-Roadmap.md               # Geplande apps/features
├── 03-Tech-Stack/
│   ├── Webbie-Tech-Stack-Overzicht.md       # Alle gebruikte tech
│   ├── Webbie-Tech-Decisions.md             # Waarom React, waarom Firebase, etc.
│   ├── Webbie-Tech-Patterns.md              # Herbruikbare patterns
│   └── Webbie-Tech-Migrations.md            # Van X naar Y, waarom, hoe
├── 04-Development/
│   ├── Webbie-Dev-Standards.md              # Code conventions
│   ├── Webbie-Dev-Workflows.md              # Git flow, deployment
│   ├── Webbie-Dev-Testing.md                # Test strategie
│   └── Webbie-Dev-Security.md               # Security best practices
├── 05-Troubleshooting/
│   ├── Webbie-Errors-Resolved.md            # Error database met oplossingen
│   ├── Webbie-Bugs-Recurring.md             # Veelvoorkomende bugs
│   ├── Webbie-Performance-Fixes.md          # Performance issues & fixes
│   └── Webbie-Deployment-Issues.md          # Deployment problemen & fixes
├── 06-Patterns-Solutions/
│   ├── Webbie-Pattern-Auth.md               # Auth implementatie patterns
│   ├── Webbie-Pattern-FileUpload.md         # File upload patterns
│   ├── Webbie-Pattern-Maps.md               # Maps integratie patterns
│   ├── Webbie-Pattern-Charts.md             # Charts & visualisatie patterns
│   └── Webbie-Pattern-Search.md             # Search & filtering patterns
├── 07-Deployment/
│   ├── Webbie-Deploy-Firebase.md            # Firebase deployment procedures
│   ├── Webbie-Deploy-Vercel.md              # Vercel deployment (indien gebruikt)
│   ├── Webbie-Deploy-Checklist.md           # Pre-deployment checklist
│   └── Webbie-Deploy-Rollback.md            # Rollback procedures
├── 08-AI-Context/
│   ├── Webbie-AI-Common-Requests.md         # Veelvoorkomende AI requests
│   ├── Webbie-AI-Preferences.md             # Development preferences
│   └── Webbie-AI-Shortcuts.md               # Handy shortcuts & aliases
└── 09-Templates/
    ├── Webbie-Template-New-App.md           # Template voor nieuwe app docs
    ├── Webbie-Template-Module.md            # Template per module
    ├── Webbie-Template-Error.md             # Template error documentatie
    └── Webbie-Template-Feature.md           # Template feature spec
```

---

## 📋 Template: 00-START-HERE.md

```markdown
# 🚀 Webbie Knowledge Base - START HIER

**Laatst bijgewerkt:** [Datum]
**Versie:** 1.0

## Welkom AI Assistant! 👋

Dit is de centrale knowledge base voor Webbie. Lees deze file first voor een volledig overzicht.

## 🎯 Wat is Webbie?

[Korte beschrijving bedrijf - 2-3 zinnen]

**Specialisatie:** [Web apps, mobile apps, etc.]
**Focus:** [Target markets/industries]
**Tech:** [Primary tech stack]

## 📊 Quick Stats

- **Actieve Apps:** [X]
- **Totaal Projecten:** [X]
- **Tech Stack:** React, TypeScript, Firebase, Tailwind
- **Jaren Actief:** [X]

## 🗺️ Navigatie

### Ik wil weten over...

**Bedrijf & Business:**
→ `01-Bedrijf/Webbie-Bedrijfsprofiel.md`

**Een specifieke app:**
→ `02-Apps-Portfolio/Webbie-Apps-Overzicht.md` (overzicht)
→ `02-Apps-Portfolio/Webbie-App-[AppNaam].md` (details)

**Tech keuzes & rationale:**
→ `03-Tech-Stack/Webbie-Tech-Decisions.md`

**Hoe te coderen bij Webbie:**
→ `04-Development/Webbie-Dev-Standards.md`

**Een error oplossen:**
→ `05-Troubleshooting/Webbie-Errors-Resolved.md`

**Een pattern implementeren (auth, upload, maps, etc.):**
→ `06-Patterns-Solutions/Webbie-Pattern-[Topic].md`

**Hoe te deployen:**
→ `07-Deployment/Webbie-Deploy-Checklist.md`

## 🔥 Meest Gebruikte Bestanden

1. **Webbie-Errors-Resolved.md** - Check hier first bij errors
2. **Webbie-Dev-Standards.md** - Code conventions
3. **Webbie-Tech-Patterns.md** - Herbruikbare code patterns
4. **Webbie-AI-Preferences.md** - Development preferences

## 🚨 Belangrijke Notes

- Alle apps gebruiken **TypeScript** (geen JavaScript)
- **Firebase** is primaire backend
- **Tailwind CSS** voor styling (geen plain CSS)
- **Nederlandse UI** teksten voor Nederlandse apps
- **Dark mode** is standaard feature

## 📝 Wanneer Updaten?

- **Na elke app release:** Update app-specifiek MD bestand
- **Na error oplossen:** Voeg toe aan Webbie-Errors-Resolved.md
- **Bij nieuwe pattern:** Voeg toe aan relevante Pattern bestand
- **Business changes:** Update Bedrijfsprofiel.md

## 🤖 Voor AI Assistants

**Lees altijd:**
1. Deze file (START-HERE.md)
2. Webbie-Dev-Standards.md
3. Webbie-AI-Preferences.md
4. App-specifiek bestand indien relevant

**Bij errors:**
1. Check Webbie-Errors-Resolved.md first
2. Documenteer oplossing als nieuw

**Bij development:**
1. Volg conventions uit Dev-Standards.md
2. Hergebruik patterns uit Patterns-Solutions/
3. Update documentatie bij nieuwe patterns

---

**Contact:** [Email/website]
**Repository:** [GitHub org/user]
```

---

## 📋 Template: Webbie-Bedrijfsprofiel.md

```markdown
# Webbie - Bedrijfsprofiel

**Laatste update:** [Datum]

## 🏢 Bedrijfsinformatie

**Naam:** Webbie
**Opgericht:** [Jaar]
**Type:** [Eenmanszaak / BV / etc.]
**KvK:** [Nummer indien relevant]
**Locatie:** [Stad, Land]
**Website:** [URL]

## 🎯 Missie & Visie

### Missie
[Wat doet Webbie, voor wie, waarom]

### Visie
[Waar wil Webbie naartoe, lange termijn doelen]

### Core Values
1. [Value 1] - [Uitleg]
2. [Value 2] - [Uitleg]
3. [Value 3] - [Uitleg]

## 💼 Services

### Primaire Diensten
1. **[Dienst 1]**
   - Beschrijving
   - Target klanten
   - Gemiddelde prijs: €[X]

2. **[Dienst 2]**
   - Beschrijving
   - Target klanten
   - Gemiddelde prijs: €[X]

### Specialisaties
- [Specialisatie 1]: [Waarom expert]
- [Specialisatie 2]: [Waarom expert]

## 👥 Team (of Solo)

### [Naam - Rol]
**Expertise:**
- [Skill 1]
- [Skill 2]
- [Skill 3]

**Ervaring:**
[Aantal] jaar in [veld]

**Favoriete tech:**
[Tech stack voorkeur]

## 📈 Business Metrics

### Projecten (totaal sinds start)
- **Opgeleverd:** [X] projecten
- **Actief:** [X] projecten
- **Terugkerende clients:** [X]%

### Omzet (optioneel)
- **2025:** €[X]
- **2024:** €[X]
- **Groei:** [X]%

### Client Satisfaction
- **Gemiddelde rating:** [X]/5
- **Referrals:** [X]%

## 🎯 Target Market

### Ideale Klant
- **Industrie:** [Industries]
- **Grootte:** [Startup / SMB / Enterprise]
- **Budget:** €[X] - €[Y]
- **Locatie:** [Geographic focus]

### Use Cases
1. [Use case 1] voor [client type]
2. [Use case 2] voor [client type]

## 💰 Pricing Strategy

### Hourly Rate
€[X] / uur (standaard)

### Project Packages
- **Starter:** €[X] - [Wat inbegrepen]
- **Professional:** €[Y] - [Wat inbegrepen]
- **Enterprise:** €[Z] - [Wat inbegrepen]

### Retainer Options
- **Onderhoud:** €[X]/maand - [Uren/support]
- **Development:** €[Y]/maand - [Uren/support]

## 🏆 Key Achievements

- [Achievement 1 + jaar]
- [Achievement 2 + jaar]
- [Achievement 3 + jaar]

## 🔮 Roadmap

### 2026 Goals
- [ ] [Goal 1]
- [ ] [Goal 2]
- [ ] [Goal 3]

### Long-term Vision
[3-5 jaar vooruit plannen]
```

---

## 📋 Template: Webbie-Errors-Resolved.md

```markdown
# Webbie - Error Database & Resolutions

**Laatste update:** [Datum]

## 📖 Hoe te gebruiken

1. **Search** via Ctrl+F naar error message
2. **Lees** de oplossing + waarom het werkte
3. **Update** als je nieuwe variant tegenkomt

---

## 🔥 Most Common Errors (Top 10)

### 1. Firebase: "Missing or insufficient permissions"

**Error Message:**
```
FirebaseError: Missing or insufficient permissions.
```

**Context:**
Firestore query/write fails in production maar werkt in development

**Oorzaak:**
Security rules blokkeren operation

**Oplossing:**
```javascript
// In firestore.rules
match /collection/{docId} {
  allow read: if request.auth != null; // Voeg auth check toe
  allow write: if request.auth.uid == resource.data.userId;
}
```

**Preventie:**
- Test altijd met Firebase Emulator
- Deploy rules voor deploy van app
- Check rules in Firebase Console na deploy

**Related Files:**
- `firestore.rules`
- `src/firebase.ts`

**Opgelost op:** [Datum]
**Frequency:** Zeer vaak (☆☆☆☆☆)

---

### 2. Vite: "require is not defined"

**Error Message:**
```
Uncaught ReferenceError: require is not defined
```

**Context:**
Na `npm install` van package die CommonJS gebruikt

**Oorzaak:**
Vite is ESM-only, package gebruikt CommonJS

**Oplossing - Optie A (Preferred):**
```javascript
// Gebruik ESM import
import pkg from 'package-name';
```

**Oplossing - Optie B:**
```javascript
// In vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['package-name']
  }
});
```

**Oplossing - Optie C (Last resort):**
Zoek alternatief ESM package

**Preventie:**
- Check package.json van npm package first
- Prefer packages met "type": "module"

**Related Files:**
- `vite.config.ts`
- `package.json`

**Opgelost op:** [Datum]
**Frequency:** Vaak (☆☆☆☆)

---

### 3. TypeScript: "Type 'X' is not assignable to type 'Y'"

**Error Message:**
```
Type 'string | undefined' is not assignable to type 'string'.
```

**Context:**
Data uit Firestore/API kan undefined zijn

**Oorzaak:**
Strict TypeScript + optional fields

**Oplossing - Optie A (Type Guard):**
```typescript
if (data.field) {
  // Nu is field type 'string', niet 'string | undefined'
  const value: string = data.field;
}
```

**Oplossing - Optie B (Nullish Coalescing):**
```typescript
const value: string = data.field ?? 'default';
```

**Oplossing - Optie C (Optional Chaining):**
```typescript
const value = data?.field?.toLowerCase();
```

**Oplossing - Optie D (Non-null assertion - use sparingly):**
```typescript
const value: string = data.field!; // Only if 100% sure it exists
```

**Best Practice:**
Prefer Option A or B - explicit handling shows intent

**Related Files:**
- `tsconfig.json` (strict: true)
- Alle `.ts` en `.tsx` files

**Opgelost op:** [Datum]
**Frequency:** Dagelijks (☆☆☆☆☆)

---

### Template voor nieuwe errors:

```markdown
### [X]. [Component/Service]: "[Short Error Description]"

**Error Message:**
```
[Exact error text]
```

**Context:**
[Wanneer treedt error op, welke actie, welke environment]

**Oorzaak:**
[Root cause van de error]

**Oplossing:**
```[language]
[Code van de oplossing]
```

[Uitleg waarom dit werkt]

**Preventie:**
- [Hoe te voorkomen in toekomst]
- [Check/test to add]

**Related Files:**
- `[file1]`
- `[file2]`

**Opgelost op:** [Datum]
**Frequency:** [Zeer vaak / Vaak / Soms / Zeldzaam]
**Apps affected:** [App namen]
```

---

## 📁 Error Categories

### Firebase Errors
- [Error 1]
- [Error 2]

### Build/Deploy Errors
- [Error 1]
- [Error 2]

### TypeScript Errors
- [Error 1]
- [Error 2]

### Runtime Errors
- [Error 1]
- [Error 2]

### External API Errors
- [Error 1]
- [Error 2]

### Performance Issues
- [Error 1]
- [Error 2]

---

## 🔍 Troubleshooting Workflow

### Step 1: Identify
- Copy exacte error message
- Note de context (user action, environment)
- Check browser console voor stack trace

### Step 2: Search
- Search in dit document
- Search in app-specific docs
- Search GitHub issues

### Step 3: Resolve
- Try documented solution
- If new error: research & document

### Step 4: Document
- Add to this file als nieuw
- Update bestaande entry als variant
- Include: error, cause, solution, prevention

### Step 5: Prevent
- Add test voor deze case
- Update code patroon om te voorkomen
- Update development docs indien nodig

---

## 📊 Error Statistics

### Most Common Categories
1. TypeScript type errors (35%)
2. Firebase permissions (25%)
3. Build configuration (15%)
4. External APIs (10%)
5. Performance (10%)
6. Other (5%)

### Resolution Time
- **Avg:** [X] minuten
- **Known errors:** [Y] minuten
- **New errors:** [Z] minuten

**Lessons Learned:**
- [Learning 1]
- [Learning 2]
```

---

## 📋 Template: Webbie-Tech-Decisions.md

```markdown
# Webbie - Technology Decisions & Rationale

## 🎯 Purpose
Document waarom bepaalde tech keuzes gemaakt zijn, zodat toekomstige beslissingen consistent zijn.

---

## Frontend Framework: React

**Gekzen op:** [Datum]

**Waarom React?**
✅ Grote community & ecosystem
✅ TypeScript support uitstekend
✅ Herbruikbare components
✅ Goede developer experience
✅ [Jouw specifieke redenen]

**Not chosen:**
- ❌ Vue: [Reden]
- ❌ Angular: [Reden]
- ❌ Svelte: [Reden]

**Review:**
Re-evaluate in [Jaar] of bij grote nieuwe projecten

---

## Backend: Firebase

**Gekozen op:** [Datum]

**Waarom Firebase?**
✅ Rapid development (no backend code needed)
✅ Real-time database (Firestore)
✅ Authentication ingebouwd
✅ Hosting + Functions
✅ Goede free tier
✅ [Jouw specifieke redenen]

**Not chosen:**
- ❌ AWS: [Reden]
- ❌ Own Node.js backend: [Reden]
- ❌ Supabase: [Reden]

**Trade-offs:**
- Vendor lock-in (mitigatie: abstractie layer)
- Cost bij scale (monitoring + alerts)

**Review:**
Monitor costs monthly, re-evaluate at >€500/maand

---

## Styling: Tailwind CSS

**Gekozen op:** [Datum]

**Waarom Tailwind?**
✅ Utility-first = snelle development
✅ Geen CSS files te managen
✅ Tree-shaking = klein bundle
✅ Dark mode ingebouwd
✅ Responsive utilities
✅ [Jouw specifieke redenen]

**Not chosen:**
- ❌ Plain CSS: [Reden]
- ❌ CSS Modules: [Reden]
- ❌ Styled Components: [Reden]
- ❌ Material-UI: [Reden]

**Review:**
Happy with choice, geen reden om te switchen

---

## Build Tool: Vite

**Gekozen op:** [Datum]

**Waarom Vite?**
✅ Extreem snelle dev server
✅ Native ESM support
✅ Optimale production builds
✅ TypeScript out-of-the-box
✅ [Jouw specifieke redenen]

**Not chosen:**
- ❌ Create React App: [Reden]
- ❌ Webpack: [Reden]

**Review:**
Very satisfied, blijf gebruiken

---

## [Andere Tech Keuzes...]

Continue met alle belangrijke tech:
- State management
- Testing framework
- CI/CD platform
- Deployment platform
- Analytics
- Error tracking
- etc.
```

---

## 🚀 Implementation Plan

### Fase 1: Setup Structuur (30 min)
1. Maak folder `webbie-knowledge-base/`
2. Maak alle subfolders (01-Bedrijf, 02-Apps, etc.)
3. Maak `00-START-HERE.md` (copy template, vul in)

### Fase 2: Bedrijf Docs (1-2 uur)
1. `Webbie-Bedrijfsprofiel.md` - vul volledig in
2. `Webbie-Services-Prijzen.md` - diensten + prijzen
3. `Webbie-Business-Metrics.md` - cijfers + stats

### Fase 3: Apps Portfolio (per app 30 min)
1. Maak `Webbie-Apps-Overzicht.md`
2. Voor elke app: `Webbie-App-[Naam].md`
   - Link naar module overzicht docs (die we al hebben!)
   - Tech stack
   - Deployment info
   - Credentials (encrypted/envs)

### Fase 4: Tech Stack Docs (2 uur)
1. `Webbie-Tech-Stack-Overzicht.md`
2. `Webbie-Tech-Decisions.md` - waarom React, Firebase, etc.
3. `Webbie-Tech-Patterns.md` - herbruikbare patterns

### Fase 5: Error Database (ongoing)
1. Maak `Webbie-Errors-Resolved.md`
2. Voeg alle errors toe die je ooit gehad hebt
3. Update bij elke nieuwe error + oplossing

### Fase 6: Development Docs (1-2 uur)
1. `Webbie-Dev-Standards.md` - code conventions
2. `Webbie-Dev-Workflows.md` - git flow, deployment
3. `Webbie-AI-Preferences.md` - jouw voorkeuren voor AI

---

## 💡 Extra Tips

### Auto-Update Reminder
Voeg toe aan je workflow:
```bash
# Git commit hook of weekly reminder
echo "Update knowledge base? (y/n)"
```

### Version Control
- Commit knowledge base naar git
- Apart repo of samen met apps
- Regular backups

### Access
- Private repo (gevoelige info)
- Of: public met credentials excluded

### AI Context Files
Voor elke nieuwe AI session:
```
Context files to read:
1. webbie-knowledge-base/00-START-HERE.md
2. webbie-knowledge-base/04-Development/Webbie-Dev-Standards.md
3. webbie-knowledge-base/02-Apps-Portfolio/Webbie-App-[CurrentApp].md
```

---

## ✅ Benefits

1. **Onboarding:** Nieuwe AI assistant = 5 min reading vs 30 min explaining
2. **Consistency:** Alle apps volgen zelfde patterns
3. **Knowledge retention:** Niks vergeten
4. **Error resolution:** Faster debugging (check database first)
5. **Business context:** AI snapt business goals
6. **Scaling:** Easy to add new team members (human of AI)

---

**Start vandaag! Begin met START-HERE.md en bouw iteratief uit.** 🚀

---

**Vragen of suggesties?**
Update dit document met verbeteringen!
