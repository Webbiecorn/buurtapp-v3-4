# GitHub Copilot: Handleiding voor Module Documentatie Genereren

## Overzicht

Deze handleiding beschrijft hoe je GitHub Copilot kunt gebruiken om complete, herbruikbare documentatie te genereren voor app modules. De workflow bestaat uit drie typen documenten die samen een compleet documentatie-ecosysteem vormen.

**Bestandsnaamconventie:**
Alle bestanden beginnen met `Webbie-[AppNaam]-...` waarbij de AppNaam in UpperCamelCase wordt geschreven.

---

## Type 1: Complete Module Overzicht

### Bestandsnaam
```
Webbie--[AppNaam]-Overzicht-Modules-[DD-MM-YYYY].md
```

**Voorbeeld:** `Webbie--BuurtApp-Overzicht-Modules-16-02-2026.md`

### Doel
Een uitgebreid naslagwerk (1000+ regels) met:
- Alle modules in de applicatie
- Volledige feature beschrijvingen
- TypeScript data modellen
- Component architectuur
- Dependencies tussen modules
- Firebase/backend integratie
- Authenticatie & autorisatie
- Deployment strategie

### Prompt voor GitHub Copilot

```
Maak een compleet overzicht document genaamd "Webbie--[AppNaam]-Overzicht-Modules-[huidige datum].md"
met de volgende structuur:

# [App Naam] - Complete Module Overzicht

## 1. Project Informatie
- **Naam**: [App naam]
- **Type**: [Beschrijving]
- **Tech Stack**:
  - Frontend: React 18 + TypeScript + Vite + Tailwind CSS
  - Backend: [Firebase/Node/etc]
  - State Management: React Context API
  - [Andere relevante tech]
- **Purpose**: [Wat doet de app]

## 2. Applicatie Architectuur
### 2.1 Frontend Structuur
```
src/
├── components/     # Herbruikbare UI componenten
├── pages/         # Route/page componenten
├── context/       # React Context providers
├── services/      # API/Firebase services
├── utils/         # Helper functies
├── types.ts       # TypeScript interfaces
```

### 2.2 Routing Structuur
- Lijst van alle routes met beschrijving
- Route guards (auth required, role-based)

## 3. Core Modules
Voor elk van de hoofdmodules:

### 3.X [Module Naam]
**Files:**
- `src/pages/[ModulePagina].tsx` - Hoofdpagina
- `src/components/[ModuleComponents].tsx` - Specifieke componenten

**Features:**
1. [Feature 1 met sub-features]
2. [Feature 2 met sub-features]
3. [etc...]

**Data Model:**
```typescript
export interface [ModuleInterface] {
  id: string;
  // Alle velden met types en comments
}
```

**Firebase Integration:**
- Collection: `[collection_name]`
- Security Rules: [Beschrijving]
- Storage paths: `[paths]`

**Context API Functions:**
```typescript
const get[Module]s = () => { /* ... */ };
const add[Module] = (data) => { /* ... */ };
const update[Module] = (id, updates) => { /* ... */ };
```

**Dependencies:**
- [Andere modules waar dit module van afhangt]

**Screenshots/UI Beschrijving:**
- [Beschrijving van UI layout]

## 4. Shared Components
Lijst van herbruikbare componenten met:
- Component naam
- Props interface
- Gebruik voorbeelden

## 5. Services & Integrations
### 5.1 Firebase Services
- Firestore collections overzicht
- Storage bucket structuur
- Cloud Functions lijst

### 5.2 External APIs
- API naam + purpose
- Endpoints gebruikt
- Authentication methode

## 6. State Management
- Context providers beschrijving
- Globale state structure
- Data flow patterns

## 7. Authentication & Authorization
- Rol types beschrijving
- Permission matrix
- Protected routes

## 8. Styling & Theming
- Tailwind configuratie
- Dark mode implementatie
- Custom components styling

## 9. Testing Strategy
- Test stack
- Coverage requirements
- Key scenarios to test

## 10. Deployment
- Build proces
- Environment variables
- Deployment platform
- CI/CD pipeline

## 11. Future Enhancements
Geplande features en verbeteringen

Analyseer de volledige codebase en genereer een compleet, accuraat overzicht van minimaal 1000 regels.
```

