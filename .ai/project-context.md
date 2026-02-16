# Buurtconciërge - AI Project Context

## Project Mission
Een gebruiksvriendelijke web-applicatie voor wijkbeheer waarmee conciërges, beheerders en medewerkers meldingen kunnen registreren, projecten kunnen beheren en woningdossiers kunnen bijhouden per adres.

## Key Business Rules

### Gebruikersrollen & Rechten
1. **Beheerder**
   - Volledige toegang tot alle functionaliteit
   - Kan gebruikers aanmaken en beheren
   - Kan alle dossiers, meldingen en projecten zien en bewerken

2. **Conciërge**
   - Kan eigen meldingen en projecten aanmaken en bewerken
   - Kan dossiers aanmaken en bewerken
   - Kan documenten uploaden

3. **Viewer**
   - Alleen lees-toegang
   - Kan geen wijzigingen maken
   - Kan data bekijken en exporteren

### Woningdossiers
- Elk dossier is gekoppeld aan een uniek adres (BAG)
- Een dossier bevat:
  - Adresgegevens en locatie (lat/lon)
  - Woningtype (vrijstaand, rijtjeshuis, appartement, etc.)
  - Bewoners (naam, contactinfo)
  - Notities (chronologisch)
  - Documenten (afbeeldingen, PDF's, video's)
  - Afspraken (datum, tijd, omschrijving)
  - Gerelateerde meldingen

