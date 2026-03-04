# 🏘️ Buurtconciërge App - Complete Module Overzicht

**Versie:** v0.3.5
**Datum:** 16 februari 2026
**Type:** React + TypeScript + Firebase PWA

---

## 📋 Inhoudsopgave

1. [Applicatie Overzicht](#applicatie-overzicht)
2. [User Management & Rollen](#user-management--rollen)
3. [Core Modules](#core-modules)
4. [Pagina's (Routes)](#paginas-routes)
5. [Services & Integraties](#services--integraties)
6. [Componenten Bibliotheek](#componenten-bibliotheek)
7. [Hooks & Utilities](#hooks--utilities)
8. [Data Models](#data-models)
9. [Backend (Firebase Functions)](#backend-firebase-functions)
10. [Development Tools](#development-tools)

---

## 🎯 Applicatie Overzicht

### Doel
De Buurtconciërge App is een complete wijkbeheer applicatie voor het melden, plannen, documenteren en rapporteren van wijkwerk. De app biedt dossiers per adres, projectbeheer, urenregistratie, statistieken en integraties met externe diensten zoals Fixi en PDOK.

### Tech Stack
- **Frontend:** React 18.3 + TypeScript 5.6 + Vite 6.4
- **State Management:** React Context API (AppContext)
- **Styling:** Tailwind CSS 3.4 (mobile-first, dark mode)
- **Routing:** React Router v6 (HashRouter)
- **Maps:** Leaflet (details), Google Maps (@vis.gl/react-google-maps, statistieken)
- **Charts:** Apache ECharts (echarts-for-react) - moderne interactieve visualisaties
- **Backend:** Firebase (Firestore, Auth, Storage, Functions, Hosting, Analytics, Performance)
- **PWA:** Service Workers, Offline support, Manifest
- **Build:** Vite (bundle: 4.9 MB, 40 assets)

### Target Users
- **Beheerders:** Volledige admin rechten, gebruikersbeheer, alle data toegang
- **Conciërges:** Kunnen eigen data creëren/bewerken, meldingen, projecten, dossiers
- **Viewers:** Read-only toegang tot publieke data

---

## 👥 User Management & Rollen

### Authenticatie
**Locatie:** `src/firebase.ts`, `src/context/AppContext.tsx`

- **Login systeem:** Firebase Authentication (email/password)
- **Context-based auth:** `AppContext` beheert `currentUser` state
- **Protected routes:** Role-based routing in `App.tsx`
- **Session management:** Persistent login met Firebase tokens

### Gebruikersrollen

#### 1. **Beheerder** (`UserRole.Beheerder`)
- Volledige toegang tot alle functionaliteit
- Kan gebruikers uitnodigen en beheren
- Toegang tot AdminPage voor gebruikersbeheer
- Kan alle dossiers, meldingen en projecten inzien/wijzigen

#### 2. **Conciërge** (`UserRole.Concierge`)
- Kan eigen meldingen, projecten en dossiers aanmaken
- Kan eigen urenregistratie beheren
- Kan dossiers maken en bewoners toevoegen
- Beperkte toegang: alleen eigen gegevens bewerken

#### 3. **Viewer** (`UserRole.Viewer`)
- Read-only toegang
- Kan statistieken bekijken
- Kan meldingen en projecten inzien
- Geen bewerkrechten

### Gebruikersbeheer Features
**Locatie:** `src/pages/AdminPage.tsx`, `src/components/InviteUserModal.tsx`

- **Uitnodigingssysteem:** Via email met tijdelijk wachtwoord `Welkom01`
- **Verplichte wachtwoord wijziging:** Bij eerste login
- **Gebruikersoverzicht:** Lijst met filters op rol en status
- **Profiel bewerking:** Avatar, naam, telefoon, email

---

## 🏗️ Core Modules

### 1. **Meldingen (Issues) Module**

#### Functionaliteit
Centraal systeem voor het registreren en beheren van wijkproblemen en klachten.

#### Componenten
- **IssuesPage** (`src/pages/IssuesPage.tsx`)
  - Toon alle meldingen met filters (status, categorie, wijk, gebruiker, datumbereik)
  - Bulk selectie en bulk acties (status wijzigen, exporteren)
  - Zoekfunctionaliteit met debouncing
  - Export naar Excel/PDF
  - Keyboard shortcuts (Ctrl+A, Delete, etc.)

- **NieuweMeldingPage** (`src/pages/NieuweMeldingPage.tsx`)
  - Formulier voor nieuwe melding
  - Adres lookups via PDOK API
  - Media uploads (foto's, video's)
  - Locatie selectie op kaart
  - Categorie selectie (17+ categorieën)
  - Wijk toewijzing (5 wijken: Atol, Boswijk, Jol, Waterwijk, Zuiderzeewijk)

- **MeldingMarker** (`src/components/MeldingMarker.tsx`)
  - Kaartmarkers met kleuren per status
  - Popup met melding details

#### Statussen
- **In behandeling** (oranje)
- **Fixi melding gemaakt** (blauw) - geïntegreerd met Fixi systeem
- **Afgerond** (groen)

#### Updates & Historie
- **MeldingUpdate** type: tekstupdates met timestamps
- Attachments per update
- Volledige audit trail per melding

#### Data Model
```typescript
interface Melding {
  id: string;
  titel: string;
  omschrijving: string;
  status: MeldingStatus;
  attachments: string[]; // URLs
  locatie?: { lat: number; lon: number; adres?: string };
  timestamp: Date;
  gebruikerId: string;
  wijk: string;
  categorie: string;
  updates: MeldingUpdate[];
  afgerondTimestamp?: Date;
}
```

---

### 2. **Projecten Module**

#### Functionaliteit
Beheer van wijkprojecten met planning, deelnemers, voortgang en documentatie.

#### Componenten
- **ProjectsPage** (`src/pages/ProjectsPage.tsx`)
  - Projectoverzicht met status filters
  - Deelnemen aan projecten
  - Uren registreren per project
  - Documenten en foto's uploaden
  - Voortgang bijhouden (0-100%)
  - Uitnodigingssysteem voor nieuwe deelnemers

- **ProjectMarker** (`src/components/ProjectMarker.tsx`)
  - Kaartweergave van projectlocaties
  - Popup met project details

#### Features
- **Project contributions:** Uren en omschrijvingen per deelnemer
- **Project invitations:** Email uitnodigingen voor externen
- **Document management:** Upload docs, photos, PDFs
- **Timeline:** Startdatum en einddatum planning
- **Budget tracking:** Optioneel budget veld

#### Statussen
- **Lopend** (actieve projecten)
- **Afgerond** (voltooide projecten)

#### Data Model
```typescript
interface Project {
  id: string;
  titel: string;
  omschrijving: string;
  status: ProjectStatus;
  startDatum?: Date;
  eindDatum?: Date;
  locatie?: Locatie;
  documenten: string[];
  deelnemers: string[]; // User IDs
  voortgang: number; // 0-100
  budget?: number;
  wijk?: string;
  contributions: ProjectContribution[];
}
```

---

### 3. **Dossiers Module**

#### Functionaliteit
Complete woningdossiers per adres met bewoners, notities, documenten, afspraken en historie.

#### Componenten
- **DossierPage** (`src/pages/DossierPage.tsx`)
  - Lijst van alle dossiers
  - Zoeken op adres
  - Filter op status en labels
  - Nieuw dossier aanmaken (via PDOK adres lookup)

- **DossierDetailPage** (`src/pages/DossierDetailPage.tsx`)
  - Volledige dossierweergave met tabs:
    - **Overzicht:** Basisinformatie, status, labels
    - **Notities:** Belangrijke notities met reacties
    - **Documenten:** Media uploads (foto's, PDF's, video's) met fullscreen viewer
    - **Bewoners:** Historisch overzicht van bewoners met contactinfo en afspraken
    - **Afspraken:** Kalenderweergave van geplande afspraken
    - **Historie:** Audit trail van alle wijzigingen
  - Kaartweergave (Leaflet) van adreslocatie
  - Linked meldingen en projecten op dit adres

#### Statussen
- **Actief** (groen) - lopende dossiers
- **Afgesloten** (grijs) - gesloten dossiers
- **In onderzoek** (geel) - onder onderzoek
- **Afspraak** (blauw) - afspraak gepland

#### Labels
- **Woning** - residentiële adressen
- **Bedrijf** - commerciële panden
- **Overig** - andere types

#### Features
- **Bewonersregistratie:** Van/tot datums, contactinfo, extra notities
- **Afspraaksysteem:** Afspraken per bewoner of algemeen
- **Document viewer:** Fullscreen overlay met toetsnavigatie (← →, ESC)
- **Notities met reacties:** Threaded comments per notitie
- **Belangrijke notities:** Pin important notes
- **PDOK integratie:** Automatische geo-coördinaten en adresvalidatie

#### Data Model
```typescript
interface WoningDossier {
  id: string; // uniek adres
  adres: string;
  gebruikerId: string;
  location?: { lat: number; lon: number } | null;
  woningType?: string | null;
  notities: DossierNotitie[];
  documenten: DossierDocument[];
  afspraken: DossierAfspraak[];
  bewoners: DossierBewoner[];
  historie: DossierHistorieItem[];
  status: DossierStatus;
  labels: DossierLabel[];
  updates: any[];
}
```

---

### 4. **Urenregistratie Module**

#### Functionaliteit
Time tracking voor conciërges met project-koppeling en activiteitcategorieën.

#### Componenten
- **UrenregistratiePage** (`src/pages/UrenregistratiePage.tsx`)
  - Overzicht van alle uren met filters (datum, gebruiker, activiteit)
  - Nieuw uren toevoegen met start/eind tijd
  - Projectkoppeling (optioneel)
  - Wijkkoppeling voor wijkrondes
  - Activiteit categorieën
  - Export naar Excel
  - Totaal uren berekening per periode

#### Activiteitcategorieën
- **Project** - gekoppeld aan specifiek project
- **Wijkronde** - patrouille/inspectie per wijk
- **Intern overleg** - teamvergaderingen
- **Extern overleg** - met partners (naam invullen)
- **Persoonlijke ontwikkeling** - training, cursus
- **Overig** - met omschrijving

#### Features
- **Automatische uren berekening:** Verschil tussen start en eind tijd
- **Project-uren overzicht:** Totaal per project
- **Wijk-uren overzicht:** Totaal per wijk
- **Excel export:** Met alle details en totalen
- **Filter op periode:** Week, maand, jaar, custom range

#### Data Model
```typescript
interface Urenregistratie {
  id: string;
  gebruikerId: string;
  start: Date;
  eind: Date;
  activiteit: 'Project' | 'Wijkronde' | 'Intern overleg' | 'Extern overleg' | 'Persoonlijke ontwikkeling' | 'Overig';
  projectId?: string;
  projectName?: string;
  wijk?: 'Atol' | 'Boswijk' | 'Jol' | 'Waterwijk' | 'Zuiderzeewijk';
  overlegPartner?: string;
  omschrijving?: string;
}
```

---

### 5. **Achterpaden Module**

#### Functionaliteit
Speciaal module voor registratie en beheer van achterpad-gerelateerde meldingen en onderhoud.

#### Componenten
- **AchterpadenPage** (`src/pages/AchterpadenPage.tsx`)
  - Landing page met navigatie naar submodules

- **AchterpadenOverzicht** (`src/pages/AchterpadenOverzicht.tsx`)
  - Lijst van achterpaden met issues
  - Filter op status en wijk

- **AchterpadenKaartOverzicht** (`src/pages/AchterpadenKaartOverzicht.tsx`)
  - Google Maps weergave van alle achterpaden
  - Markers met kleuren per status
  - Cluster markers bij inzoomen

- **AchterpadenRegistratie** (`src/pages/AchterpadenRegistratie.tsx`)
  - Formulier voor nieuwe achterpad-melding
  - Foto upload
  - Locatie selectie

- **AchterpadenStatistieken** (`src/pages/AchterpadenStatistieken.tsx`)
  - ECharts visualisaties
  - Status distributie
  - Trend over tijd

- **AchterpadenBeheer** (`src/pages/AchterpadenBeheer.tsx`)
  - Admin interface voor achterpad beheer
  - Bulk acties

#### Components
- **AchterpadCard** (`src/components/AchterpadCard.tsx`)
  - Card component voor achterpad item
- **AchterpadenStats** (`src/components/AchterpadenStats.tsx`)
  - Statistiek widgets

---

### 6. **Statistieken & Analytics Module**

#### Functionaliteit
Uitgebreide data visualisatie en rapportage met moderne ECharts grafieken.

#### Componenten
- **StatisticsPage** (`src/pages/StatisticsPage.tsx`)
  - **Dashboard layout** met multiple chart types:
    - **Meldingen Overzicht:** Line chart met trend over tijd
    - **Meldingen per Categorie:** Pie chart met categorie distributie
    - **Meldingen per Status:** Bar chart
    - **Meldingen per Wijk:** Bar chart met 5 wijken
    - **3D Bar Chart:** Wijk vs Categorie matrix (draaibaar)
    - **2D Heatmap:** Wijk vs Categorie met 6-step gradient
    - **Projecten Timeline:** Gantt-achtige weergave
    - **Uren per Week:** Line chart met totalen
  - **Performance tracking:** met usePerformanceTrace hook
  - **Responsive design:** Grid layout past aan op mobile
  - **Export functionaliteit:** Charts als PNG/SVG

- **PeriodComparison** (`src/components/PeriodComparison.tsx`)
  - Vergelijk huidige vs vorige periode
  - % verandering indicators
  - Trend pijlen (omhoog/omlaag)

- **InsightCard** (`src/components/InsightCard.tsx`)
  - Single stat cards met iconen
  - Animaties bij data update

#### Chart Features
- **Dark mode support:** Theme-aware kleuren
- **Animaties:** Smooth transitions (1000ms, cubicOut easing)
- **Interactief:** Tooltips, zoom, pan, draai (3D)
- **Responsive:** Auto-resize bij window resize
- **SVG renderer:** Voor betere performance

#### Analytics Tracking (Firebase Analytics)
**Service:** `src/services/analytics.ts`

Tracked events:
- `login` - User login method
- `melding_created` - Nieuwe melding (+ categorie)
- `project_created` - Nieuw project (+ status)
- `dossier_created` - Nieuw dossier (+ woningType)
- `user_invited` - Gebruiker uitgenodigd (+ rol)
- `uren_registered` - Uren geregistreerd (+ hours, project_linked)
- `document_uploaded` - Document upload (+ fileType, sizeKB)
- `search_performed` - Zoekactie (+ term, results)
- `filter_applied` - Filter toegepast (+ filterType)
- `export_completed` - Export (+ exportType: excel/pdf)
- `bulk_action` - Bulk actie (+ action, itemCount)
- `keyboard_shortcut_used` - Sneltoets gebruikt (+ shortcut)
- `command_palette_opened` - Command palette geopend
- `error_boundary_triggered` - Error boundary actief (+ componentStack)
- `performance_warning` - Slow render gedetecteerd (+ componentName, renderTime)

#### Analytics User Properties
- `user_role` - Gebruikersrol
- `theme_preference` - Light/dark mode
- `wijken_count` - Aantal wijken toegang

---

### 7. **Dashboard Module**

#### Functionaliteit
Centrale homepage met key metrics en recent activity.

#### Componenten
- **DashboardPage** (`src/pages/DashboardPage.tsx`)
  - **Key Performance Indicators:**
    - Totaal actieve meldingen
    - Lopende projecten
    - Gewerkte uren deze week
    - Open dossiers
  - **Recent Activity Feed:**
    - Laatste 10 meldingen
    - Laatste 5 projecten
    - Laatste urenregistraties
  - **Quick Actions:**
    - Nieuwe melding
    - Nieuw project
    - Uren registreren
    - Nieuw dossier
  - **Performance tracking:** usePerformanceTrace hook
  - **Responsive layout:** Mobile-friendly cards

#### Features
- **Real-time updates:** Via Firestore onSnapshot
- **Conditional rendering:** Gebaseerd op gebruikersrol
- **Navigation shortcuts:** Direct links naar detail pagina's

---

### 8. **Kaart Module**

#### Functionaliteit
Geografische weergave van meldingen, projecten en dossiers.

#### Componenten
- **MapPage** (`src/pages/MapPage.tsx`)
  - **Leaflet kaart** voor detail weergaven
  - **Layer controls:**
    - Meldingen layer (togglebaar)
    - Projecten layer (togglebaar)
    - Dossiers layer (togglebaar)
  - **Marker clusters:** Bij veel markers
  - **Popup details:** Click op marker voor info
  - **Custom icons:** Per type en status

- **HeatmapLayer** (`src/components/HeatmapLayer.tsx`)
  - Heatmap overlay voor concentraties
  - Intensity based op data volume

#### Maps Integraties
- **Leaflet:** Voor detail kaarten (dossiers, individuele weergaven)
- **Google Maps (@vis.gl/react-google-maps):** Voor statistieken kaart
- **PDOK Locatieserver API:** BAG data voor adres-coördinaten lookups

---

### 9. **Chat Module** (AI-powered)

#### Functionaliteit
AI-powered chat assistent voor vragen over wijkdata, statistieken en documentatie.

#### Componenten
- **ChatPage** (`src/pages/ChatPage.tsx`)
  - Chat interface met message bubbles
  - AI assistant powered by Google Gemini API
  - Context-aware responses over app data
  - Code snippets support (syntax highlighting)
  - Message history persistence

#### Features
- **Natural language queries:** "Hoeveel meldingen zijn er in Boswijk?"
- **Data analysis:** AI kan statistieken analyseren en inzichten geven
- **Help functie:** Uitleg over app features
- **Multi-turn conversation:** Context behouden over meerdere berichten

#### Technical
- **API:** Google Gemini API (via environment variable)
- **Service:** `src/services/aiInsights.ts`
- **Context injection:** App data meegegeven in prompts

---

## 🔧 Services & Integraties

### 1. **Firebase Services**

#### Firestore Database
**Locatie:** `src/firebase.ts`

Collections:
- `users` - Gebruikersprofielen
- `meldingen` - Alle meldingen
- `projecten` - Alle projecten
- `woningdossiers` - Alle dossiers
- `urenregistraties` - Time tracking
- `notificaties` - User notifications
- `externalContacts` - External contact persons
- `projectInvitations` - Project invite tokens
- `chat` - Chat messages (AI history)

Features:
- **Real-time listeners:** onSnapshot voor live updates
- **Batch operations:** voor bulk acties
- **Timestamp conversions:** Firestore Timestamp naar JS Date
- **Security rules:** firestore.rules (role-based access)

#### Firebase Storage
Media uploads:
- **Path structure:** `/{collection}/{docId}/{filename}`
- **Supported types:** Images (jpg, png, webp), PDF, Video (mp4)
- **Security:** User-based access via storage.rules
- **Metadata:** ContentType, customMetadata headers

#### Firebase Authentication
- Email/password auth
- Persistent sessions
- Password reset flows
- Custom claims (voor roles)

#### Firebase Functions
**Locatie:** `functions/src/`

Functions:
- `inviteUser` - Nieuwe gebruiker via email uitnodigen
- `sendWelcomeEmail` - Welkom email na signup
- `createDossier` - Server-side dossier creatie
- `seedAuth` - Development: seed users

#### Firebase Analytics
Track user behavior, conversions, engagement (zie Analytics tracking hierboven)

#### Firebase Performance Monitoring
**Service:** `src/services/performance.ts`

Features:
- **Automatic traces:** Page loads, network requests
- **Custom traces:** Component lifecycle tracking
- **Query monitoring:** Slow Firestore query detection (>1s threshold)
- **API call tracking:** External API performance
- **Development utilities:** Memory usage, navigation timing

Hooks:
- `usePerformanceTrace(name)` - Auto track component mount/unmount
- `useAsyncPerformance()` - Measure async operations
- `useSlowRenderDetection(name, threshold)` - Warn on slow renders
- `useRenderTracking(name, metadata)` - Dev render logging

#### Firebase Hosting
- Static site hosting
- Custom domain support
- SSL/TLS automatic
- CDN distribution
- Deploy command: `firebase deploy --only hosting`

---

### 2. **External APIs**

#### PDOK Locatieserver API
**Service:** Geïntegreerd in `AppContext.tsx`, `DossierPage.tsx`, `NieuweMeldingPage.tsx`

Features:
- **Adres suggestions:** Autocomplete Nederlandse adressen
- **BAG data:** Building and address data from Kadaster
- **Geo-coördinaten:** Automatische lat/lon voor adressen
- **Endpoints:**
  - `https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest` (autocomplete)
  - `https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup` (details)

#### Fixi Integration
**Component:** `src/components/FixiIntegration.tsx`, `src/components/FixiMeldingModal.tsx`

Features:
- **Melding doorsturen naar Fixi:** Voor externe afhandeling
- **Status sync:** Update melding naar "Fixi melding gemaakt"
- **Modal workflow:** User bevestiging voor Fixi submit
- **API endpoint:** (configureerbaar via environment)

#### Google Gemini AI API
**Service:** `src/services/aiInsights.ts`, `src/services/dailyUpdateAI.ts`

Features:
- **Chat assistant:** Beantwoord vragen over app data
- **Daily insights:** Geautomatiseerde daily summaries
- **Natural language processing:** Parse user queries
- **Context-aware:** Krijgt app state mee in prompts

#### Weather API
**Service:** `src/services/weatherService.ts`

Features:
- **Current weather:** Voor locatie
- **Forecast:** 5-day voorspelling
- **Integration in dashboard:** Weer widget (optioneel)

---

### 3. **Export Services**

#### Excel Export
**Service:** `src/services/excelExport.ts`

Gebruikt: `xlsx` library

Functionality:
- **Export meldingen:** Alle velden naar Excel sheet
- **Export uren:** Met totalen en formules
- **Custom formatting:** Headers, filters, autowidth columns
- **Multi-sheet:** Meerdere tabs in één workbook
- **Download trigger:** Automatische file download

#### PDF Export
**Service:** `src/services/pdfExport.ts`

Gebruikt: `jspdf`, `jspdf-autotable`

Functionality:
- **Meldingen rapport:** Geformatteerde PDF met logo
- **Uren rapport:** Time tracking overzicht
- **Charts to PDF:** (via canvas export van ECharts)
- **Custom styling:** Headers, footers, page numbers
- **Print-ready:** A4 formaat

---

### 4. **Utility Services**

#### Logger Service
**Service:** `src/services/logger.ts`

Log levels:
- `debug` - Development info
- `info` - Algemene info
- `warn` - Waarschuwingen
- `error` - Errors met stack traces

Features:
- **Structured logging:** Consistent log format
- **Context metadata:** Extra data per log
- **Console output:** Development mode
- **Firebase integration:** Optioneel naar Firestore (errors)
- **Performance tracking:** Log timings

Gebruik:
```typescript
import { logger } from '@/services/logger';

logger.info('User created', { userId, role });
logger.error('Failed to save', error, { context });
```

#### Validation Service
**Service:** `src/utils/validation.ts`

Gebruikt: Zod schema validation

Schemas:
- `MeldingSchema` - Valideer melding input
- `ProjectSchema` - Valideer project input
- `DossierSchema` - Valideer dossier input
- `UserSchema` - Valideer user input
- `UrenSchema` - Valideer uren input

Features:
- **Type-safe validation:** Zod types
- **Error messages:** Nederlandse foutmeldingen
- **Runtime checks:** Validate before Firestore write

#### Dossier Metadata Service
**Service:** `src/services/dossierMeta.ts`

Features:
- **Generate dossier summaries:** AI-powered samenvatting van dossier
- **Extract metadata:** Automatisch tags, keywords
- **Link related dossiers:** Suggesties voor gerelateerde adressen

---

## 🎨 Componenten Bibliotheek

### UI Components (`src/components/ui.tsx`)

#### Button
Props: `variant`, `size`, `disabled`, `onClick`, `children`
Variants: `primary`, `secondary`, `danger`, `ghost`

#### Input
Props: `type`, `placeholder`, `value`, `onChange`, `error`
Types: `text`, `email`, `password`, `number`, `date`, `file`

#### Select
Props: `options`, `value`, `onChange`, `placeholder`
Features: Custom dropdown met icons

#### Modal
Props: `isOpen`, `onClose`, `title`, `children`
Features: Backdrop, ESC to close, focus trap

#### Toast
System: Toast notifications via `react-hot-toast`
Types: `success`, `error`, `info`, `loading`

Gebruik:
```typescript
import { toast } from 'react-hot-toast';
toast.success('Melding aangemaakt');
toast.error('Er ging iets mis');
```

#### Badge
Props: `variant`, `children`
Variants: `success`, `warning`, `danger`, `info`

#### Card
Props: `title`, `subtitle`, `children`, `actions`
Features: Header, body, footer sections

#### Tabs
Props: `tabs`, `activeTab`, `onChange`
Features: Horizontal scrollable tabs

---

### Feature Components

#### AppShell (`src/components/AppShell.tsx`)
Main layout wrapper met:
- **Sidebar navigation:** Met icons en labels
- **Header:** Met logo, user menu, theme toggle
- **Mobile menu:** Hamburger menu op small screens
- **Active route highlighting:** Current page indicator
- **Keyboard shortcuts trigger:** Ctrl+K voor command palette

#### MediaGallery (`src/components/MediaGallery.tsx`)
Gallery component voor foto's/video's:
- **Grid layout:** Responsive columns
- **Fullscreen viewer:** Click to expand
- **Keyboard navigation:** ← → voor next/prev, ESC close
- **Media types:** Images (inline), PDF (iframe), Video (controls)
- **Thumbnails:** Lazy loaded
- **Upload drag & drop:** (optioneel)

#### Skeletons (`src/components/Skeletons.tsx`)
Loading placeholders:
- `CardSkeleton` - Card loading state
- `TableRowSkeleton` - Table row shimmer
- `StatCardSkeleton` - Stat card placeholder
- `ChartSkeleton` - Chart loading state
- `ListItemSkeleton` - List item shimmer
- `AvatarSkeleton` - Avatar circle
- `TextSkeleton` - Text lines
- `ImageSkeleton` - Image placeholder

Features:
- **Shimmer animation:** Smooth gradient pulse
- **Dark mode support:** Theme-aware colors
- **Flexible sizing:** Props voor width/height

#### ErrorBoundary (`src/components/ErrorBoundary.tsx`)
React Error Boundary (class component):
- **Catch render errors:** Component tree errors
- **Fallback UI:** ErrorFallback component
- **Error logging:** Logger service + Analytics
- **Reset mechanism:** "Probeer opnieuw" button
- **3-layer protection:** App, ProtectedRoute, LoginPage

#### ErrorFallback (`src/components/ErrorFallback.tsx`)
Fallback UI bij errors:
- Error message display
- Stack trace (development only)
- Reset button
- Contact support link

#### BulkActionsToolbar (`src/components/BulkActionsToolbar.tsx`)
Sticky toolbar voor bulk acties:
- **Selection count:** "X items geselecteerd"
- **Bulk actions:** Status wijzigen, exporteren, verwijderen
- **Clear selection:** "Alles deselecteren"
- **Confirmation modals:** Voor destructive actions
- **Keyboard support:** Delete key voor bulk delete

#### CommandPalette (`src/components/CommandPalette.tsx`)
Spotlight-achtige command launcher:
- **Keyboard trigger:** Ctrl+K / Cmd+K
- **Fuzzy search:** Zoek commands
- **Categorieën:** Navigate, Actions, Settings
- **Icons:** Per command
- **Recent commands:** History tracking
- **ESC to close:** Modal overlay

#### KeyboardShortcutsHelp (`src/components/KeyboardShortcutsHelp.tsx`)
Help modal met overzicht van shortcuts:
- **Categorieën:** General, Navigation, Actions
- **Visual display:** Key badges (Ctrl, Shift, etc.)
- **Searchable:** Filter shortcuts
- **Trigger:** `?` key of via menu

#### InviteUserModal (`src/components/InviteUserModal.tsx`)
Modal voor gebruiker uitnodigen:
- Email input + rol selectie
- Firebase Function call (inviteUser)
- Loading state tijdens API call
- Success/error toasts
- Form validation

#### MultiSelect (`src/components/MultiSelect.tsx`)
Dropdown met meerdere selecties:
- Checkbox list
- "Select all" optie
- Clear all button
- Badge display voor geselecteerde items
- Search/filter binnen dropdown

#### Icons (`src/components/Icons.tsx`)
SVG icon set:
- Lucide-react based
- Consistent sizing
- Theme colors
- Props: `size`, `color`, `className`

Icons: Home, Map, FileText, BarChart, Users, Settings, +50 meer

---

## 🪝 Hooks & Utilities

### Custom Hooks

#### useDebounce (`src/hooks/useDebounce.ts`)
Generic debounce hook:
```typescript
const debouncedValue = useDebounce<string>(searchTerm, 300);
```

#### useSearchDebounce (`src/hooks/useDebounce.ts`)
Specialized voor search:
```typescript
const { debouncedTerm, isSearching } = useSearchDebounce(searchTerm);
```
Returns: `{ debouncedTerm: string, isSearching: boolean }`

#### useKeyboardShortcuts (`src/hooks/useKeyboardShortcuts.ts`)
Global keyboard shortcuts:
```typescript
useKeyboardShortcuts({
  'ctrl+k': () => openCommandPalette(),
  'ctrl+n': () => createNewMelding(),
  'escape': () => closeModal(),
});
```

Features:
- Modifier keys support (ctrl, shift, alt, meta)
- Prevent defaults
- Conditional registration
- Cleanup on unmount

#### useBulkSelection (`src/hooks/useBulkSelection.ts`)
Manage multi-select state:
```typescript
const {
  selectedIds,
  isSelected,
  toggleSelection,
  toggleAll,
  clearSelection,
  selectedItems,
} = useBulkSelection<Melding>(meldingen);
```

Features:
- Generic typing
- Select/deselect items
- Select all / clear all
- Get selected items array
- Efficient Set-based storage

#### usePerformanceTrace (`src/hooks/usePerformanceTrace.ts`)
Performance monitoring hooks (zie Performance Module hierboven)

---

### Utilities (`src/utils/`)

#### dateHelpers.ts
Date formatting en parsing:
- `formatDate(date, format)` - Format naar NL locale
- `formatDistance(date)` - Relatieve tijd ("2 uur geleden")
- `startOfWeek(date)`, `endOfWeek(date)`
- `isSameDay(date1, date2)`
- `parseISO(string)`, `toISO(date)`

#### formatters.ts
Data formatting helpers:
- `formatBytes(bytes)` - "1.5 MB"
- `formatCurrency(amount)` - "€ 1.234,56"
- `formatPercentage(value)` - "75%"
- `formatDuration(minutes)` - "2u 30m"
- `truncate(text, length)` - Text ellipsis

#### statusColors.ts
Centralized color mapping voor statussen:
```typescript
export const statusColors = {
  'In behandeling': 'text-orange-600 bg-orange-100',
  'Afgerond': 'text-green-600 bg-green-100',
  'Fixi melding gemaakt': 'text-blue-600 bg-blue-100',
  // etc...
};
```

#### wijkMapping.ts
Wijk data en configuratie:
- Wijk kleuren
- Wijk coördinaten (center points)
- Wijk boundaries (polygons)

---

## 📊 Data Models

Volledige TypeScript interfaces in `src/types.ts` (325 lines).

### Core Entities

#### User
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole; // Beheerder | Concierge | Viewer
  avatarUrl: string;
  phone?: string;
}
```

#### Melding
```typescript
interface Melding {
  id: string;
  titel: string;
  omschrijving: string;
  status: MeldingStatus;
  attachments: string[];
  locatie?: Locatie;
  timestamp: Date;
  gebruikerId: string;
  wijk: string;
  categorie: string;
  updates: MeldingUpdate[];
  afgerondTimestamp?: Date;
}
```

#### Project
```typescript
interface Project {
  id: string;
  titel: string;
  omschrijving: string;
  status: ProjectStatus;
  startDatum?: Date;
  eindDatum?: Date;
  locatie?: Locatie;
  documenten: string[];
  deelnemers: string[];
  voortgang: number; // 0-100
  budget?: number;
  wijk?: string;
  contributions: ProjectContribution[];
}
```

#### WoningDossier
```typescript
interface WoningDossier {
  id: string;
  adres: string;
  gebruikerId: string;
  location?: { lat: number; lon: number } | null;
  woningType?: string | null;
  notities: DossierNotitie[];
  documenten: DossierDocument[];
  afspraken: DossierAfspraak[];
  bewoners: DossierBewoner[];
  historie: DossierHistorieItem[];
  status: DossierStatus;
  labels: DossierLabel[];
  updates: any[];
}
```

#### Urenregistratie
```typescript
interface Urenregistratie {
  id: string;
  gebruikerId: string;
  start: Date;
  eind: Date;
  activiteit: 'Project' | 'Wijkronde' | 'Intern overleg' | 'Extern overleg' | 'Persoonlijke ontwikkeling' | 'Overig';
  projectId?: string;
  projectName?: string;
  wijk?: string;
  overlegPartner?: string;
  omschrijving?: string;
}
```

### Extended Types

Zie `src/types.ts` voor alle types:
- `Locatie`, `MeldingUpdate`, `ProjectContribution`, `ProjectInvitation`
- `DossierNotitie`, `DossierDocument`, `DossierBewoner`, `DossierAfspraak`, `DossierHistorieItem`, `DossierReactie`
- `Notificatie`, `Taak`, `ExternalContact`
- `AppContextType` (Context interface met 50+ functies)

---

## 🔥 Backend (Firebase Functions)

**Locatie:** `functions/src/`

### 1. inviteUser Function
**File:** `functions/src/inviteUser.ts`

Functionaliteit:
- Create Firebase Auth user met email/password
- Set tijdelijk wachtwoord: `Welkom01`
- Create Firestore user document met rol
- Set custom claim voor role-based access
- Optioneel: send welcome email
- Return: { success, userId, message }

Trigger: HTTP callable function

### 2. sendWelcomeEmail Function
**File:** `functions/src/sendWelcomeEmail.ts`

Functionaliteit:
- Send email via SendGrid/Mailgun
- Template met gebruikersnaam en tijdelijk wachtwoord
- Link naar app login page
- Tracking van verzonden emails

Trigger: HTTP callable function of Firestore onCreate user

### 3. createDossier Function
**File:** `functions/src/createDossier.ts`

Functionaliteit:
- Server-side dossier aanmaken
- PDOK API call voor adres validatie
- Generate unique ID (adres-based)
- Set initial status en timestamps
- Return: { success, dossierId }

Trigger: HTTP callable function

### 4. seedAuth Function (Development Only)
**File:** `functions/src/seedAuth.ts`

Functionaliteit:
- Seed test users voor development
- Create users met bekende credentials
- Voor gebruik met Firebase Emulators

Trigger: HTTP request (restricted)

### Deployment
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:inviteUser
```

### Environment Config
**File:** `functions/.env`
- SENDGRID_API_KEY
- FRONTEND_URL
- ADMIN_EMAIL

---

## 🛠️ Development Tools

### 1. Bundle Analyzer
**Script:** `scripts/analyze-bundle.mjs`

Command: `npm run build:analyze`

Features:
- Parse dist/ folder na build
- Size breakdown per asset type (JS, CSS)
- Top 10 grootste chunks
- Size comparisons met vorige build
- Warnings bij chunks >500 KB of size increase >10%
- Save stats naar `.bundle-stats.json`

Output:
```
📦 Bundle Analysis Report

Total Size: 4.9 MB
- JavaScript: 4.79 MB (97.7%)
- Stylesheets: 111 KB
- Other: 5 KB

⚠️  Large Chunks (>500KB):
  - index-Bne7odr9.js: 1.09 MB
  - linesGL-Do3gpQD_.js: 610 KB

📈 Size Comparison:
  Total: +2.3% vs previous build
```

### 2. Firebase Emulators
**Config:** `firebase.json`

Command: `firebase emulators:start`

Emulators:
- **Firestore:** localhost:8081
- **Auth:** localhost:9099
- **Storage:** localhost:9199
- **Functions:** localhost:5001
- **UI:** localhost:4000 (emulator dashboard)

Features:
- Seed data scripts
- Import/export data
- Reset data tussen runs
- Inspect real-time data

### 3. ESLint + TypeScript
**Config:** `eslint.config.cjs`, `tsconfig.json`

Command: `npm run lint`

Rules:
- TypeScript strict mode
- React hooks rules
- Import order
- Unused vars detection
- Console log warnings (use logger instead)

### 4. Vite Dev Server
Command: `npm run dev`

Features:
- Hot Module Replacement (HMR)
- Fast startup (~1s)
- TypeScript checking
- Tailwind compilation
- Source maps

### 5. Git Hooks (Husky - optioneel)
Pre-commit:
- Run linter
- Type check
- Format with Prettier

Pre-push:
- Run build
- Run tests (indien aanwezig)

---

## 📱 PWA Features

### Service Worker
**File:** `public/sw.js`, `sw.js` (root)

Features:
- **Offline support:** Cache pages en assets
- **Install prompt:** "Add to Home Screen"
- **Background sync:** Sync data when back online
- **Push notifications:** (geïmplementeerd, optioneel actief)
- **Update notifications:** Prompt bij nieuwe versie

### Manifest
**File:** `manifest.json`

Config:
- App name, short name, description
- Icons (192x192, 512x512)
- Theme colors (dark/light)
- Display mode: standalone
- Start URL: `/#/dashboard`
- Orientation: portrait

### Icons
**Location:** `public/icons/`

Sizes:
- `icon-72x72.png` tot `icon-512x512.png`
- `apple-touch-icon.png` (180x180)
- `favicon.ico`

Generate command: `npm run generate-icons` (via `scripts/generate-icons.mjs`)

---

## 🚀 Deployment

### Build Process
```bash
# Install dependencies
npm install

# Run type check
tsc --noEmit

# Build voor productie
npm run build

# Analyze bundle
npm run build:analyze
```

Output: `dist/` folder (4.9 MB, 40 files)

### Firebase Hosting Deploy
```bash
# Deploy hosting + functions
firebase deploy

# Hosting only
firebase deploy --only hosting

# With specific project
firebase deploy --project buurtapp-v3-4
```

Live URL: https://buurtapp-v3-4.web.app

### Environment Variables
**File:** `.env.local` (niet in git)

Variabelen:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_API_KEY=...
VITE_GOOGLE_MAPS_API_KEY=...
```

**Belangrijk:** Prefix met `VITE_` voor client-side access!

---

## 📈 Performance Metrics

### Current Stats (v0.3.5)
- **Bundle size:** 4.9 MB total
  - JavaScript: 4.79 MB
  - CSS: 111 KB
- **Build time:** ~10.5 seconds
- **Dev startup:** ~1.2 seconds
- **First Contentful Paint:** ~1.8s
- **Time to Interactive:** ~3.2s

### Largest Dependencies
1. **ECharts** (~1.1 MB) - Chart library
2. **Firebase** (~950 KB) - Backend SDK
3. **React + Router** (~200 KB)
4. **Leaflet + Google Maps** (~180 KB)
5. **PDF/Excel libs** (~700 KB, lazy loaded)

### Optimalisatie Opportunities
Zie `IMPROVEMENT_ROADMAP.md` voor details:
- ECharts tree-shaking: ~200 KB besparing
- Lodash optimalisatie: ~50 KB
- Image optimization: variable
- Route-based code splitting: ~800 KB uit initial bundle

---

## 🔐 Security

### Firebase Security Rules
**Files:** `firestore.rules`, `storage.rules`

Features:
- **Role-based access:** Admins, Conciërges, Viewers
- **User data isolation:** Users can only edit their own data
- **Dossier permissions:** Based on creator ID
- **Storage access:** File uploads restricted to authenticated users

### Authentication
- Email/password only (extensible naar Google OAuth)
- Password complexity: min 8 chars (Firebase default)
- Brute-force protection: Firebase rate limiting
- Session management: Persistent tokens

### Data Privacy
- No PII in logs
- GDPR-compliant data storage (Firebase EU region optioneel)
- User data export mogelijkheid (via AdminPage)
- Right to be forgotten: delete account + cascade deletes

---

## 🧪 Testing Strategy

### Current Status
- **Unit tests:** Niet geïmplementeerd (Roadmap Phase 3)
- **E2E tests:** Niet geïmplementeerd (Roadmap Phase 3)
- **Manual testing:** Actief via dev environment

### Planned (Phase 3)
- **Vitest + React Testing Library:** Unit tests voor components
- **Playwright:** E2E flows (login, create melding, etc.)
- **Coverage target:** 80%+
- **CI/CD:** GitHub Actions voor automated testing

---

## 📚 Documentatie Files

In repository root:
- **README.md** - Algemene info, setup instructies
- **README_agent.md** - Agent-specifieke documentatie
- **CHANGELOG.md** - Versie geschiedenis (v0.1.0 - v0.3.5)
- **IMPROVEMENT_ROADMAP.md** - Roadmap Phase 1-3
- **MANAGEMENT_SUMMARY.md** - Management overzicht
- **SECURITY.md** - Security best practices
- **TYPESCRIPT_CLEANUP_PLAN.md** - TypeScript refactor plan
- **BEHEERPAGINA_FUNCTIES.md** - Admin page features
- **FIREBASE_EMAIL_SETUP.md** - Email setup guide
- **GOOGLE_MAPS_API_SETUP.md** - Maps API setup
- **GEMINI_API_KEY_RENEW.md** - AI API key renewal
- **GEMEENTE_EMAIL_CONCEPT.md** - Email templates voor gemeente
- **.github/copilot-instructions.md** - GitHub Copilot instructies
- **Webbie--BuurtApp-Updates-16-02-2026.md** - Dagelijkse updates log
- **Webbie--Buurtapp-Overzicht-Modules-16-02-2026.md** - Dit document

---

## 🎯 Roadmap Status

### ✅ Phase 1 - Completed (v0.1.0 - v0.2.1)
- Quick wins (caching, lazy loading)
- Logger service implementatie
- Skeleton loaders
- Console.log cleanup
- Statistieken verbeteringen
- Code cleanup

### ✅ Phase 2 - Completed (v0.3.0 - v0.3.5)
- Zod validation
- Firebase Analytics integratie
- Error Boundaries (3-layer protection)
- Debounced Search
- Keyboard Shortcuts + Command Palette
- Bulk Actions (multi-select, toolbar)
- Performance Monitoring (Firebase Performance SDK, custom traces, bundle analyzer)

### 🔜 Phase 3 - Planned (Next)
**Testing & Quality:**
- Unit tests (Vitest + React Testing Library)
- E2E tests (Playwright)
- Test coverage 80%+
- CI/CD pipeline (GitHub Actions)

**Performance:**
- ECharts tree-shaking
- Lodash optimisation
- PDF/Excel lazy loading
- Image optimization

**PWA Features:**
- Offline mode verbetering
- Push notifications activatie
- Service worker updates
- Touch gestures

**Security:**
- HTTPS enforcement
- Rate limiting
- Input sanitization audit
- Penetration testing

---

## 📞 Support & Contact

### Development Team
Ontwikkeld door: Webbie (Kevin)
Contact: Via GitHub repository

### Resources
- **Firebase Console:** https://console.firebase.google.com
- **Live App:** https://buurtapp-v3-4.web.app
- **Repository:** (private repo URL)

### Troubleshooting
Zie README.md voor:
- Setup instructies
- Common issues & fixes
- Firebase emulator troubleshooting
- Build errors

---

## 🏁 Conclusie

De Buurtconciërge App is een volwaardige, productie-ready Progressive Web App met complete functionaliteit voor wijkbeheer. De app combineert moderne frontend technologie (React, TypeScript, Tailwind) met krachtige backend services (Firebase) en externe integraties (PDOK, Google Maps, AI).

Met 21+ pagina's, 22+ componenten, 11+ services, 4+ custom hooks, en uitgebreide analytics en performance monitoring is dit een enterprise-grade applicatie geschikt voor professioneel gebruik door wijkconciërges en beheerders.

**Huidige versie:** v0.3.5
**Phase 2:** ✅ Completed
**Next:** Phase 3 - Testing & Optimization

---

**Laatste update:** 16 februari 2026