---

## Type 2: Individuele Module Prompts (AI Generation Ready)

### Bestandsnaam
```
Webbie-[AppNaam]-Prompt-Module-[ModuleNaam].md
```

**Voorbeeld:** `Webbie-BuurtApp-Prompt-Module-Meldingen.md`

### Doel
Standalone prompts (500-700 regels per module) die je kunt copy-pasten naar een AI generator (ChatGPT, Claude, etc.) om een complete, werkende module te laten genereren.

### Aantal Bestanden
Maak één bestand per hoofdmodule in de app. Typisch 6-12 modules per app:
- Dashboard/Homepage
- [Core Feature 1]
- [Core Feature 2]
- [Core Feature 3]
- Gebruikersbeheer/Admin
- Statistieken/Analytics
- Kaart/Map (indien van toepassing)
- Chat/AI Assistent (indien van toepassing)
- [Eventuele andere hoofdfeatures]

### Prompt voor GitHub Copilot

```
Genereer voor elke hoofdmodule in de app een apart bestand genaamd
"Webbie-[AppNaam]-Prompt-Module-[ModuleNaam].md" met de volgende structuur:

# AI Prompt: [Module Naam] Module - [App Naam]

## Context
Je gaat een complete [Module Naam] module bouwen voor een [beschrijving app].
[1-2 zinnen wat deze specifieke module doet]

## Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6
- **Build Tool:** Vite 6.4
- **Styling:** Tailwind CSS 3.4 (dark mode)
- **State Management:** React Context API
- **[Module-specifieke tech]:** [Bijv. Leaflet voor maps, ECharts voor statistieken, etc.]
- **Backend:** [Firebase/andere]
- **Icons:** Lucide React

## Module Requirements

### Core Functionaliteit

1. **[Feature 1 Naam]**
   - Sub-feature A
   - Sub-feature B
   - Sub-feature C
   - Technische details:
     - [Hoe werkt het]
     - [Belangrijke logica]

2. **[Feature 2 Naam]**
   - Sub-feature A
   - Sub-feature B
   - [etc...]

3. **[Feature 3 Naam]**
   [Continue met alle features]

[Geef 5-8 hoofdfeatures met gedetailleerde sub-features]

## Data Model

### [Module] Data Structures

```typescript
export interface [MainInterface] {
  id: string;
  [field]: [type]; // Comment wat dit veld doet
  [field2]: [type]; // Comment
  // Alle velden volledig gedocumenteerd
}

export interface [SubInterface] {
  // Related interfaces
}

export type [Type] = 'option1' | 'option2' | 'option3';
```

## Firebase Integration (indien van toepassing)

### Firestore Collection
```typescript
// Collection: '[collection_name]'
{
  id: string,
  [field]: type,
  // Exacte Firestore structure met types
}
```

### Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /[collection]/{docId} {
      // Security rules voor deze collection
    }
  }
}
```

### Context API Functions
```typescript
// In AppContext.tsx of [Module]Context.tsx

const get[Items] = async () => {
  // Implementation
};

const add[Item] = async (data: Omit<[Interface], 'id'>) => {
  // Implementation met serverTimestamp, etc.
};

const update[Item] = async (id: string, updates: Partial<[Interface]>) => {
  // Implementation
};

const delete[Item] = async (id: string) => {
  // Implementation
};

// Alle CRUD + module-specifieke functies
```

## Component Examples