### Meldingen
- Beschrijven problemen of observaties in de wijk
- Hebben een status: Nieuw, In behandeling, Opgelost, Gesloten
- Kunnen gekoppeld worden aan een adres/dossier
- Ondersteunen bijlagen (foto's, PDF's, video's)
- Updates met timestamp en auteur worden bijgehouden

### Projecten
- Langlopende activiteiten met meerdere bijdragen
- Leden kunnen zich aanmelden
- Activiteiten/contributions met omschrijving en media
- Kunnen gekoppeld worden aan een locatie op de kaart

## Data Architecture

### Firestore Collections
```
/dossiers/{adres}
  - status: string
  - labels: string[]
  - location: {lat: number, lon: number}
  - woningType: string
  - bewoners: Array<{naam, email, telefoon}>
  - notities: Array<{tekst, timestamp, auteur}>
  - documenten: Array<{naam, type, url, uploadedAt, uploadedBy}>
  - afspraken: Array<{datum, tijdstip, omschrijving}>
  - createdAt: timestamp
  - updatedAt: timestamp

/meldingen/{id}
  - titel: string
  - omschrijving: string
  - status: string
  - locatie: {lat, lon, adres}
  - categorie: string
  - prioriteit: string
  - attachments: Array<{type, url, naam}>
  - updates: Array<{tekst, timestamp, auteur}>
  - createdBy: string
  - createdAt: timestamp

/projecten/{id}
  - naam: string
  - omschrijving: string
  - status: string
  - locatie: {lat, lon, adres}
  - leden: string[]
  - contributions: {
      activiteiten: Array<{titel, omschrijving, media, timestamp, auteur}>
    }
  - createdAt: timestamp
```

### Firebase Storage Structure
```
/dossiers/{adres}/{filename}
/meldingen/{id}/{filename}
/projecten/{id}/{filename}
```

## Tech Stack Details

### Charting Library: Apache ECharts
- **Library**: echarts-for-react (React wrapper voor Apache ECharts)
- **Renderer**: SVG voor betere kwaliteit en performance
- **Features**:
  - Gradiënt kleuren voor moderne uitstraling
  - Soepele animaties (cubicOut, elasticOut easing)
  - Dark mode support met theme-aware kleuren
  - Donut charts (radius: ['40%', '70%'])
  - Area charts met transparante gradiënten
  - Interactieve tooltips en hover effecten

### ECharts Patterns
```typescript
// Theme-aware kleuren
const isDark = theme === 'dark';
const textColor = isDark ? '#e5e7eb' : '#374151';
const backgroundColor = isDark ? '#1f2937' : '#ffffff';
const gridColor = isDark ? '#374151' : '#e5e7eb';

// Gradiënt definitie
itemStyle: {
  color: {
    type: 'linear',
    x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [
      { offset: 0, color: '#3b82f6' },
      { offset: 1, color: '#1d4ed8' }
    ]
  },
  borderRadius: [6, 6, 0, 0]
}
```

## External Integrations

### PDOK Locatieserver (BAG)
- Gebruikt voor adres-suggesties en validatie
- Haalt metadata op: woningtype, bouwjaar, oppervlakte
- Endpoint: `https://api.pdok.nl/bzk/locatieserver/search/v3_1/`

### Google Maps API
- Gebruikt in statistieken pagina's
- Heatmap layer voor meldingen/projecten visualisatie
- Cluster markers voor betere performance

### Leaflet
- Gebruikt in dossier detail pagina's
- OpenStreetMap tiles
- Custom markers voor dossiers en meldingen

## UI/UX Patterns

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly controls op mobile
- Optimale kaartweergave op alle schermformaten

### Media Handling
- **Afbeeldingen**: Thumbnail preview, klik voor fullscreen
- **PDF's**: Icon placeholder, klik voor iframe viewer
- **Video's**: Icon placeholder, klik voor video player
- **Fullscreen overlay**:
  - Links/rechts pijlen voor navigatie
  - ESC toets om te sluiten
  - Klik buiten overlay om te sluiten
  - Toetsenbord ondersteuning

### Notifications
- Toast messages voor gebruikersfeedback
- Success: groen, "Operatie geslaagd"
- Error: rood, specifieke foutmelding
- Auto-dismiss na 3-5 seconden

### Forms & Validation
- Realtime validatie waar zinvol
- Duidelijke error messages in het Nederlands
- Disabled submit button tijdens processing
- Confirmatie dialogs voor destructieve acties

## Performance Considerations

### Firestore Optimization
- Gebruik indexen voor complex queries
- Limit queries waar mogelijk (bijv. laatste 50 items)
- Real-time listeners alleen waar nodig
- Unsubscribe van listeners bij unmount

### Image Optimization
- Client-side resize voor grote uploads
- Progressive loading voor galleries
- Lazy loading voor off-screen content

### Code Splitting
- Route-based code splitting met React.lazy
- Defer loading van zware components (kaarten, charts)

## Security & Privacy

### Authentication
- Firebase Auth voor gebruikersbeheer
- Email/password login
- Nieuw gebruikers krijgen tijdelijk wachtwoord: `Welkom01`
- Verplichte wachtwoordwijziging bij eerste login

### Authorization
- Firestore Security Rules voor data access control
- Client-side role checking voor UI
- Server-side validation in Cloud Functions
- Minimale data exposure per rol

### Data Privacy
- Geen PII in logs
- Beveiligde document URLs (signed URLs)
- GDPR-compliant data handling
- Opt-in voor contactgegevens in dossiers

## Development Workflow

### Lokale Development
```bash
# Terminal 1: Firebase Emulators
firebase emulators:start

# Terminal 2: Vite Dev Server
npm run dev
```

### Testing Approach
- Manual testing met emulators
- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile testing op echte devices
- Role-based testing voor alle user types

### Deployment
```bash
# Build en deploy naar Firebase Hosting
npm run deploy
```

### Git Workflow
- Main branch is productie
- Feature branches voor nieuwe functionaliteit
- Descriptieve commit messages in het Nederlands

## Common Gotchas

1. **HashRouter**: Gebruik `/#/path` format voor routes
2. **Firestore Timestamps**: Converteer naar JavaScript Date voor weergave
3. **Context Updates**: Zorg voor proper dependency arrays in useEffect
4. **File Uploads**: Valideer file types en sizes client-side
5. **Map Cleanup**: Destroy map instances bij unmount
6. **Role Checks**: Altijd valideren op zowel client als server

## Key Files Reference

- `src/context/AppContext.tsx` - Centrale state management en Firebase operaties
- `src/firebase.ts` - Firebase configuratie en initialisatie
- `src/types.ts` - Globale TypeScript types
- `firestore.rules` - Database security rules
- `storage.rules` - File storage security rules
- `functions/src/index.ts` - Cloud Functions endpoints

## Future Enhancements (Backlog)

- AI-powered melding categorisatie
- Automatische planning van afspraken
- SMS notificaties voor urgente meldingen
- Offline support met service workers
- Bulk import van dossiers
- Advanced analytics dashboard
- Mobile apps (iOS/Android)

---

**Laatst bijgewerkt**: 16 februari 2026
