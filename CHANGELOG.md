# Changelog

All notable changes to this project will be documented in this file.

## [0.3.4] - 2026-02-16
### Added
#### Bulk Actions
- **Multi-select functionaliteit** voor Meldingen
  - Checkboxes op elke meldingkaart voor selectie
  - "Selecteer alles" checkbox in tabblad navigatie
  - Visuele feedback van geselecteerde items
  - BulkActionsToolbar verschijnt bij selectie met animatie
- **Bulk operaties**:
  - Status wijzigen voor meerdere meldingen tegelijk
  - Bulk verwijderen met confirmation dialog
  - Selectie wordt gewist bij tab switch
  - Toast notificaties voor feedback
- **Nieuwe components**:
  - `BulkActionsToolbar.tsx`: Floating toolbar met acties
  - Hook: `useBulkSelection.ts` voor herbruikbare multi-select logica
- **Features**:
  - Set-based state voor O(1) lookup performance
  - Keyboard accessible (ESC sluit modals)
  - Disabled card clicks tijdens bulk selectie
  - Automatische selectie clear bij tab wissel

## [0.3.3] - 2026-02-16
### Added
#### Keyboard Shortcuts & Navigation
- **Command Palette** voor snelle navigatie (Cmd/Ctrl+K)
  - Fuzzy search door alle beschikbare pagina's en acties
  - Pijltjestoetsen voor navigatie, Enter om te selecteren
  - Automatische rolfiltering (alleen relevante acties tonen)
- **Globale keyboard shortcuts**:
  - `Cmd/Ctrl+K`: Command Palette
  - `?`: Keyboard shortcuts help
  - `H`: Dashboard
  - `M`: Meldingen
  - `P`: Projecten
  - `D`: Dossiers (Beheerder/Conciërge/Viewer)
  - `U`: Urenregistratie (Beheerder/Conciërge)
  - `S`: Statistieken (Beheerder/Viewer)
  - `A`: Admin (Beheerder)
- **Help Modal** met overzicht van alle shortcuts
- Components: `CommandPalette.tsx`, `KeyboardShortcutsHelp.tsx`
- Hook: `useKeyboardShortcuts.ts` voor globale shortcut handling
- Shortcuts werken niet in invoervelden (behalve Cmd+K)
- Automatische logging van shortcut gebruik

## [0.3.2] - 2026-02-16
### Added
#### Performance & UX
- **Debounced Search** geïmplementeerd in alle zoekfuncties (300ms delay, min 3 karakters)
- `useDebounce` en `useSearchDebounce` hooks in `src/hooks/useDebounce.ts`
- Loading indicators tijdens zoeken (spinning icon)
- Geïntegreerd in:
  - AdminPage: gebruikers en projecten zoeken
  - AchterpadenKaartOverzicht: straten en wijken zoeken
  - UrenregistratiePage: activiteiten zoeken
- Voorkomt onnodige filters/API calls bij snelle input
- Betere perceived performance door directe feedback

## [0.3.1] - 2026-02-16
### Added
#### Error Handling
- **React Error Boundaries** geïmplementeerd voor graceful error handling
- `ErrorBoundary` component vangt component-level errors op en voorkomt white screen
- Automatische error logging naar logger + Firebase Analytics
- Gebruiksvriendelijke fallback UI met herstel opties
- Development mode toont error details en component stack
- 3-laagse bescherming:
  - Top-level boundary rond hele App
  - ProtectedRoute-level voor alle protected pages
  - Expliciete boundary rond LoginPage

### Fixed
- App crasht niet meer bij component errors
- Betere error isolation tussen verschillende delen van de app

## [0.3.0] - 2026-02-16
### Added
#### Security & Validation
- **Zod validation** toegevoegd voor formulieren: user invite, melding aanmaken
- Input validatie schemas in `src/utils/validation.ts` voor alle belangrijke entities
- Email, naam en wachtwoord validatie met duidelijke Nederlandse error messages