### [MainPage].tsx
```tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button, Card, Input } from '@/components/ui';
import { [Icons] } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const [ModulePage]: React.FC = () => {
  const navigate = useNavigate();
  const { [data], [functions], currentUser } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<[FilterType]>({});

  // State management

  // Computed values
  const filtered[Items] = useMemo(() => {
    return [data].filter(item => {
      // Filter logic
    });
  }, [[data], searchQuery, filters]);

  // Event handlers
  const handle[Action] = async () => {
    try {
      // Implementation
      toast.success('[Success message]');
    } catch (error) {
      console.error('[Error context]:', error);
      toast.error('[Error message]');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            [Module Titel]
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            [Beschrijving]
          </p>
        </div>

        {currentUser?.role !== 'Viewer' && (
          <Button onClick={() => navigate('/#/[route]/nieuw')}>
            <[Icon] className="w-5 h-5 mr-2" />
            Nieuw [Item]
          </Button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Filter components */}
      </div>

      {/* Main Content */}
      <div className="[layout class]">
        {filtered[Items].map(item => (
          <[ItemComponent] key={item.id} item={item} />
        ))}
      </div>

      {/* Empty State */}
      {filtered[Items].length === 0 && (
        <div className="text-center py-12">
          <[Icon] className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            [Empty state bericht]
          </p>
        </div>
      )}
    </div>
  );
};

// Sub-components indien relevant
const [SubComponent]: React.FC<{ [props] }> = ({ [props] }) => {
  // Component implementation

  return (
    <div className="[styling]">
      {/* Component content */}
    </div>
  );
};
```

### [Modal/Detail/Form].tsx (indien relevant)
```tsx
// Tweede belangrijke component met 100-200 regels werkende code
```

### [Third Component].tsx (optioneel)
```tsx
// Derde component indien module complex is
```

[GEEF 200-500 REGELS WERKENDE CODE VOORBEELDEN]

## UI/UX Requirements

### Layout
- [Desktop layout beschrijving]
- [Tablet layout beschrijving]
- [Mobile layout beschrijving]

### Styling Guidelines
```css
/* Belangrijke Tailwind classes */
- Primary button: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
- Card: "bg-white dark:bg-gray-800 rounded-lg shadow p-6"
- Input: "px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"

/* Status colors */
- [Status 1]: bg-[color]-100 text-[color]-700 dark:bg-[color]-900 dark:text-[color]-300
- [Status 2]: [kleuren]
```

### Responsive Breakpoints
- Mobile: `max-w-full`
- Tablet: `md:max-w-2xl`
- Desktop: `lg:max-w-4xl`

### Dark Mode
Gebruik altijd `dark:` variants voor alle kleuren:
```tsx
className="text-gray-900 dark:text-white bg-white dark:bg-gray-800"
```

## Analytics Tracking (indien Firebase Analytics gebruikt wordt)

```typescript
import { trackEvent } from '@/services/analytics';

trackEvent('[module]_viewed');
trackEvent('[module]_[action]_clicked', { [context]: value });
trackEvent('[module]_[item]_created', { id: itemId });
trackEvent('[module]_[item]_updated', { id: itemId, field: fieldName });
trackEvent('[module]_exported', { format: 'excel' });
```

## Testing Checklist

Functionele Tests:
- [ ] [Feature 1] werkt correct
- [ ] [Feature 2] toont juiste data
- [ ] [Action] triggert juiste functie
- [ ] Error handling toont toast notifications
- [ ] Loading states tijdens async operations
- [ ] Empty states tonen correct bericht

Rol-gebaseerde Tests:
- [ ] Admin kan [admin actions]
- [ ] [Role] kan [role actions]
- [ ] Viewer kan alleen lezen

UI/UX Tests:
- [ ] Responsive layout (mobile/tablet/desktop)
- [ ] Dark mode support volledig
- [ ] Keyboard navigatie werkt (Tab, Enter, ESC)
- [ ] Loading skeletons tijdens data fetch
- [ ] Success/error toasts verschijnen

Performance Tests:
- [ ] Pagina laadt in <2 seconden
- [ ] Grote lijsten (>100 items) blijven responsief
- [ ] Geen memory leaks bij unmount

