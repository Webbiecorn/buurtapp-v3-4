# Buurtconciërge App — CURRENT_TASK

> Bijgehouden per sessie. Voeg nieuwe taken bovenaan toe.
> **Gebruik**: lees dit bestand altijd als eerste voordat je begint met werken.

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