#### Analytics & Monitoring
- **Firebase Analytics** volledig geïntegreerd voor usage tracking
- Automatische page view tracking in App.tsx bij route changes
- Event tracking voor: login, meldingen, projecten, gebruikers uitnodigen, uren registratie
- Analytics service in `src/services/analytics.ts` met 15+ tracking functies
- User properties tracking (role, theme) en user ID voor segmentatie

#### Performance
- ECharts tree-shaking verkend (niet effectief voor echarts-gl, gedocumenteerd in IMPROVEMENT_ROADMAP.md)

### Changed
- Logger service nu geïntegreerd met Analytics voor complete monitoring
- AppContext login functie tracked nu analytics events
- AdminPage user invite met Zod validatie
- NieuweMeldingPage met Zod validatie voor formulier input

### Documentation
- **IMPROVEMENT_ROADMAP.md**: Complete improvement roadmap met 20+ verbeteringen in 6 categorieën
- **TYPESCRIPT_CLEANUP_PLAN.md**: Gedetailleerd plan voor TypeScript strict mode cleanup (~150 'any' types)
- Phase 1-5 implementatie strategie voor toekomstige verbeteringen

### Fixed
- Firebase Analytics initialization (async isSupported check)
- Validation errors tonen nu gebruiksvriendelijke boodschappen

## [0.2.1] - 2026-02-16
### Added
- **Skeleton loaders** voor betere perceived performance (8 varianten)
- **Logger service** voor gecentraliseerde error handling met environment-aware behavior
- Skeletons voor: Page, Table, Chart, Card, List, Form, Stats components

### Changed
- Lazy loading geverifieerd (al aanwezig, nu gedocumenteerd)
- Console.log vervangen door logger in 15+ bestanden
- PageSkeleton als fallback voor alle Suspense boundaries

### Removed
- Backup bestanden (StatisticsPage.tsx.backup, StatisticsPage_old.tsx)
- `.gitignore` aangepast om backup files te excluden

## [0.2.0] - 2026-02-16
### Added
- Statistics: "Meldingen Overzicht" chart met bar + line visualisatie voor nieuwe en opgeloste meldingen
- Statistics: "Meldingen per Categorie" donut chart met alle categorieën en percentages
- Statistics: Verbeterde 2D heatmap met 6-staps gradient, zebra-striping en glow effects

### Fixed
- Statistics: "Uren per Medewerker" chart rotatie nu consistent met andere 3D charts
- Statistics: 3D charts hebben nu proper key prop voor correcte re-rendering bij type switch
- Statistics: Tooltips voor 3D charts verbeterd met betere data formatting
- Statistics: Scatter3D mode heeft nu hover labels voor betere UX

### Changed
- Statistics: 2D heatmap visueel verbeterd met afgeronde borders en betere spacing
- Statistics: Dark mode aware kleuren voor alle nieuwe visualisaties

## [0.1.0] - 2025-08-10
### Added
- Chat: Conversations with attachments (images/PDF), real-time ChatPage, notifications, 1:1 launch from Active Colleagues.
- Admin: Tabbed dashboard with per-tab filters. New reusable `Tabs` component.
- Dashboard: Admin-style KPIs and dossier distributions added to main Dashboard page with logical filters.
- Statistics: Trend charts moved here with filters (months back, project status, dossier status).

### Changed
- Admin “Overzicht” tab simplified to KPI cards only; charts and filters moved to “Dossiers”.
- Dossier pages stabilized with null-safe rendering.

### Fixed
- Firestore error when creating a conversation with undefined title.
- Statistics dossier trend now respects dossier status filter.

### Dev
- Emulator ports adjusted; dev can run without emulators via `VITE_USE_EMULATORS` flag.
- Added `.env.example`.

[0.1.0]: https://github.com/Webbiecorn/buurtapp-v3-4/releases/tag/v0.1.0