Integratie Tests:
- [ ] Firebase write operations succesvol
- [ ] File uploads werken (indien van toepassing)
- [ ] External API calls succesvol (indien van toepassing)

## File Structure

```
src/
├── pages/
│   ├── [ModulePage].tsx          # Hoofdpagina (200-300 regels)
│   ├── [ModuleDetailPage].tsx    # Detail view (150-250 regels)
│   └── [ModuleFormPage].tsx      # Create/edit form (200-300 regels)
├── components/
│   ├── [ModuleCard].tsx          # Item card component (50-100 regels)
│   ├── [ModuleModal].tsx         # Modal component (100-150 regels)
│   └── [ModuleFilter].tsx        # Filter component (80-120 regels)
└── services/
    └── [module].ts               # API calls / helpers (100-200 regels)
```

## Dependencies (indien module-specifiek)

```json
{
  "[package-name]": "^[version]",  // [Wat het doet]
  "[package-name-2]": "^[version]"  // [Wat het doet]
}
```

**Installatie:**
```bash
npm install [packages]
```

## Implementation Notes

### Belangrijke Overwegingen
1. [Belangrijk punt over implementatie]
2. [Performance optimalisatie tip]
3. [Security overweging]
4. [Common pitfall om te vermijden]

### Best Practices
- [Best practice 1]
- [Best practice 2]
- [Best practice 3]

### Troubleshooting
**Probleem:** [Veelvoorkomend probleem]
**Oplossing:** [Hoe op te lossen]

---

Succes met het bouwen van de [Module Naam] module! 🚀
```

**Belangrijke Instructies:**
- Elk prompt bestand moet **500-700 regels** zijn
- Include **200-500 regels werkende code voorbeelden**
- Alle TypeScript types volledig gedocumenteerd
- Firebase integratie compleet beschreven
- UI voorbeelden met concrete Tailwind classes
- Testing checklist moet exhaustief zijn
- Prompt moet **standalone** zijn - geen externe context nodig
- Code moet **copy-paste ready** zijn

Genereer dit voor ELKE hoofdmodule in de app.
```

---

## Type 3: Updates/Werkzaamheden Document

### Bestandsnaam
```
Webbie--[AppNaam]-Updates-[DD-MM-YYYY].md
```

**Voorbeeld:** `Webbie--BuurtApp-Updates-16-02-2026.md`

### Doel
Dagelijkse/periodieke changelog met werkzaamheden, bugfixes, features toegevoegd, etc.

### Prompt voor GitHub Copilot

