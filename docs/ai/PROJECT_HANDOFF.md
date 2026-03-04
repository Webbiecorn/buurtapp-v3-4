# Buurtconciërge App — Project Handoff

> Architectuur, beslissingen en overleglog voor ontwikkelaars/AI die het werk overnemen.
> **Aangemaakt**: 2 maart 2026 | **Bijgehouden door**: GitHub Copilot + Kevin (Webbiecorn)

---

## Architectuuroverzicht

```
buurtapp-v3-4/
├── src/
│   ├── App.tsx                    ← Entry point, routing, ProtectedRoute
│   ├── firebase.ts                ← Firebase init (singleton), emulator support
│   ├── types.ts                   ← Alle TypeScript interfaces + enums
│   ├── index.css                  ← Tailwind base + custom CSS
│   ├── context/
│   │   └── AppContext.tsx         ← CENTRALE STATE: alle data + Firebase ops
│   ├── pages/                     ← Route-componenten (lazy loaded)
│   │   ├── DashboardPage.tsx
│   │   ├── IssuesPage.tsx
│   │   ├── DossierPage.tsx
│   │   ├── DossierDetailPage.tsx
│   │   ├── ProjectsPage.tsx
│   │   ├── AchterpadenPage.tsx    ← Subpagina's in AchterpadenBeheer.tsx etc.
│   │   ├── UrenregistratiePage.tsx
│   │   ├── StatisticsPage.tsx
│   │   ├── AdminPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── UpdatesPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── ExtraPages.tsx         ← ReportsPage, ContactenPage, NotificationsPage
│   ├── components/
│   │   ├── ui.tsx                 ← Gedeelde UI: Button, Modal, Badge, etc.
│   │   ├── AppShell.tsx           ← Layout wrapper met navigatie
│   │   ├── ErrorBoundary.tsx      ← Foutafhandeling
│   │   ├── CommandPalette.tsx     ← Ctrl+K command palette
│   │   ├── Skeletons.tsx          ← Loading skeleton componenten
│   │   └── [feature componenten]
│   ├── services/
│   │   ├── analytics.ts           ← Firebase Analytics helpers
│   │   ├── performance.ts         ← Firebase Performance Monitoring
│   │   ├── aiInsights.ts          ← Gemini AI integratie
│   │   ├── dailyUpdateAI.ts       ← Dagelijkse AI updates
│   │   ├── dossierMeta.ts         ← PDOK BAG metadata ophalen
│   │   ├── emailService.ts        ← E-mail via Firebase Functions
│   │   ├── firestoreHooks.ts      ← Firestore real-time hooks
│   │   ├── logger.ts              ← Logging service (vervangt console.log)
│   │   ├── pdfExport.ts           ← jsPDF export
│   │   ├── excelExport.ts         ← XLSX export
│   │   └── weatherService.ts      ← Weer-informatie service
│   ├── hooks/
│   │   ├── useDebounce.ts         ← useDebounce + useSearchDebounce
│   │   ├── useKeyboardShortcuts.ts← Keyboard shortcut bindings
│   │   ├── useBulkSelection.ts    ← Meervoudige selectie in lijsten
│   │   └── usePerformanceTrace.ts ← Performance monitoring hooks
│   └── utils/
│       ├── dateHelpers.ts
│       ├── formatters.ts
│       ├── statusColors.ts
│       ├── validation.ts
│       └── wijkMapping.ts
├── functions/src/                 ← Firebase Cloud Functions
│   ├── index.ts                   ← Alle functie-exports
│   ├── createDossier.ts           ← Dossier aanmaken via server
│   ├── inviteUser.ts              ← Gebruiker uitnodigen
│   ├── sendWelcomeEmail.ts        ← Welkomstmail sturen
│   ├── seedAuth.ts                ← Dev seed voor Auth-gebruikers
│   └── firebase-admin-init.ts
├── webbie-docs/01-BuurtApp/modules/   ← Module-prompts (10 stuks)
├── .ai/project-context.md             ← Originele AI-context (legacy)
├── firestore.rules                    ← Firestore security rules
├── storage.rules                      ← Storage security rules
└── .github/copilot-instructions.md   ← Copilot projectinstructies
```

### Datavloei
```
Gebruiker → React Component → useAppContext() → AppContext → Firestore/Storage
                                                           → Firebase Functions
                                                           → PDOK / Google Maps / Gemini
```

---

## Technische beslissingen (met reden)

### React Router v6 + HashRouter (ipv View-enum)
- **Beslissing**: React Router v6 met `HashRouter`
- **Reden**: App is gegroeid tot 15+ routes — View-enum werd onhoudbaar
- **Voordeel**: Deep-linking, back/forward, browser history werkt correct
- **HashRouter**: Firebase Hosting heeft geen URL rewriting nodig voor `/#/route`

### AppContext als enkel state-punt
- **Beslissing**: Eén groot `AppContext` in plaats van meerdere contexts
- **Reden**: App heeft beperkte complexiteit — aparte contexts voegen overhead toe
- **Trade-off**: AppContext.tsx wordt groot (~1000+ regels) — bewust geaccepteerd
- **Wanneer herzien**: Als context re-renders merkbaar zijn op performance

