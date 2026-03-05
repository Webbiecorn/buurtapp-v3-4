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

### Firebase Storage structuur
```
/dossiers/{adres}/{filename}    ← documenten, afbeeldingen, video's per dossier
/meldingen/{id}/{filename}      ← bijlagen bij meldingen
/projecten/{id}/{filename}      ← media bij projectbijdragen
/achterpaden/{id}/{filename}    ← foto's bij achterpad-registraties
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

## Services & Utilities

### Logger (`src/services/logger.ts`)
Centrale logging service — vervangt `console.log`. Levels: `info`, `warn`, `error`, `debug`.
```typescript
logger.info('Dossier geladen', { adres });
logger.error('Upload mislukt', error, { userId, action: 'uploadDossierDocument' });
logger.time('fetch-dossiers'); // ... logger.timeEnd('fetch-dossiers');
```
Console uitgeschakeld in productie. Errors worden ook naar Firebase Analytics gestuurd.

### Analytics (`src/services/analytics.ts`)
Firebase Analytics tracking. **Alleen actief in productie** (niet in emulators/dev).
Functies: `trackLogin`, `trackMeldingCreated`, `trackDossierCreated`, `trackUserInvited`, `trackDocumentUploaded`, `trackExport`, `trackSearch`, `trackError`.
Privacy: gebruik alleen Firebase UID, **geen** emails/namen in events.

### Zod Validatie (`src/utils/validation.ts`)
Runtime input validatie voor alle formulieren en API-calls. Error messages in Nederlands.
```typescript
const result = validate(schema, data);
if (!result.success) return toast.error(result.errors.join(', '));
// Of voor server-side:
const data = validateOrThrow(schema, input);
```
Schemas voor: user invite, melding aanmaken, project, dossier, urenregistratie.

### Error Boundaries (`src/components/ErrorBoundary.tsx`)
3-laagse bescherming voorkomt white screen of death:
1. Top-level rond hele App
2. ProtectedRoute-level voor alle auth-pagina's
3. Expliciete boundary rond LoginPage

Dev: toont error details + component stack. Productie: gebruiksvriendelijke fallback met herstel-opties.

### Keyboard Shortcuts (`src/hooks/useKeyboardShortcuts.ts`)
- `Ctrl/Cmd+K` — Command Palette (fuzzy search, rol-gefilterd)
- `?` — Help modal met shortcuts overzicht
- `H / M / P / D / U / S / A` — Navigatie naar pagina's (werkt niet in invoervelden)

### Debounced Search (`src/hooks/useDebounce.ts`)
```typescript
const { debouncedTerm, isSearching, hasMinLength } = useSearchDebounce(searchTerm);
// 300ms delay, minimaal 3 karakters
```
Geïntegreerd in: AdminPage, AchterpadenKaartOverzicht, UrenregistratiePage.

### Skeleton Loaders (`src/components/Skeletons.tsx`)
Types: `PageSkeleton`, `TableSkeleton`, `ChartSkeleton`, `CardSkeleton`, `ListSkeleton`, `FormSkeleton`, `StatsSkeleton`.
Gebruik als Suspense fallback: `<Suspense fallback={<PageSkeleton />}>`.

---

## Checklist bij nieuwe features

Bij elke nieuwe feature verplicht:
- ✅ Zod validatie voor alle user input
- ✅ Analytics tracking voor belangrijke events
- ✅ `logger` i.p.v. `console.log/error`
- ✅ Toast notifications bij succes/fout
- ✅ Skeleton loaders voor loading states
- ✅ Keyboard support (ESC, pijlen) waar relevant
- ✅ Dark mode support met theme-aware kleuren
- ✅ Accessibility (`aria-labels`, keyboard navigatie)
- ✅ Nederlandse teksten in de UI
- ✅ Rolrechten gecontroleerd in UI én functies

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

## Common Gotchas

1. **HashRouter**: Gebruik `/#/path` — links en `useNavigate` werken correct out-of-the-box
2. **Firestore Timestamps**: Converteer naar JavaScript `Date` voor weergave (`timestamp.toDate()`)
3. **Context Updates**: Correcte dependency arrays in `useEffect`, anders stale data
4. **File Uploads**: Valideer type en grootte client-side vóór upload
5. **Map Cleanup**: Destroy Leaflet map instanties bij component unmount
6. **AppContext Firestore writes**: Strip `undefined` values; gebruik `updateDoc` + `arrayUnion` niet `setDoc` voor updates
7. **Viewer Overlay**: Aanwezig in `DossierPage`, `DossierDetailPage`, `IssuesPage`, `ProjectsPage` — hergebruik `getType`/`renderInline` helpers
8. **Tijdelijk wachtwoord**: Nieuwe gebruikers krijgen standaard `Welkom01` — verplichte wijziging bij eerste login
9. **Emulatorpoorten (huidig)**: Firestore **8083**, Storage **9201**, Auth **9100**, Functions **5101** — afwijkend van Firebase defaults
10. **Zod + Firestore**: `validateOrThrow` voor server-side (Functions), `validate` voor client-side (dan toast de errors)