```
Maak een updates document genaamd "Webbie--[AppNaam]-Updates-[huidige datum].md" met:

# [App Naam] - Updates & Werkzaamheden [Datum]

## Samenvatting
[Paragraaf met overzicht van wat er gedaan is]

## Nieuwe Features

### [Feature Naam]
**Status:** ✅ Voltooid / 🚧 In Progress / ⏸️ On Hold

**Beschrijving:**
[Wat is toegevoegd]

**Files Changed:**
- `[path/to/file.tsx]` - [Wat er veranderd is]
- `[path/to/file2.ts]` - [Wat er veranderd is]

**Details:**
1. [Implementatie detail 1]
2. [Implementatie detail 2]

**Testing:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] User acceptance

**Screenshots/Preview:**
[Beschrijving of link]

---

### [Feature 2 Naam]
[Zelfde structuur]

## Bug Fixes

### 🐛 [Bug Beschrijving]
**Status:** ✅ Fixed

**Probleem:**
[Wat was het probleem]

**Oorzaak:**
[Root cause]

**Oplossing:**
[Hoe het opgelost is]

**Files Changed:**
- `[file.tsx]`

---

## Refactoring & Optimalisaties

### [Refactor Naam]
**Reason:** [Waarom was dit nodig]

**Changes:**
- [Change 1]
- [Change 2]

**Impact:**
- Performance: [Verbetering]
- Maintainability: [Verbetering]
- Bundle Size: [Change]

---

## Styling & UI Verbeteringen

### [UI Update]
[Beschrijving van styling changes]

**Before:**
[Oude state]

**After:**
[Nieuwe state]

---

## Database/Backend Changes

### Firestore
**New Collections:**
- `[collection]` - [Purpose]

**Security Rules Updated:**
- [Rule change beschrijving]

**Indexes Added:**
- Collection: `[name]`, Fields: `[field1, field2]`

### Cloud Functions
**New Functions:**
- `[functionName]` - [Purpose]

**Updated Functions:**
- `[functionName]` - [Changes]

---

## Dependencies

### Added
```json
{
  "[package]": "^[version]"  // [Why added]
}
```

### Updated
```json
{
  "[package]": "[old] → [new]"  // [Migration notes]
}
```

### Removed
- `[package]` - [Why removed, alternative used]

---

## Configuration Changes

### Environment Variables
**Added:**
- `VITE_[VAR_NAME]` - [Purpose]

**Updated:**
- `VITE_[VAR_NAME]` - [Change beschrijving]

### Build Configuration
[Vite/webpack/andere config changes]

---

## Testing

### Test Coverage
- Unit: [XX]%
- Integration: [XX]%

### New Tests Added
- `[test-file.test.ts]` - [XX] tests voor [feature]

### Test Results
✅ All [XX] tests passing

---

## Performance Metrics

### Build Time
- Before: [X]s
- After: [Y]s
- Change: [+/-Z]s

### Bundle Size
- Before: [X] KB
- After: [Y] KB
- Change: [+/-Z] KB

### Lighthouse Scores (indien gemeten)
- Performance: [score]/100
- Accessibility: [score]/100
- Best Practices: [score]/100
- SEO: [score]/100

---

## Documentation

### Updated Docs
- `README.md` - [Changes]
- `[doc-file.md]` - [Changes]

### New Docs
- `[new-doc.md]` - [Purpose]

---

## Known Issues

### 🚨 Critical
[Geen of lijst van critical issues]

### ⚠️ Important
- [Issue beschrijving] - [Workaround if any]

### 📝 Minor
- [Minor issue] - [Priority: Low/Medium]

---

## Next Steps

### Planned for Next Sprint/Session
1. [ ] [Task 1]
2. [ ] [Task 2]
3. [ ] [Task 3]

### Backlog Items
- [Feature request]
- [Improvement idea]
- [Tech debt item]

---

## Time Tracking

### Hours Spent
- Development: [X] uren
- Testing: [Y] uren
- Documentation: [Z] uren
- **Total:** [TOTAL] uren

### Productivity Notes
[Wat ging goed, wat kan beter, blockers, etc.]

---

## Deployment

### Deployment Date
[Datum indien deployed]

### Environment
- [x] Development
- [x] Staging
- [ ] Production

### Rollback Plan
[Hoe terug te rollen indien nodig]

---

## Team Notes

### Decisions Made
1. [Beslissing] - [Rationale]
2. [Beslissing] - [Rationale]

### Questions/Blockers
- [Open vraag]
- [Blocker]

### Shoutouts
[Credits voor team members, helpful resources, etc.]

---

**Generated:** [Datum + tijd]
**Author:** [Naam]
**Version:** [App version]
```

Analyseer alle changes vandaag in de codebase en vul dit volledig in.
```

---

## Workflow Voorbeeld

### Scenario: Nieuwe App "TaskManager"

**Stap 1:** Creëer Module Overzicht
```
Prompt: "Maak een Webbie--TaskManager-Overzicht-Modules-16-02-2026.md met alle
modules in de TaskManager app"
```
**Output:** 1 bestand, ~1200 regels

---

**Stap 2:** Creëer Module Prompts
```
Prompt: "Maak voor elke module in TaskManager een apart prompt bestand:
- Webbie-TaskManager-Prompt-Module-Dashboard.md
- Webbie-TaskManager-Prompt-Module-Tasks.md
- Webbie-TaskManager-Prompt-Module-Projects.md
- Webbie-TaskManager-Prompt-Module-Teams.md
- Webbie-TaskManager-Prompt-Module-Calendar.md
- Webbie-TaskManager-Prompt-Module-Analytics.md
- Webbie-TaskManager-Prompt-Module-Settings.md

