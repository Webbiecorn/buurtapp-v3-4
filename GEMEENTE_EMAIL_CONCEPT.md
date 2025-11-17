# Email Concept: Fixi/HVC Integratie Aanvraag

## Aan: Gemeente Lelystad IT / Digitale Voorzieningen

---

**Onderwerp:** Aanvraag koppeling Buurtapp met Fixi/HVC meldingensysteem

---

Geachte heer/mevrouw,

**Introductie**

Ik ben Kevin, ontwikkelaar van de **Buurtapp** – een digitaal platform waarmee **buurtconcierges** van Lelystad professioneel meldingen kunnen registreren over hun buurt, projecten kunnen volgen en direct in contact staan met hun gemeente.

De app is ontwikkeld als professioneel hulpmiddel voor buurtconcierges om hun werk efficiënter te kunnen uitvoeren en als schakel tussen bewoners en gemeente te fungeren.

**Doel van deze aanvraag**

Wij willen graag een koppelingen realiseren met het gemeentelijk meldingensysteem **Fixi**, zodat meldingen die via onze Buurtapp worden ingediend naadloos worden doorgezet naar de juiste afdelingen binnen de gemeente.

Uit onderzoek blijkt dat Lelystad gebruikmaakt van:
- **Fixi** voor openbare ruimte meldingen
- **HVC/Woweb** koppeling voor afvalgerelateerde meldingen (via middleware)

Wij hebben de [Decos Wiki documentatie](https://wiki.decos.com/) geraadpleegd en zien dat er een gestandaardiseerde workflow bestaat voor het doorsturen van meldingen met velden zoals locatie, toelichting, categorie en foto's.

**Wat wij concreet nodig hebben**

*Fase 1 (korte termijn):*
1. **Email adres** waar wij meldingen naartoe kunnen sturen (incl. bijlagen/foto's)
2. **Contactpersoon** binnen IT/digitale voorzieningen voor technische afstemming
3. **Documentatie** over gewenste formaat/structuur van meldingen

*Fase 2 (langere termijn):*
4. **API toegang** tot Fixi systeem (authenticatie credentials)
5. **HVC/Woweb middleware** toegang voor afvalmeldingen (indien van toepassing)
6. **Webhook of status API** voor terugkoppeling van afhandelingsstatus naar onze app

**Wat wij bieden**

- Gestructureerde meldingen met GPS-locatie, foto's, categorie en urgentie
- Uniek referentienummer per melding voor tracking
- Privacy-conforme opslag van persoonsgegevens (AVG-proof)
- Lagere werkdruk op gemeentelijk loket door voorgesorteerde en geverifieerde meldingen
- Professionele buurtconcierges als kwaliteitsfilter tussen bewoners en gemeente
- Hogere efficiency door getrainde gebruikers die weten hoe meldingen correct in te dienen

**Voorgestelde vervolgstappen**

1. Korte kennismakingsgesprek (30 min) – digitaal of fysiek
2. Technische afstemming over gewenste veldmapping
3. Pilot periode met testmeldingen
4. Evaluatie en doorontwikkeling naar volledige API-koppeling

**Privacy & Veiligheid**

- Alle data wordt opgeslagen conform AVG richtlijnen
- API keys worden veilig beheerd (environment variables, geen git exposure)
- Toegang tot app alleen voor geautoriseerde buurtconcierges (authenticatie via Firebase)
- Buurtconcierges zijn getraind in omgang met persoonsgegevens en privacy
- EXIF-data wordt verwijderd uit foto's (geen privacygevoelige metadata)
- Kwaliteitscontrole: alleen professionele gebruikers kunnen meldingen indienen

**Contact**

Ik hoor graag van u welke stappen nodig zijn om deze koppeling te realiseren, en wie binnen de gemeente de juiste contactpersoon is voor verdere afstemming.

Met vriendelijke groet,

Kevin  
Ontwikkelaar Buurtapp  
Email: kevin@webbiecorn.nl  
GitHub: https://github.com/Webbiecorn/buurtapp-v3-4

---

## Bijlage: Technische Details

**App Stack:**
- Frontend: React 18 + TypeScript
- Backend: Firebase (Firestore, Functions, Storage)
- Maps: Google Maps API
- Hosting: Firebase Hosting

**Meldingsstructuur (voorbeeld JSON):**
```json
{
  "id": "FIXI-2025-001234",
  "titel": "Straatverlichting defect",
  "categorie": "straatverlichting",
  "urgentie": "normaal",
  "beschrijving": "Lantaarnpaal aan de Noorderlaan 45 doet het niet meer sinds gisteravond",
  "locatie": {
    "lat": 52.5084,
    "lng": 5.4750,
    "adres": "Noorderlaan 45, Lelystad"
  },
  "fotos": ["url1.jpg", "url2.jpg"],
  "melder": {
    "naam": "Jan Jansen",
    "email": "jan@example.com",
    "telefoon": "+31612345678"
  },
  "timestamp": "2025-11-17T14:30:00Z",
  "wijk": "Waterwijk"
}
```

**Categorieën in app:**
- Straatverlichting
- Gat in de weg
- Zwerfvuil
- Groenonderhoud
- Verkeersbord beschadigd
- Speeltoestel kapot
- Hondenpoep
- Overig