---

## Versie-overzicht

| Versie | Datum       | Highlights                                                                         |
| ------ | ----------- | ---------------------------------------------------------------------------------- |
| v0.4.1 | 5 mrt 2026  | lastSeen, sessionCount, organisatie, modulePermissions Viewer, Gmail e-mail actief |
| v0.4.0 | 4 mrt 2026  | Uitnodigingssysteem (invites, checkExpiredInvites, sendInviteReminder)             |
| v0.3.5 | 16 feb 2026 | Firebase Performance Monitoring, bundle analyse                                    |
| v0.3.4 | 16 feb 2026 | Bulk Actions (multi-select) in Meldingen                                           |
| v0.3.3 | 16 feb 2026 | Keyboard Shortcuts + Command Palette                                               |
| v0.3.2 | 16 feb 2026 | Debounced Search met loading indicators                                            |
| v0.3.1 | 16 feb 2026 | React Error Boundaries                                                             |
| v0.3.0 | 16 feb 2026 | Zod validatie, Firebase Analytics, monitoring                                      |
| v0.2.1 | 16 feb 2026 | Logger service, skeleton loaders, cleanup                                          |
| v0.2.0 | 16 feb 2026 | Statistics charts fixes, 2D heatmap improvements                                   |
| v0.1.0 | 10 aug 2025 | Chat, admin tabs, statistieken pagina                                              |

---

## Agent-instructies

### Stijl & aanpak
- Taal: Nederlands, kort en feitelijk
- Begin met een mini-plan (1 zin of 2–3 bullets), voer direct uit, sluit af met korte status
- Lees relevante bestanden voordat je wijzigt; stel max 1–2 verduidelijkingsvragen als essentieel
- Kleine, gerichte patches — geen grote refactors zonder expliciete opdracht

### Do's
- Gebruik `logger` i.p.v. `console.log/error`
- Voeg `toast.success/error` toe bij user-facing acties
- Controleer altijd rolrechten in UI én functies
- Voeg `aria-labels` en keyboard support (`ESC`, `←→`) toe
- Gebruik Zod validatie voor alle user input
- Test met `npm run build` na substantiële wijzigingen

### Don'ts
- Geen secrets committen; gebruik `.env.local` + `import.meta.env`
- Geen directe Firestore calls buiten `services/` en `context/`
- Geen inline styles (gebruik Tailwind)
- Geen `any` types tenzij absoluut noodzakelijk

### Antwoordformat
1. **Plan** — 1–3 bullets wat je gaat doen
2. **Acties** — compacte beschrijving van wijzigingen (bestanden + kern)
3. **Validatie** — build/typecheck status in 1–2 regels
4. **Notities** — randzaken of vervolgstappen

