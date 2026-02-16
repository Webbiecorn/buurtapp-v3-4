# Changelog

All notable changes to this project will be documented in this file.

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