### ECharts ipv Recharts als primaire chartbibliotheek
- **Beslissing**: Apache ECharts via `echarts-for-react`
- **Reden**: Betere animaties, gradiënten, dark mode, groter feature-aanbod
- **Note**: `recharts` staat nog als dependency maar wordt niet meer primair gebruikt — kan verwijderd worden

### Gemini AI ipv OpenAI
- **Beslissing**: Google Gemini via `@google/generative-ai`
- **Reden**: Gratis tier, integreert goed met Firebase/Google ecosysteem
- **Gebruik**: AI-samenvattingen van meldingen, dagelijkse updates, insights

### Firebase Functions regio
- **Huidige config**: `us-central1`
- **Let op**: Gezien de EU-doelgroep zou `europe-west1` beter zijn voor latency en AVG-compliance
- **Status**: Nog niet aangepast — Kevin moet beslissen

### Module-restrictie systeem
- **Beslissing**: `allowedModules: string[]` op User object
- **Reden**: Klant wil bijv. wijkconciërges die alleen Achterpaden zien
- **Backwards compatible**: `undefined` of `[]` = volledige toegang

---

## Module-beschrijvingen

### Dashboard (`/`)
Overzicht van statistieken, recente meldingen en projecten. AI-gegenereerde insights via Gemini.

### Meldingen (`/issues`)
CRUD voor wijk-meldingen. Statussen: `In behandeling`, `Fixi melding gemaakt`, `Afgerond`. Koppeling met Fixi-systeem mogelijk (zie `FixiIntegration.tsx`, `FixiMeldingModal.tsx`).

### Projecten (`/projects`)
Langlopende activiteiten met bijdragen van meerdere leden. Project-uitnodigingen systeem met accept/decline flow.

### Dossiers (`/dossiers`, `/dossier/:adres`)
Woningdossiers per BAG-adres. Bevat: bewoners, notities, afspraken, documenten, locatie (Leaflet kaart). Adressuggesties via PDOK Locatieserver.

### Urenregistratie (`/time-tracking`)
Urenstaten voor conciërges. Activiteitstypen: Project, Wijkronde, Intern/extern overleg, Persoonlijke ontwikkeling, Overig. Draft-state opgeslagen in localStorage.

### Statistieken (`/statistics`)
Data-visualisaties met ECharts. Kaart met Google Maps + heatmaps. Filters (categorieën, statussen, wijken) opgeslagen in localStorage.

### Achterpaden (`/achterpaden`)
Aparte module voor registratie en beheer van achterpaden in de wijken. Eigen subpagina's: overzicht, kaartoverzicht, registratie, statistieken, beheer.

**Recente wijzigingen (3 maart 2026):**
- Foto is niet meer verplicht bij registratie. Gele waarschuwing getoond als geen foto.
- Firestore: `fotoOntbreekt: true` veld opgeslagen bij registratie zonder foto.
- Notificaties naar medewerker + alle beheerders als foto ontbreekt.
- `AchterpadenBeheer.tsx`: oranje 📸 Toevoegen knop + upload modal; na upload verdwijnt badge.
- **Bugfix**: `e.target.value = ''` na bestandsselectie (onChange reset) + functionele state-update.
- ⚠️ Nog niet volledig getest door Kevin.

### Admin (`/admin`)
Gebruikersbeheer (aanmaken/bewerken/verwijderen), rolbeheer, module-restrictie instellen.

### Rapportages (`/reports`)
PDF/Excel export van meldingen en statistieken.

### Contacten (`/contacten`)
Externe contactpersonen per organisatie (Gemeente, Centrada, Politie, BOA, Welzijn Lelystad, etc.).

### Chat (`/chat/:id`)
Interne berichtenfunctie met file bijlagen. Gebaseerd op Firestore real-time listeners.

### Updates (`/updates`)
Systeem voor dagelijkse AI-gegenereerde wijkupdates.

---

## Datamodel

Zie ook: `src/types.ts` voor volledige TypeScript interfaces.

### WoningDossier
```typescript
{
  id: string;              // = adres (BAG)
  adres: string;
  gebruikerId: string;
  location?: { lat, lon };
  woningType?: string;
  notities: DossierNotitie[];
  documenten: DossierDocument[];
  afspraken: DossierAfspraak[];
  bewoners: DossierBewoner[];
  historie: DossierHistorieItem[];
  status: 'actief' | 'afgesloten' | 'in onderzoek' | 'afspraak';
  labels: ('woning' | 'bedrijf' | 'overig')[];
}
```

### Melding
```typescript
{
  id: string;
  titel, omschrijving, wijk, categorie: string;
  status: 'In behandeling' | 'Fixi melding gemaakt' | 'Afgerond';
  locatie?: { lat, lon, adres };
  attachments: string[];      // Storage URLs
  updates: MeldingUpdate[];
  timestamp, afgerondTimestamp: Date;
}
```

