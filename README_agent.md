# Buurtconciërge AI Agent – Runbook en Antwoordinstructies

Dit document geeft een beknopt maar praktisch overzicht voor een AI‑agent die aan deze app werkt: hoe de app in elkaar zit, hoe je veilig wijzigt, en hoe je antwoorden structureert.

## Agent Runbook – App‑overzicht

- Doel: melden, plannen en rapporteren van wijkwerk; dossiers per adres beheren.
- Rollen: Beheerder (admin), Conciërge (werkend), Viewer (alleen lezen). UI/acties passen per rol.

### Architectuur
- Frontend: React 18 + TypeScript, Vite, Tailwind (config in `tailwind.config.js`).
- Router: React Router v6 (HashRouter).
- Kaarten: Leaflet (dossierdetail) en Google Maps via `@vis.gl/react-google-maps` (statistieken).
- Charts: Recharts.
- Backend: Firebase (Firestore, Storage), Functions (Express/HTTP) onder `functions/`.
- Build/Dev: Vite; Emulator Suite voor Auth, Firestore, Storage, Functions, Hosting.

### Belangrijke routes/schermen
- Inloggen: `/#/login`.
- Dossier bewerken (overzicht): `/#/dossiers` (optioneel `?adres=<encoded>` om een dossier direct te openen/bewerken).
- Dossier detail: `/#/dossier/:adres` (kaart, bewoners, notities, documenten, afspraken).
- Meldingen: lijst + detailmodal (aanmaken, status, bijlagen).
- Projecten: lijst + detail (activiteiten met bijlagen).
- Statistieken: kaartoverzicht met filters (Meldingen/Projecten/Woningdossiers/Allen).

### Emulatorpoorten (dev)
- Firestore 8081, Storage 9199, Functions 5001, Auth 9099, Emulator UI 4000, Hosting 5000.

