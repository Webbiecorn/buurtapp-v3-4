# Changelog

All notable changes to this project will be documented in this file.

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
