# Buurtconciërge App — CURRENT_TASK

> Bijgehouden per sessie. Voeg nieuwe taken bovenaan toe.
> **Gebruik**: lees dit bestand altijd als eerste voordat je begint met werken.

---

## ✅ VOLTOOID: Gebruikersinfo & Viewer-rechten uitgebreid (5 maart 2026)

### Scope
Vijf nieuwe features op verzoek van Kevin:

1. **lastSeen + sessionCount tracking** — AppContext schrijft bij elke nieuwe auth-sessie `lastSeen: Date` en incrementeert `sessionCount` (Firestore `increment()`). Vlag `lastSeenTracked` voorkomt dubbele writes per sessie.
2. **Organisatie veld** — `User.organisatie?: string`. Optioneel invulveld in AddUserModal, opgeslagen in `users/` en `invites/` Firestore collections.
3. **modulePermissions voor Viewers** — `User.modulePermissions?: { [moduleKey]: { canEdit: boolean } }`. Per module een "Mag bewerken" checkbox in AddUserModal (alleen zichtbaar bij Viewer rol). `canEditModule(moduleKey)` functie beschikbaar via `useAppContext()`.
4. **Admin gebruikstabel** — Nieuwe kolommen: Organisatie, Laatste activiteit (relatief, bijv. "3 dagen geleden"), Actief/Inactief badge (grens: 14 dagen), Sessies. Desktop-tabel én mobile-card view.
5. **HTML email templates** — `functions/src/emailTemplates.ts` (nieuw bestand): invite-mail + reminder-mail als responsive HTML. `sendWelcomeEmail.ts` herschreven met templates + nodemailer stub.

### Nieuwe bestanden
- `functions/src/emailTemplates.ts` — HTML email templates (invite + reminder)

### Gewijzigde bestanden
- `src/types.ts` — `ModulePermission`, `User`, `AppContextType`
- `src/utils/validation.ts` — `inviteUserSchema` uitgebreid
- `src/context/AppContext.tsx` — lastSeen/sessionCount tracking, `canEditModule`
- `src/pages/AdminPage.tsx` — AddUserModal volledig + gebruikerstabel 3 nieuwe kolommen
- `functions/src/inviteUser.ts` — organisatie + modulePermissions doorsluizen
- `functions/src/sendWelcomeEmail.ts` — herschreven met HTML templates
- `functions/src/checkExpiredInvites.ts` — template import klaar (commented), TODO-blok bijgewerkt

### Volgende stap: Gmail SMTP activeren
Zodra DNS-records + App Password beschikbaar:
1. `firebase functions:secrets:set GMAIL_USER`
2. `firebase functions:secrets:set GMAIL_APP_PASSWORD`
3. `cd functions && npm install nodemailer @types/nodemailer`
4. Uncomment nodemailer blok in `sendWelcomeEmail.ts` + `checkExpiredInvites.ts`

---

## ✅ VOLTOOID: Uitnodigingssysteem uitgebreid (4 maart 2026)

### Scope
- Uitnodigingen worden nu bijgehouden in Firestore (`invites` collection)
- Geldigheid uitgebreid naar **7 dagen** (Firebase Auth reset-link zelf is max 1 uur, maar we sturen bij herinnering een verse)
- **Herinnering-knop** in AdminPage (≈ Beheer → Gebruikers, sectie "Openstaande uitnodigingen")
- **Automatische herinnering** na 3 dagen (Cloud Function markeert `reminderDue: true`, in-app notificatie naar admin)
- **Verlopen-notificatie** na 7 dagen: uitnodiging op `expired`, in-app notificatie naar verzendende beheerder
- **Auto-acceptatie**: bij eerste inlog markeert AppContext de invite als `accepted`
- **Gmail SMTP structuur** aangemaakt in `checkExpiredInvites.ts` (TODO-commentaar), klaar voor invullen zodra DNS-records beschikbaar zijn

### Nieuwe bestanden
- `functions/src/sendInviteReminder.ts` — callable Cloud Function
- `functions/src/checkExpiredInvites.ts` — scheduled Cloud Function (dagelijks 08:00)

### Gewijzigde bestanden
- `functions/src/inviteUser.ts` — sla invite op in `invites` collection
- `functions/src/index.ts` — export nieuwe functions
- `src/pages/AdminPage.tsx` — invite-status tabel + herinnering-knop
- `src/context/AppContext.tsx` — auto-acceptatie bij eerste inlog
- `firestore.rules` — regels voor `invites` collection

### Nog te doen: Gmail SMTP
Zodra DNS-records + App Password beschikbaar:
1. `firebase functions:secrets:set GMAIL_USER`
2. `firebase functions:secrets:set GMAIL_APP_PASSWORD`
3. Nodemailer installeren: `cd functions && npm install nodemailer @types/nodemailer`
4. TODO-commentaar in `checkExpiredInvites.ts` activeren

---

## ✅ VOLTOOID: Bugfix camera-knop achterpaden registratie stap 4 (4 maart 2026)

### Probleem
- Knop "Foto maken" opende de bestandskiezer in plaats van de camera op mobiel
- Hover-effect was nauwelijks zichtbaar op de blauwe knop
- Op laptop werd terecht de bestandskiezer geopend (browser-gedrag, niet te wijzigen)