### Starten
- Emulators: `firebase emulators:start`
- Dev‑server: `npm run dev` (http://localhost:5173)
- Build: `npm run build`

### Belangrijke codepaden
- Context en services: `src/context/AppContext.tsx`, `src/services/dossierMeta.ts`.
- UI componenten: `src/components/` (o.a. Icons, kaartenmarkers, UI primitives).
- Pagina’s: `src/pages/*` (DossierPage, DossierDetailPage, IssuesPage, ProjectsPage, etc.).
- Viewer overlay (image/pdf/video) met pijlen/Esc aanwezig in: DossierPage, DossierDetailPage, IssuesPage, ProjectsPage.

### Kernstromen
- Woningdossiers
  - Zoeken/selectie via PDOK/BAG; dossier aanmaken/verrijken met `location` en `woningType`.
  - Bewerk (overzicht): bewoners, notities, afspraken links; documenten rechts (grid met grotere miniaturen, klik‑om‑te‑vergroten overlay), gerelateerde meldingen.
  - Detail: kaart + bewoners/notities/documenten/afspraken; knop “Bewerken” naar overzicht.
- Meldingen
  - Nieuw: titel/omschrijving/locatie/status + bijlagen (image/pdf/video); toasts; modal sluit bij succes.
  - Detail: updates met bijlagen als thumbnails/placeholder; overlay viewer met pijlen/Esc.
- Projecten
  - Activiteiten met bijlagen (image/pdf/video); thumbnails en fullscreen overlay (pijlen/Esc).

### Viewer/Uploads
- Thumbnails tonen miniatuur voor afbeeldingen; PDF/Video tonen placeholder; klik opent overlay.
- Overlay: inline `<img>`, `<video controls>`, of `<iframe>` (PDF). Onbekend type → downloadknop.
- Navigatie: links/rechts en toetsenbord (← →), Esc sluit; klik buiten sluit.
- Upload accept (waar van toepassing): `image/*,application/pdf,video/*`.

### Firestore data (vereenvoudigd)
- `dossiers/{adres}`: `status`, `labels[]`, `location{lat,lon}`, `woningType`, `bewoners[]`, `notities[]`, `documenten[]`, `afspraken[]`.
- `meldingen/{id}`: velden + `attachments[]`, `updates[]`.
- `projecten/{id}`: velden + `contributions/activiteiten[]`.

### Context‑API (selectie)
- Dossiers: `getDossier`, `createNewDossier`, `addDossierNotitie`, `uploadDossierDocument`, `addDossierBewoner`, `updateDossierBewoner`, `removeDossierBewoner`, `addDossierAfspraak`, `removeDossierAfspraak`.
- Meldingen: `addMelding`, `updateMeldingStatus`, `addMeldingUpdate`.
- Projecten: `joinProject`, `addProjectContribution`, `updateProject`, `uploadFile`.

### Integraties
- PDOK Locatieserver (BAG) voor suggesties/geo/meta.
- Google Maps (statistieken); Leaflet (dossierdetail).

### Veiligheid/rollen
- UI en context valideren per rol: Viewer read‑only, Conciërge eigen data, Beheerder admin.
- Geen secrets committen; gebruik `.env.local` en `import.meta.env`.

### Test/kwaliteit (snelle checklist)
- Build groen (`npm run build`).
- Geen console errors; toasts bij succes/fout; focus/keyboard (Esc/pijlen) werkt.
- Rolrechten gerespecteerd.

## Agent Antwoordinstructies – Hoe te reageren

### Stijl en format
- Taal: Nederlands. Kort en feitelijk, impersonal.
- Begin met een mini‑plan (1 zin of 2–3 bullets), voer uit, sluit af met korte status/validatie.
- Stel max. 1–2 verduidelijkingsvragen als essentieel; anders direct handelen.

### Do’s
- Kleine, gerichte patches aan code. Leg concreet uit wat je wijzigt.
- Gebruik workspace‑search en lees relevante bestanden voordat je wijzigt.
- Valideer met build of snelle run na substantiële wijzigingen.
- Voeg waar nuttig kleine UX‑verbeteringen toe (toasts, aria‑labels, keyboard support).
- Respecteer rolrechten en bestaande conventies.

### Don’ts
- Geen secrets, geen PII. Geen onveilige/harmful content.
- Geen grote refactors zonder noodzaak. Geen breaking changes zonder overleg.

### Antwoordopbouw (sjabloon)
- Plan: wat je nu gaat doen.
- Acties: korte bullets van wat je veranderde (bestanden en kernwijziging).
- Validatie: build/teststatus in 1–2 regels.
- Optioneel: vervolgstappen.

### Ontwikkelcommando’s
- Emulators: `firebase emulators:start`
- Dev: `npm run dev` (http://localhost:5173)
- Build: `npm run build`

### Workspace‑tips
- Bestandslocaties
  - Dossier bewerken: `src/pages/DossierPage.tsx` (documenten‑grid + overlay aanwezig).
  - Dossier detail: `src/pages/DossierDetailPage.tsx` (overlay aanwezig).
  - Meldingen: `src/pages/IssuesPage.tsx` (upload + viewer aanwezig).
  - Projecten: `src/pages/ProjectsPage.tsx` (activiteiten + viewer aanwezig).
  - Icons: `src/components/Icons.tsx` (ChevronLeft/Right, X, Download, etc.).
- Zoekstrings: `previewItems|renderInline|getType|openPreview|accept="image/*,application/pdf,video/*"`.

### Kwaliteitscheck vóór oplevering
- Build/typecheck PASS.
- UX smoke test: klik thumbnails → overlay, pijlen/ESC werken, PDF/video inline.
- Geen regressies in rolgedrag.

### Commit/push
- Kleine, beschrijvende commitboodschap.
- Push naar `main` (of featurebranch indien afgesproken).

---

Laat weten als je dit document wil uitbreiden met bijvoorbeeld API‑schema’s of sequence‑diagrammen.# Buurtconciërge Agent Runbook

Deze handleiding bundelt twee overzichten voor AI‑agents:
- Hoe de app werkt (architectuur, flows, data, tooling)
- Hoe jij als agent antwoordt en wijzigingen veilig levert

## Inhoud
- Doel en rollen
- Architectuur en omgeving
- Routes en hoofdschermen
- Kernstromen per module
- Data‑model (Firestore)
- Context API (frontend service‑laag)
- Integraties
- UI patronen (viewer/overlay, toetsen)
- Beveiliging en regels
- Ontwikkelcommando’s en emulatorpoorten
- Agent‑antwoordrichtlijnen (stijl, do’s/don’ts, format)
- Debug, testen en kwaliteitscheck

---

## Doel en rollen
- Doel: Meldingen, projecten en woningdossiers beheren voor wijkwerk.
- Rollen:
  - Beheerder: alles (admin).
  - Conciërge: werkend, kan eigen items beheren en bijdragen.
  - Viewer: alleen lezen.

## Architectuur en omgeving
- Frontend: React 18 + TypeScript, Vite, Tailwind (via config). Router v6.
- Kaarten: Leaflet (dossieroverzicht), Google Maps via @vis.gl/react-google-maps (statistieken).
- Charts: Recharts.
- Backend: Firebase (Firestore, Storage), Cloud Functions (Express REST).
- AI: Google Gemini (gemini‑1.5‑flash) voor samenvattingen (beheerderstools).

## Routes en hoofdschermen
- Login: /#/login
- Dossiers (bewerken): /#/dossiers
  - Direct bewerken van een adres: /#/dossiers?adres=<encodeURIComponent(adres)>
- Dossier overzicht: /#/dossier/:adres
- Meldingen: /#/meldingen (lijst + detailmodal)
- Projecten: /#/projecten (lijst + detailmodal)
- Statistieken/kaart: /#/statistieken

## Kernstromen per module

### Woningdossiers
- Zoeken: PDOK/BAG suggesties; selectie haalt/maakt dossier en verrijkt met coördinaten en woningType.
- Bewerkpagina (/dossiers):
  - Bewoners: toevoegen/bewerken/verwijderen (naam, contact, extra info).
  - Notities: toevoegen (met Belangrijk), lijstweergave.
  - Afspraken: toevoegen (Omschrijving verplicht; Start/Einde optioneel), lijst (nieuwste eerst), validatie met toasts.
  - Documenten (rechterkolom):
    - Upload accept: image/*, application/pdf, video/*.
    - Raster met grotere miniaturen; klik opent fullscreen viewer (image/pdf/video) met links/rechts en Esc; onbekende types → downloadknop.
  - Gerelateerde Meldingen: lijst onder documenten.
- Overzichtspagina (/dossier/:adres):
  - Kaart met Leaflet op opgeslagen coördinaten.
  - Bewoners, Notities, Documenten (met viewer), Afspraken.
  - Knop “Bewerken” → /#/dossiers?adres=<adres>.

### Meldingen
- Nieuwe melding: titel, omschrijving, wijk, GPS‑locatie (optioneel), status, bijlagen (image/pdf/video). Na succes: toast en sluiting.
- Bestaande melding: detailmodal met updates en bijlagen.
  - Bijlagen tonen thumbnails/placeholder.
  - Viewer overlay ondersteunt image/pdf (iframe)/video (mp4/webm/ogg) + download fallback.
  - Navigatie met ←/→ en Esc; klik buiten sluit.
- Status aanpassen met inline select (rolrechten gelden); toasts bij succes/fout.

### Projecten
- Projectdetail: deelnemers, status, beschrijving, bijlagen.
- Activiteiten (contributions) met bijlagen.
  - Thumbnails; klik‑om‑te‑vergroten viewer met carousel en Esc.
  - Upload accept: image/pdf/video.

### Urenregistratie (indien aanwezig in app)
- Conciërge: eigen entries bewerken/verwijderen binnen 21 dagen vanaf starttijd.
- Beheerder: altijd.
- Validaties: start < eind, overlapdetectie met eigen entries.
- Verwijderen vraagt bevestiging; toasts bij succes/fout.

## Data‑model (Firestore)
- dossiers/{adres}
  - status: string
  - labels: string[]
  - location: { lat: number, lon: number }
  - woningType: string | null
  - bewoners: [{ id, name, contact?, extraInfo? }]
  - notities: [{ id, text, isBelangrijk, timestamp }]
  - documenten: [{ id, name, url, uploadedAt, userId }]
  - afspraken: [{ id, start, end?, description, bewonerId?, bewonerNaam? }]
- meldingen/{id}
  - titel, omschrijving, wijk, status, locatie, attachments: string[]
  - updates: [{ id, userId, text, attachments: string[], timestamp }]
- projecten/{id}
  - title, description, status, startDate, endDate, attachments: string[]
  - contributions: [{ id, userId, text, attachments: string[], timestamp }]

## Context API (frontend service‑laag)
- Dossiers: getDossier, createNewDossier, addDossierNotitie, uploadDossierDocument, addDossierBewoner, updateDossierBewoner, removeDossierBewoner, addDossierAfspraak, removeDossierAfspraak, updateDossierStatus.
- Meldingen: addMelding, updateMeldingStatus, addMeldingUpdate.
- Projecten: add/update/join, addProjectContribution, uploadFile.

## Integraties
- PDOK Locatieserver (BAG): adressuggesties en detailopvraging (centroide_ll → lon/lat) voor dossierverrijking.
- Kaarten: Leaflet (dossieroverzicht), Google Maps (statistieken) via @vis.gl/react-google-maps.

## UI patronen (viewer/overlay, toetsen)
- Thumbnails ⇒ klik opent overlay.
- Overlay: klik buiten sluit; Esc sluit; links/rechts (toetsen en knoppen) bladert.
- Inline viewer: afbeelding (img), PDF (iframe met #toolbar=1), video (video tag). Onbekend type → downloadknop.

## Beveiliging en regels
- Respecteer rolrechten (Viewer read‑only; Conciërge eigen items; Beheerder admin).
- Geen secrets in code; gebruik import.meta.env en .env.local.
- Strip undefined voor Firestore writes; gebruik arrayUnion/updateDoc.

## Ontwikkelcommando’s en emulatorpoorten

```bash
# Emulators (Auth, Functions, Firestore, Storage, UI)
firebase emulators:start

# Development server
npm run dev

# Productiebouw
npm run build
```

- Poorten (default): Firestore 8081, Auth 9099, Functions 5001, Storage 9199, Emulator UI 4000, Hosting 5000.

---

# Agent‑antwoordrichtlijnen

## Stijl en toon
- Nederlands, kort en feitelijk, impersonal.
- Start met een mini‑plan, voer direct uit, sluit af met korte status.
- Stel maximaal 1–2 verduidelijkingsvragen als iets essentieel vaag is.

## Do’s (capaciteiten)
- Gerichte codewijzigingen met kleine patches; uitleg en review.
- Tests/validatie waar passend; run build om te checken.
- Workspace search en kleine backend‑tweaks (Functions) indien nodig.
- UI/UX‑verbeteringen (toasts, viewer, validatie, layout).

## Don’ts
- Geen secrets delen/toevoegen; geen PII‑herkenning; geen auteursrechtinbreuk.
- Geen grote refactors zonder expliciete vraag.

## Antwoordformat (vaste structuur)
- Plan: 1–3 bullets wat je nu gaat doen.
- Acties/patch: compacte beschrijving van aanpassingen (en voer ze uit in de workspace).
- Verificatie: kort build/testresultaat.
- Notities: randzaken of vervolgstappen.

## Patch‑conventies
- Voorkom ruis; wijzig alleen relevante delen.
- Houd bestaande stijl aan; breek publieke API’s niet zonder reden.
- Voeg waar nodig iconen/helpers toe in bestaande modules (bijv. Icons.tsx) en hergebruik viewerhelpers (getType/renderInline/overlaypatroon).

## Debug en testen
- Lees foutmeldingen letterlijk; noem oorzaak en fix.
- Verifieer met `npm run build` en, indien relevant, een korte UI‑smoketest.
- Korte toasts/validaties voor UX.

## Kwaliteitscheck vóór oplevering
- Build groen; geen type/syntaxfouten.
- Geen console‑errors; toetsenbordinteractie (Esc, ←/→) werkt.
- Rolrechten gerespecteerd; geen secrets of TODO’s achtergelaten.

---

## Snelle referentie: viewerondersteuning
- Pagina’s met overlay viewer: Projecten (activiteiten), Meldingen (updates en meldingbijlagen), DossierDetailPage (/dossier/:adres), DossierPage (/dossiers bewerken).
- Bestandsacceptatie bij uploads:
  - Meldingen (nieuw + update): image/*, application/pdf, video/*
  - Projectactiviteiten: image/*, application/pdf, video/*
  - Dossierdocumenten: image/*, application/pdf, video/*

## Snelle referentie: paden en symbolen
- Viewer helpers: getType, renderInline, previewItems + previewIndex, openPreview, closePreview.
- Iconen voor navigatie: ChevronLeftIcon, ChevronRightIcon, XIcon, DownloadIcon.

---

Laat dit bestand up‑to‑date blijven bij nieuwe features (bijv. extra viewer‑types, nieuwe rollen of routes).
