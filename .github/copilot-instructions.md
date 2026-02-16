# GitHub Copilot Instructies - Buurtconciërge App

## Project Overzicht

Dit is een React + TypeScript buurtbeheer applicatie voor het melden, plannen en rapporteren van wijkwerk, met dossiers per adres.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Routing**: React Router v6 (HashRouter)
- **Maps**: Leaflet (details), Google Maps via @vis.gl/react-google-maps (statistieken)
- **Charts**: Apache ECharts (via echarts-for-react) - moderne, geanimeerde data visualisaties
- **Backend**: Firebase (Firestore, Storage, Functions, Auth)
- **Build**: Vite

### Gebruikersrollen
- **Beheerder**: volledige admin rechten
- **Conciërge**: kan eigen data bewerken
- **Viewer**: alleen lezen

## Code Conventies

### TypeScript
- Gebruik strict mode (enabled in tsconfig.json)
- Geen `any` types tenzij absoluut noodzakelijk
- Gebruik interfaces voor props en data types
- Path alias `@/*` verwijst naar project root

### React Patterns
- Functionele components met hooks
- Context API voor state management (zie `src/context/AppContext.tsx`)
- Geen class components
- gebruik `React.FC<Props>` voor component typing

### Styling
- Tailwind CSS voor alle styling
- Geen inline styles tenzij dynamisch
- Gebruik bestaande UI componenten uit `src/components/ui.tsx`
- Mobile-first responsive design

### File Organization
```
src/
├── components/     # Herbruikbare UI componenten
├── pages/         # Route/page componenten
├── context/       # React Context providers
├── services/      # Firebase en externe services
├── utils/         # Helper functies
├── types.ts       # Globale TypeScript types
```

### Firebase
- Gebruik altijd de Context API functies voor Firebase operaties
- Geen directe Firestore calls buiten services/
- Emulator poorten: Firestore 8081, Storage 9199, Functions 5001, Auth 9099
- Test wijzigingen met emulators: `firebase emulators:start`

### Component Patterns

#### Media/Document Uploads
- Accept types: `image/*,application/pdf,video/*`
- Toon thumbnails voor afbeeldingen, placeholders voor PDF/video
- Implementeer fullscreen overlay viewer met:
  - Pijltoets navigatie (← →)
  - ESC om te sluiten
  - Klik buiten overlay om te sluiten
  - Inline render voor images, video controls voor video, iframe voor PDF

#### Forms
- Toon toast notifications bij succes/fout
- Sluit modals bij succesvolle submit
- Valideer input voordat submit
- Respecteer rolrechten in UI

#### Navigation
- Gebruik HashRouter routes (bijv. `/#/dossiers`)
- Query params voor state: `?adres=<encoded>` voor dossier filtering

## Do's en Don'ts

### DO
✅ Gebruik Nederlandse teksten in de UI
✅ Voeg aria-labels toe voor accessibility
✅ Implementeer keyboard support (ESC, pijltoetsen)
✅ Toon loading states en error handling
✅ Test met Firebase emulators
✅ Gebruik bestaande Context API functies
✅ Respecteer gebruikersrollen in UI en functionaliteit
✅ Voeg toast notifications toe voor user feedback

### DON'T
❌ Commit geen secrets of API keys
❌ Gebruik geen inline styles (gebruik Tailwind)
❌ Maak geen breaking changes zonder overleg
❌ Gebruik geen class components
❌ Doe geen directe Firestore calls buiten services
❌ Negeer geen rolrechten validatie
❌ Vergeet geen error handling

## Belangrijke Services

### Context API (`src/context/AppContext.tsx`)
Belangrijkste functies:
- **Dossiers**: `getDossier`, `createNewDossier`, `addDossierNotitie`, `uploadDossierDocument`, `addDossierBewoner`, `removeDossierBewoner`, `addDossierAfspraak`
- **Meldingen**: `addMelding`, `updateMeldingStatus`, `addMeldingUpdate`
- **Projecten**: `joinProject`, `addProjectContribution`, `updateProject`, `uploadFile`

### External APIs
- **PDOK Locatieserver**: BAG data voor adressen en geo-coördinaten
- **Google Maps**: Statistieken kaartweergave
- **Leaflet**: Detail kaarten in dossiers

## Testing Checklist

Voor elke wijziging:
1. ✅ Build slaagt: `npm run build`
2. ✅ Geen console errors in browser
3. ✅ Toast notifications werken
4. ✅ Keyboard navigatie werkt (ESC, pijlen)
5. ✅ Rolrechten worden gerespecteerd
6. ✅ Responsive op mobile

## Common Patterns

### ECharts Visualisaties
```typescript
import ReactECharts from 'echarts-for-react';

// Gebruik theme-aware kleuren
const isDark = theme === 'dark';
const textColor = isDark ? '#e5e7eb' : '#374151';
const backgroundColor = isDark ? '#1f2937' : '#ffffff';
const gridColor = isDark ? '#374151' : '#e5e7eb';

// Implementeer met gradiënten en animaties
<ReactECharts
  option={{
    backgroundColor: 'transparent',
    tooltip: { /* ... */ },
    series: [{ /* ... */ }],
    animationDuration: 1000,
    animationEasing: 'cubicOut'
  }}
  opts={{ renderer: 'svg' }}
/>
```

### Toast Notifications
```typescript
toast.success('Operatie geslaagd');
toast.error('Er is iets misgegaan');
```

### Modal State
```typescript
const [showModal, setShowModal] = useState(false);
// Sluit modal bij succes
await submitForm();
setShowModal(false);
```

### Role Checking
```typescript
if (currentUser?.role === 'beheerder') {
  // Admin only functionality
}
```

### File Upload
```typescript
<input
  type="file"
  accept="image/*,application/pdf,video/*"
  onChange={handleFileUpload}
/>
```

## Environment Variables

Gebruik altijd `import.meta.env` voor Vite omgevingsvariabelen:
- Definieer in `.env.local` (nooit committen)
- Prefix met `VITE_` voor client-side variabelen

## Development Workflow

```bash
# Start emulators
firebase emulators:start

# Start dev server (in andere terminal)
npm run dev

# Build voor productie
npm run build

# Lint code
npm run lint
```

## Security

- Valideer alle user input
- Check rolrechten op client én server (Functions)
- Gebruik Firebase Security Rules (firestore.rules, storage.rules)
- Geen PII in logs of errors
- Gebruik secure defaults

## Performance

- Lazy load routes waar mogelijk
- Optimaliseer afbeeldingen voor upload
- Gebruik React.memo voor expensive renders
- Beperk Firestore queries met indexes
- Cache data waar zinvol in Context

---

**Laatst bijgewerkt**: februari 2026