### Oorzaak
- Implementatie gebruikte `cameraInputRef.current?.click()` via JavaScript
- Moderne browsers beschouwen geprogrammeerde `.click()` als indirecte interactie en negeren dan `capture="environment"`
- Input was verborgen via `className="hidden"` (`display:none`) — sommige mobiele browsers weigeren camera via display:none inputs

### Oplossing
- `<button onClick={openCamera}>` vervangen door `<label htmlFor="camera-capture-input">` direct gekoppeld aan `<input capture="environment">`
- Een klik op een `<label>` is altijd een directe gebruikersinteractie → browser respecteert `capture`
- Input verborgen via `className="sr-only"` (visueel verborgen maar aanwezig in DOM)
- `openCamera` / `openGallery` functies en refs verwijderd (niet meer nodig)
- Hover verbeterd: `hover:bg-blue-900` i.p.v. `hover:bg-brand-primary/90`
- Deploy: `firebase deploy --only hosting` → live op https://buurtapp-v3-4.web.app

### Technische notitie
> `capture="environment"` werkt **alleen op mobiele apparaten**. Desktop browsers negeren dit attribuut altijd — dat is browser-standaard, niet een bug.

---

## ✅ VOLTOOID: Bugfix foto-upload + feature "foto later toevoegen" achterpaden (2 maart 2026)

### Bugfix — AchterpadenRegistratie.tsx
- `e.target.value = ''` na elke bestandsselectie → `onChange` vuurde niet opnieuw als hetzelfde bestand of na verwijdering werd geselecteerd
- Functionele state-update: `prev => [...prev, ...newFiles]` → race condition fix
- **Aanleiding**: medewerker kon pad niet opslaan omdat foto verplicht was + upload faalde door dit bug

### Nieuwe feature — Foto optioneel bij registratie + herinnering
**AchterpadenRegistratie.tsx:**
- Foto niet meer verplicht om op te slaan
- Gele waarschuwing getoond in formulier als geen foto geselecteerd is
- Firestore: `fotoOntbreekt: true` veld opgeslagen bij registratie zonder foto
- Notificatie verstuurd naar medewerker zelf én alle beheerders bij ontbrekende foto
- Notificatietekst medewerker: `"⚠️ Foto ontbreekt: achterpad [straat] — voeg een foto toe via Beheer"`
- Notificatietekst beheerders: `"⚠️ Foto ontbreekt: achterpad [straat] door [naam]"`

**AchterpadenBeheer.tsx:**
- Kolom "Foto's" toegevoegd aan overzichtstabel
- Oranje knop "📸 Toevoegen" zichtbaar voor entries met `fotoOntbreekt: true`
- Upload modal: foto kiezen, preview tonen, uploaden naar Firebase Storage
- Na succesvolle upload: badge verdwijnt, toont ✅ X
- Build: ✅ geslaagd
- ⚠️ **Nog niet getest door Kevin** — functionele test volgt

---

## ✅ VOLTOOID: SSOT-audit en consolidatie (2 maart 2026)

- [x] Projectaudit uitgevoerd (code, docs, types, services, routes)
- [x] `AI_CONTEXT.md` aangemaakt in `~/Webbiecorn-bedrijf/WEBBIECORN-SSOT/buurtapp-v3-4/`
- [x] `copilot-instructions.md` bijgewerkt (SSOT-refs + correcte emulator-poorten: 8083/9201/9100/5101)
- [x] `docs/ai/PROJECT_HANDOFF.md` aangemaakt
- [x] 10 module-prompts geconsolideerd naar SSOT (`module-prompts/`)
- [x] `.env.example` aangevuld met volledige documentatie
- [x] Vastgesteld: `secrets.env` gedekt door `*.env` in `.gitignore` ✅

**Ontbrekende kennis (Kevin moet aanvullen in AI_CONTEXT.md):**
- Wie is de exacte klant/opdrachtgever? (organisatienaam)
- Wat is de Firebase Functions regio — blijft `us-central1` of migreren naar `europe-west1`?
- Is er een officiële primaire merkkleur (`brandColors`)?

---

## 📋 Backlog (uit IMPROVEMENT_ROADMAP.md)

### Hoge prioriteit
- [ ] **ECharts tree-shaking** (~200KB besparing) — zie `IMPROVEMENT_ROADMAP.md`
- [ ] **Lodash → lodash-es** (~50KB besparing)
- [ ] **PDF/Excel lazy loading** (~700KB uit initial bundle)

### Gemiddelde prioriteit
- [ ] **Virtualized lists** voor grote datasets (react-window)
- [ ] **Image optimalisatie**: client-side resize, WebP/AVIF
- [ ] **Firebase Functions regio** evalueren (`europe-west1` voor AVG compliance)

### Laag prioriteit / Backlog
- [ ] `recharts` verwijderen (unused dependency)
- [ ] `brandColors.ts` aanmaken voor consistente merkkleurgebruik
- [ ] Volledige offline-first ondersteuning (Service Worker uitbreiden)

---

## 📖 Hoe te beginnen (dagelijkse sessie)

```
1. Lees .github/copilot-instructions.md
2. Lees dit bestand (CURRENT_TASK.md)
3. Kies een taak uit de backlog of zet een nieuwe taak bovenaan
4. Werk de taak af
5. Commit met een beschrijvend Nederlands bericht
6. Sluit de sessie af: update dit bestand + PROJECT_HANDOFF.md
```

---

*Bestand aangemaakt: 2 maart 2026 | Buurtconciërge App v0.3.6*