Elk bestand moet 500-700 regels zijn met complete code voorbeelden."
```
**Output:** 7 bestanden, elk ~600 regels

---

**Stap 3:** Creëer Updates Document
```
Prompt: "Maak een Webbie--TaskManager-Updates-16-02-2026.md met alle
werkzaamheden van vandaag"
```
**Output:** 1 bestand, ~400 regels

---

**Totaal:** 9 bestanden, ~7000 regels documentatie

---

## Tips & Best Practices

### Voor GitHub Copilot

1. **Wees Specifiek:**
   - Geef exacte bestandsnamen inclusief datum
   - Specificeer gewenste regelaantallen
   - Vermeld alle modules expliciet

2. **Iteratief Werken:**
   - Maak eerst het overzicht document
   - Gebruik dat overzicht als basis voor module prompts
   - Review en verfijn per module

3. **Context Geven:**
   - Start prompt met: "Analyseer de volledige codebase"
   - Verwijs naar bestaande files: "Gebaseerd op src/pages/*.tsx"
   - Gebruik: "Consistent met de style guide in .github/copilot-instructions.md"

4. **Structuur Afdwingen:**
   - Geef expliciete section headers in prompt
   - Specificeer: "Gebruik deze exact structure: [...]"
   - Vraag om voorbeelden: "Include 3 code examples van 150+ regels elk"

5. **Kwaliteit Checken:**
   - Prompt voor review: "Verify dat alle TypeScript types compleet zijn"
   - Vraag om: "Ensure alle code examples zijn syntactically correct"

### Voor Module Prompts

1. **Standalone Maken:**
   - Geen reference naar andere files
   - Alle imports expliciet vermelden
   - Complete TypeScript interfaces included

2. **Code Voorbeelden:**
   - Minimaal 200 regels werkende code
   - Geen pseudocode, echte implementatie
   - Inline comments voor uitleg

3. **Testing:**
   - Exhaustieve checklist (15-25 items)
   - Cover functional, UI, performance, security
   - Role-based testing included

4. **AI-Optimized:**
   - Duidelijke sectie headers
   - Bullet points voor scanability
   - Code blocks met syntax highlighting

### Naamgeving Conventies

```
Webbie-[AppNaam]-Prompt-Module-[ModuleNaam].md
      ↑          ↑                 ↑
      Prefix   UpperCamelCase   UpperCamelCase

Webbie--[AppNaam]-Overzicht-Modules-[DD-MM-YYYY].md
       ↑↑       Dubbele hyphen voor overzicht/meta documents

Webbie--[AppNaam]-Updates-[DD-MM-YYYY].md
       ↑↑       Dubbele hyphen voor periodieke documents