### User
```typescript
{
  id: string;
  name, email: string;
  role: 'Beheerder' | 'Concierge' | 'Viewer';
  allowedModules?: string[];  // undefined = volledige toegang
  avatarUrl: string;
  phone?: string;
}
```

### Urenregistratie
```typescript
{
  activiteit: 'Project' | 'Wijkronde' | 'Intern overleg' | 'Extern overleg' | 'Persoonlijke ontwikkeling' | 'Overig';
  wijk?: 'Atol' | 'Boswijk' | 'Jol' | 'Waterwijk' | 'Zuiderzeewijk';
  start, eind: Date;
  projectId?, overlegPartner?, omschrijving?: string;
}
```

### AchterpadenRegistratie (nieuw veld, 3 maart 2026)
```typescript
{
  // ...bestaande velden (straat, wijk, foto-URL, locatie, etc.)...
  fotoOntbreekt?: true;  // aanwezig als registratie is opgeslagen zonder foto
                         // AchterpadenBeheer toont oranje badge; veld verwijderd na upload
}
```

---

## Externe koppelingen / APIs

| API                | Doel                                           | Configuratie               |
| ------------------ | ---------------------------------------------- | -------------------------- |
| PDOK Locatieserver | BAG adres-suggesties + geo-metadata            | Geen key (open API)        |
| Google Maps        | Heatmaps + statistieken kaart                  | `VITE_GOOGLE_MAPS_API_KEY` |
| Google Gemini AI   | AI samenvattingen + dagelijkse updates         | `VITE_GEMINI_API_KEY`      |
| Firebase           | Auth, Firestore, Storage, Functions, Analytics | `VITE_FIREBASE_API_KEY`    |
| Leaflet/OSM        | Kaart in dossier-detail                        | Geen key                   |
| Fixi               | Externe meldingenintegratie (optioneel)        | Zie `FixiIntegration.tsx`  |

---

## Bekende beperkingen

1. **Geen echte offline support** — Service Worker aanwezig maar app werkt niet zonder internetverbinding
2. **AppContext te groot** — Kan splitsen overwegen als performance problemen optreden
3. **ECharts niet tree-shaken** — Full bundle import, ~200KB besparing mogelijk
4. **Lodash niet geoptimaliseerd** — Gebruik `lodash-es` of direct imports voor ~50KB besparing
5. **Firebase Functions in `us-central1`** — Niet ideaal voor EU (AVG + latency)
6. **`recharts` ongebruikt** — Dependency kan verwijderd worden
7. **Geen brandColors.ts** — Kleuren hardcoded als Tailwind classes, moeilijk te theamen
8. **`capture="environment"` werkt niet op desktop** — Browser-standaard: desktop browsers negeren dit attribuut altijd. Op mobiel werkt het correct via `<label htmlFor>` direct gekoppeld aan het input-element.

---

## Overleglog

### 16 februari 2026
- Performance monitoring toegevoegd (Firebase Performance)
- useDebounce hook aangemaakt + bugs gefixed in UrenregistratiePage en AchterpadenKaartOverzicht
- Complete webbie-docs documentatiesysteem opgebouwd (18 bestanden)

### 17 februari 2026
- Dashboard meldingsactiviteit chart: 3D chart vervangen door 2D vertical bar chart
- useSearchDebounce import bug gefixed → productie-crash opgelost
- Deployment geverifieerd: 49 bestanden geüpload naar Firebase Hosting

### 18 september 2025
- Mobiele optimalisatie AdminPage
- Project management dashboard met real-time statistieken
- ProjectParticipantsModal toegevoegd
- Dark mode contrast verbeterd

### 4 maart 2026
- **Bugfix camera AchterpadenRegistratie stap 4**: `<button onClick={…}>` vervangen door `<label htmlFor>` direct gekoppeld aan `<input capture="environment">`. JS `.click()` werd door mobiele browsers als indirecte interactie beschouwd waardoor `capture` werd genegeerd. Label-aanpak is de enige browser-betrouwbare methode.
- Hover-effect "Foto maken" knop verbeterd: `hover:bg-blue-900` i.p.v. nauwelijks-zichtbare `hover:bg-brand-primary/90`.
- `openCamera` / `openGallery` functies en `cameraInputRef` / `galleryInputRef` refs verwijderd (niet meer nodig).
- Deploy: Firebase Hosting → https://buurtapp-v3-4.web.app

### 2 maart 2026
- SSOT-audit uitgevoerd door GitHub Copilot
- AI_CONTEXT.md aangemaakt in `~/Webbiecorn-bedrijf/WEBBIECORN-SSOT/buurtapp-v3-4/`
- `copilot-instructions.md` bijgewerkt (SSOT refs + correcte emulator-poorten)
- `docs/ai/PROJECT_HANDOFF.md` aangemaakt
- Module-prompts geconsolideerd naar SSOT
- `.gitignore` gecontroleerd — secrets.env correct geconfigureerd

---

*Bijgehouden door: Kevin (Webbiecorn) + GitHub Copilot | Laatst bijgewerkt: 4 maart 2026*