### Na elke sessie verplicht
```bash
git add -A
git commit -m "[type]: [beschrijving]"
git push
./scripts/sync-ssot.sh
```

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
- **Uitnodigingssysteem uitgebreid**:
  - `invites` collection in Firestore (status: pending/reminded/accepted/expired, expiresAt: 7 dagen)
  - `sendInviteReminder` Cloud Function (callable): markeert invite als reminded, client stuurt verse reset-link
  - `checkExpiredInvites` Cloud Function (scheduled dagelijks 08:00): herinnering na dag 3, verlopen na dag 7 + in-app notificatie
  - AdminPage: "Openstaande uitnodigingen" tabel met status-badges (⏳/📧/⏰) en herinnering-knop
  - AppContext: auto-acceptatie bij eerste inlog uitgenodigde gebruiker
  - Gmail SMTP structuur voorbereid in `checkExpiredInvites.ts` (TODO-commentaar, klaar voor DNS + App Password)
- Deploy: Firebase Hosting + Functions + Firestore Rules → https://buurtapp-v3-4.web.app

### 5 maart 2026
- **lastSeen tracking + sessionCount**: AppContext schrijft `lastSeen: Date` en incrementeert `sessionCount` bij elke nieuwe auth-sessie (Firestore `increment()`). Vlag `lastSeenTracked` voorkomt dubbele writes per sessie.
- **Organisatie veld op User**: `User.organisatie?: string` toegevoegd. Admin-invite-formulier bevat nu optioneel "Organisatie / instelling" veld. Wordt opgeslagen in zowel `users/` als `invites/` Firestore collection.
- **modulePermissions systeem voor Viewers**: Nieuw `ModulePermission { canEdit: boolean }` interface. `User.modulePermissions?: { [moduleKey: string]: ModulePermission }` sla je per module rechten op. `canEditModule(moduleKey)` functie in AppContext: Beheerder/Concierge altijd `true`, Viewer controleert `modulePermissions[key]?.canEdit`.
  - AddUserModal: per geselecteerde module verschijnt een "Mag bewerken" checkbox (alleen zichtbaar voor Viewer-rol).
  - `inviteUser` Cloud Function doorstuurt `organisatie` + `modulePermissions` naar Firestore profiel.
- **Admin gebruikstabel uitgebreid**: Nieuwe kolommen: Organisatie, Laatste activiteit (`formatDistanceToNow`), Sessies. Actief/Inactief badge (grens: 14 dagen inactief = rood). Werkt op zowel desktop-tabel als mobile-card view.
- **HTML email templates** (`functions/src/emailTemplates.ts` — nieuw bestand):
  - `buildInviteEmailHtml(data)` — volledig HTML uitnodigingsmail met accountinfo, CTA-knop, modules-overzicht
  - `buildInviteEmailText(data)` — plain-text variant
  - `buildInviteEmailSubject()` — onderwerpregel
  - `buildReminderEmailHtml(data)` — herinnerings-email met verse reset-link en resterende dagen
  - `buildReminderEmailSubject()` — onderwerpregel herinnering
  - `export { APP_URL }` beschikbaar voor toekomstig SMTP-gebruik
- **sendWelcomeEmail.ts herschreven**: Genereert HTML via `buildInviteEmailHtml`, verstuurt uitnodigingsmail via nodemailer (Gmail). Secrets via `defineSecret()`.
- **checkExpiredInvites.ts bijgewerkt**: Verstuurt herinneringsmail (dag 3) en verlopen-melding (dag 7) via nodemailer. Template import actief.
- **Gmail geactiveerd**: `GMAIL_USER` + `GMAIL_APP_PASSWORD` ingesteld als Firebase Secrets. Nodemailer geïnstalleerd. Alle functions gedeployed.
- **Deploy**: Firebase Hosting + Functions → https://buurtapp-v3-4.web.app

### 2 maart 2026
- SSOT-audit uitgevoerd door GitHub Copilot
- AI_CONTEXT.md aangemaakt in `~/Webbiecorn-bedrijf/WEBBIECORN-SSOT/buurtapp-v3-4/`
- `copilot-instructions.md` bijgewerkt (SSOT refs + correcte emulator-poorten)
- `docs/ai/PROJECT_HANDOFF.md` aangemaakt
- Module-prompts geconsolideerd naar SSOT
- `.gitignore` gecontroleerd — secrets.env correct geconfigureerd

---

*Bijgehouden door: Kevin (Webbiecorn) + GitHub Copilot | Laatst bijgewerkt: 5 maart 2026 — Gmail actief, alle features gedeployed*