```

**AppNaam Voorbeelden:**
- BuurtApp
- TaskManager
- EcommerceShop
- FitnessTracker
- BlogPlatform

**ModuleNaam Voorbeelden:**
- Dashboard
- Meldingen (of Issues)
- Projecten (of Projects)
- Gebruikers (of Users)
- Statistieken (of Analytics)
- Kaart (of Map)
- Chat
- Settings

---

## Checklist voor Complete Documentatie Set

### ✅ Module Overzicht Document
- [ ] Bestand aangemaakt: `Webbie--[App]-Overzicht-Modules-[datum].md`
- [ ] Minimaal 1000 regels
- [ ] Alle modules beschreven
- [ ] TypeScript interfaces compleet
- [ ] Firebase structure gedocumenteerd
- [ ] Routing overzicht
- [ ] Deployment sectie

### ✅ Module Prompt Bestanden
- [ ] Eén bestand per hoofdmodule
- [ ] Elke prompt 500-700 regels
- [ ] 200-500 regels code voorbeelden per prompt
- [ ] Standalone (geen externe dependencies in uitleg)
- [ ] Complete TypeScript types
- [ ] Firebase integration beschreven
- [ ] Testing checklist (15+ items)
- [ ] UI/UX guidelines met Tailwind voorbeelden

### ✅ Updates Document
- [ ] Bestand aangemaakt: `Webbie--[App]-Updates-[datum].md`
- [ ] Alle features gedocumenteerd
- [ ] Bug fixes beschreven
- [ ] Files changed lijst
- [ ] Testing status
- [ ] Dependencies changes
- [ ] Next steps sectie

### ✅ Kwaliteit
- [ ] Geen syntax errors in code voorbeelden
- [ ] Consistent naming (Webbie- prefix)
- [ ] Nederlandse teksten (indien Nederlands de app taal is)
- [ ] Markdown formatting correct
- [ ] Links tussen documents (indien relevant)

---

## Voorbeeld Prompts aan GitHub Copilot

### Prompt 1: Start New Documentation Set
```
Ik ga een complete documentatie set maken voor mijn [AppNaam] applicatie.

Stap 1: Maak een overzicht document "Webbie--[AppNaam]-Overzicht-Modules-[datum].md"
- Analyseer de volledige codebase
- Documenteer alle modules in src/pages/
- Include complete TypeScript interfaces uit src/types.ts
- Beschrijf Firebase collections uit firestore.rules
- Minimaal 1000 regels
- Volg de structuur uit Webbie-Uitleg-CoPilot-Prompt-Maken-Modules.md

Maak alleen het overzicht document, de module prompts komen later.
```

### Prompt 2: Generate Module Prompts
```
Op basis van het overzicht document "Webbie--[AppNaam]-Overzicht-Modules-[datum].md",
genereer nu voor elke hoofdmodule een apart AI-generation prompt bestand:

Bestanden om te maken:
1. Webbie-[AppNaam]-Prompt-Module-Dashboard.md
2. Webbie-[AppNaam]-Prompt-Module-[Module1].md
3. Webbie-[AppNaam]-Prompt-Module-[Module2].md
[etc... lijst alle modules]

Elke prompt moet:
- 500-700 regels zijn
- 200-500 regels werkende code examples bevatten
- Standalone zijn (copy-paste ready naar ChatGPT/Claude)
- Complete TypeScript interfaces hebben
- Firebase integration beschrijven
- Exhaustieve testing checklist (15+ items)
- UI voorbeelden met concrete Tailwind classes

Volg exact de template structuur uit Webbie-Uitleg-CoPilot-Prompt-Maken-Modules.md

Maak deze bestanden één voor één, zodat ik elk kan reviewen.
```

### Prompt 3: Generate Updates Document
```
Maak een updates document "Webbie--[AppNaam]-Updates-[datum].md" met alle
werkzaamheden van vandaag.

Analyseer alle git changes vandaag in:
- src/pages/
- src/components/
- src/context/
- package.json
- [andere relevante paths]

Documenteer:
- Nieuwe features met file changes
- Bug fixes met before/after
- Refactoring met rationale
- Dependencies changes
- Testing status
- Next steps

Minimaal 400 regels, volg template uit Webbie-Uitleg-CoPilot-Prompt-Maken-Modules.md
```

---

## Onderhoud & Updates

### Wanneer Updaten?

**Module Overzicht Document:**
- Bij major refactor van app
- Bij toevoegen/verwijderen modules
- Maandelijks voor grote apps
- Versie in filename: `...-Modules-v2-[datum].md`

**Module Prompt Bestanden:**
- Bij breaking changes in module
- Bij nieuwe features in module
- Keep old version, create new: `...-Module-[Naam]-v2.md`

**Updates Document:**
- Na elke coding sessie
- Minimaal dagelijks voor actieve development
- Wekelijks voor maintenance mode
- Nieuw bestand per dag/week

### Archivering
```
docs/
├── archive/
│   └── 2026/
│       ├── 01-januari/
│       │   ├── Webbie--[App]-Updates-01-01-2026.md
│       │   └── Webbie--[App]-Updates-15-01-2026.md
│       └── 02-februari/
│           └── Webbie--[App]-Updates-16-02-2026.md
├── current/
│   ├── Webbie--[App]-Overzicht-Modules-[latest].md
│   └── Webbie-[App]-Prompt-Module-*.md
```

---

## Troubleshooting

### Probleem: Copilot maakt te korte prompts
**Oplossing:**
- Specificeer expliciet: "Minimaal 600 regels per prompt"
- Vraag: "Include 3-4 complete component examples van 150+ regels elk"

### Probleem: Code voorbeelden zijn incomplete
**Oplossing:**
- Prompt: "Alle code moet syntactically correct TypeScript zijn"
- Vraag: "No pseudocode, full implementation with all imports"

### Probleem: Types ontbreken
**Oplossing:**
- "Include complete TypeScript interfaces met alle velden en comments"
- "Extract types from src/types.ts and include in prompt"

### Probleem: Inconsistente naming
**Oplossing:**
- Start prompt met: "Use exactly these filenames: [list]"
- "Follow naming convention: Webbie-[AppNaam]-..."

---

## Voorbeelden Structuur per App Type

### E-commerce App
**Modules:**
- Dashboard
- Products (Catalog)
- Orders
- Customers
- Inventory
- Analytics
- Marketing
- Settings

### Project Management App
**Modules:**
- Dashboard
- Projects
- Tasks
- Team
- Calendar
- Documents
- Reports
- Admin

### Social Media App
**Modules:**
- Feed/Dashboard
- Posts
- Messages
- Profile
- Search
- Notifications
- Analytics
- Settings

### CRM App
**Modules:**
- Dashboard
- Leads
- Contacts
- Deals
- Activities
- Reports
- Settings
- Integrations

---

## Veelgestelde Vragen

**Q: Hoeveel tijd kost dit?**
A:
- Overzicht document: 10-15 minuten
- Per module prompt: 5-8 minuten
- Updates document: 5-10 minuten
- Totaal voor 8 modules: ~90 minuten

**Q: Kan ik prompts hergebruiken voor andere apps?**
A: Deels. De structuur is herbruikbaar, maar content moet app-specifiek zijn.

**Q: Moet elke subpage een eigen prompt?**
A: Nee. Groepeer gerelateerde pages in één module (bijv. TasksPage + TaskDetailPage + NewTaskPage = één "Tasks" module)

**Q: In welke taal documenteren?**
A: Match de app taal. Nederlandse app → Nederlandse docs. Engelse app → Engelse docs.

**Q: Moet ik alle code uit de app in de prompts?**
A: Nee. Representatieve voorbeelden (200-500 regels) zijn genoeg. Focus op structure, niet elke regel.

---

## Conclusie

Met deze workflow creëer je een complete, herbruikbare documentatie set die:

✅ **Overzichtelijk** is voor developers
✅ **Herbruikbaar** is voor AI generators
✅ **Up-to-date** blijft met reguliere updates
✅ **Standalone** modules definieert
✅ **Consistent** naamgeving gebruikt

**Next Steps:**
1. Start met Module Overzicht document
2. Genereer Module Prompts (één per hoofdmodule)
3. Maak Updates document periodiek
4. Review en verfijn waar nodig
5. Archive oude versies, keep current updated

**Result:**
Een complete library van AI-generation-ready prompts waarmee je je hele app kunt regenereren! 🚀

---

**Laatst bijgewerkt:** 16 februari 2026
**Versie:** 1.0
**Auteur:** Webbie Documentation System
