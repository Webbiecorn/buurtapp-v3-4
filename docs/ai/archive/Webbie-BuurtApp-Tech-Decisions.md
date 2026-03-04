# Webbie-BuurtApp-Tech-Decisions.md

**Laatst bijgewerkt:** 17 februari 2026

## 🎯 BuurtApp - Tech Stack Keuzes & Rationale

Dit document legt uit WAAROM bepaalde technologie keuzes gemaakt zijn voor de BuurtApp, zodat toekomstige beslissingen consistent blijven en nieuwe developers (of AI assistants) de context snappen.

---

## Frontend Framework: React 18

**Gekozen op:** Begin project (2024)

### Waarom React?

✅ **Mature ecosystem** - Grootste community, meeste packages
✅ **TypeScript support** - First-class TS integration
✅ **Component reuse** - Perfect voor herbruikbare UI (cards, modals, etc.)
✅ **Hooks** - Clean state management zonder classes
✅ **Context API** - Goede balance tussen eenvoud en kracht voor state
✅ **Developer familiarity** - Ontwikkelaar kent React goed
✅ **Job market** - Meest gevraagde skill = makkelijk uitbreiden team

### Not Chosen

- ❌ **Vue 3:** Kleinere community, minder packages voor niche features (maps, charts)
- ❌ **Angular:** Te heavy, lange leercurve, overkill voor deze app grootte
- ❌ **Svelte:** Te nieuw, onzeker over long-term support, minder third-party components
- ❌ **Next.js:** Geen SSR nodig (Firebase hosting), extra complexity niet waard

### Review Status

✅ Zeer tevreden - blijf gebruiken voor toekomstige projecten

---

## Build Tool: Vite 6

**Gekozen op:** Begin project

### Waarom Vite?

✅ **Blazing fast dev server** - HMR in <100ms
✅ **Native ESM** - Modern, geen bundling tijdens dev
✅ **TypeScript out-of-box** - Zero config voor TS
✅ **Optimized builds** - Rollup onder de motorkap
✅ **Plugin ecosystem** - Alles wat je nodig hebt beschikbaar
✅ **Future-proof** - De richting waar web dev naartoe gaat

### Not Chosen

- ❌ **Create React App (CRA):** Traag, unmaintained sinds 2022, legacy
- ❌ **Webpack manual setup:** Te veel configuratie, slower dev experience
- ❌ **Parcel:** Minder controle, kleinere community

### Trade-offs

⚠️ **Leercurve voor team:** Maar minimaal - config almost identical to Webpack
⚠️ **Nieuwe bugs:** Maar actieve development = snelle fixes

### Review Status

✅ Perfecte keuze - 10x sneller dan CRA was

---

## Language: TypeScript 5.6

**Gekozen op:** Begin project

### Waarom TypeScript?

✅ **Type safety** - Catch bugs tijdens development, niet runtime
✅ **IntelliSense** - Autocomplete = snellere development
✅ **Refactoring** - Safe, IDE-assisted refactors
✅ **Documentation** - Types zijn living documentation
✅ **Team scaling** - Makkelijker onboarden nieuwe devs
✅ **Firebase integration** - Firebase SDK heeft excellente TS types

### Not Chosen

- ❌ **Plain JavaScript:** Te veel runtime errors, geen type checking
- ❌ **JSDoc types:** Half werk, inconsistent

### Configuration

**Strict mode:** Enabled
**Why strict?** Catch more issues, better code quality, minimal extra effort

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true
}
```

### Review Status

✅ Must-have - nooit meer zonder TypeScript

---

## Styling: Tailwind CSS 3.4

**Gekozen op:** Begin project

### Waarom Tailwind?

✅ **Utility-first = rapid development** - Geen context switching tussen files
✅ **No naming fatigue** - Geen "btn-primary-large-blue" gedoe
✅ **Purge = tiny bundle** - Alleen gebruikte classes shipped
✅ **Dark mode built-in** - `dark:` prefix = trivial implementation
✅ **Responsive utilities** - `md:`, `lg:` = snel responsive layouts
✅ **Consistency** - Design system uit de box (spacing scale, colors)
✅ **No CSS file bloat** - Geen legacy CSS accumulatie

### Not Chosen

- ❌ **Plain CSS/SCSS:** Moeilijk te maintainen, file switching overhead
- ❌ **CSS Modules:** Beter dan plain CSS, maar mist utilities
- ❌ **Styled Components:** Runtime overhead, painful TypeScript setup
- ❌ **Material-UI:** Te opinionated, moeilijk te customen, grote bundle
- ❌ **Chakra UI:** Goede optie, maar Tailwind heeft grotere community

### Trade-offs

⚠️ **HTML looks verbose:** `className="flex items-center justify-between px-4 py-2..."` maar je went hieraan
⚠️ **Learning curve:** Maar 1-2 dagen om productive te worden

**Mitigatie:**
- Gebruik component composition
- Extract herbruikbare components (`Button`, `Card`, etc.)

### Review Status

✅ Fantastisch - nooit meer terug naar plain CSS

---

## State Management: React Context API

**Gekozen op:** Begin project

### Waarom Context API?

✅ **Ingebouwd in React** - Geen extra dependency
✅ **Good enough** - App complexiteit vereist geen Redux
✅ **Simpler mental model** - Provider → Consumer, klaar
✅ **TypeScript friendly** - Easy typing
✅ **Co-located met components** - Geen aparte actions/reducers directory

### Not Chosen

- ❌ **Redux Toolkit:** Overkill - app heeft geen complex global state, geen time-travel debugging nodig
- ❌ **Zustand:** Leuk, maar Context API volstaat
- ❌ **Recoil/Jotai:** Te experimenteel, onzeker long-term support
- ❌ **MobX:** Heavy, less popular dan Redux

### When to Reconsider

Overweeg Redux/Zustand als:
- App groeit naar >20 pages met shared state
- Complexe state synchronisatie nodig tussen modules
- Time-travel debugging waardevol wordt

**Huidige status:** Context API volstaat perfect

### Review Status

✅ Juiste keuze - simpel en effectief

---

## Backend: Firebase (Firestore + Functions + Hosting + Storage)

**Gekozen op:** Begin project

### Waarom Firebase?

✅ **Zero backend code** - Focus op frontend, Firebase handles backend
✅ **Real-time database** - Firestore = live updates zonder polling
✅ **Authentication ingebouwd** - Email/password + social logins out-of-box
✅ **File storage** - Cloud Storage = S3-like zonder AWS complexity
✅ **Serverless functions** - Cloud Functions voor backend logica (invite users, etc.)
✅ **Hosting included** - Deploy met `firebase deploy`, automatic HTTPS
✅ **Generous free tier** - Spark plan = gratis tot aanzienlijk verkeer
✅ **Security Rules** - Declarative security = geen SQL injection risico
✅ **Firebase Admin SDK** - Server-side operations for sensitive logic

### Not Chosen

- ❌ **AWS (Amplify):** Steile leercurve, meer config, moeilijker voor rapid prototyping
- ❌ **Own Node.js + PostgreSQL:** Te veel onderhoud, geen real-time zonder extra werk
- ❌ **Supabase:** Goed alternatief, maar Firebase heeft betere docs + community
- ❌ **MongoDB Atlas + Express:** Meer werk, geen real-time, geen ingebouwde auth
- ❌ **Prisma + tRPC:** Modern stack, maar vereist eigen hosting, no real-time without extra setup

### Trade-offs

⚠️ **Vendor lock-in:** Migreren naar andere backend = major refactor
⚠️ **Cost at scale:** Firebase wordt duur bij hoge traffic (maar monitoring + alerts helpen)
⚠️ **Offline support:** Firestore offline is... okay, niet perfect

**Mitigatie:**
- Abstract Firebase calls in service layer (makkelijker om later te switchen)
- Monitor costs maandelijks
- Set budget alerts in Firebase Console

### Review Status

✅ Perfect voor deze use case - rapid development zonder backend zorgen

---

## Maps: Leaflet (+ Google Maps voor statistieken)

**Gekozen op:** Begin project

### Waarom Leaflet?

✅ **Open source + gratis** - Geen API key billing
✅ **Lightweight** - ~40KB vs Google Maps ~100KB+
✅ **Flexible** - Custom markers, layers, full control
✅ **react-leaflet** - Goede React integration
✅ **OSM tiles** - Gratis kaart data (OpenStreetMap)

### Waarom NIET alleen Leaflet?

❌ **Statistieken heatmaps:** Google Maps heeft betere heatmap support
❌ **Geocoding:** PDOK (Nederlandse API) aanvult Leaflet voor adressen

### Hybrid Approach

**Leaflet voor:**
- Dossier detail kaarten (individueel adres)
- Meldingen/Projecten markers
- Custom overlays

**Google Maps voor:**
- Statistieken pagina (heatmaps)
- Better performance met >100 markers
- Advanced clustering

### Not Chosen (for primary maps)

- ❌ **Google Maps only:** Duur bij veel page loads, overkill voor simpele markers
- ❌ **Mapbox:** Betaald, extra account, Leaflet volstaat

### Trade-offs

⚠️ **Two map libraries:** ~160KB extra bundle (maar lazy loaded per page)
⚠️ **Different APIs:** Developers moeten beide leren

**Mitigatie:**
- Lazy load maps (code splitting)
- Wrapper components abstract away API differences

### Review Status

✅ Juiste hybrid keuze - kost/benefit optimaal

---

## Charts: Apache ECharts

**Gekozen op:** Project mid-development (upgrade from simpler library)

### Waarom ECharts?

✅ **Modern, beautiful charts** - Out-of-box professional look
✅ **Interactieve animaties** - Smooth, engaging UX
✅ **Dark mode support** - Theme system ingebouwd
✅ **Rich chart types** - 20+ types (line, bar, pie, sankey, 3D, etc.)
✅ **Performance** - Canvas rendering = smooth met grote datasets
✅ **echarts-for-react** - Goede React wrapper
✅ **Customizable** - Volledige controle over styling

### Not Chosen

- ❌ **Chart.js:** Simpeler, maar minder modern look, geen 3D
- ❌ **Recharts:** React-first maar minder performant, basic styling
- ❌ **Nivo:** Mooi, maar kleinere community, minder chart types
- ❌ **D3.js:** Te low-level, veel werk voor basic charts
- ❌ **Plotly.js:** Te heavy (~3MB), overkill

### Trade-offs

⚠️ **Bundle size:** ~800KB (minified) - grootste dependency
⚠️ **Leercurve:** Configuration object kan complex zijn

**Mitigatie:**
- Tree-shaking (import only needed chart types)
- Lazy load statistieken page
- Config templates hergebruiken

### Review Status

✅ Upgrade waard - statistieken zien er professional uit

---

## Icons: Lucide React

**Gekozen op:** Begin project

### Waarom Lucide?

✅ **Modern, consistent design** - Fork van Feather Icons (verbeterd)
✅ **Tree-shakeable** - Import only wat je gebruikt
✅ **React components** - `<Icon className="..." />`
✅ **Customizable** - Size, color, stroke via props
✅ **Large library** - 1000+ icons
✅ **TypeScript support** - Uitstekend

### Not Chosen

- ❌ **Font Awesome:** Verouderd, grotere bundle, icon fonts (bad for performance)
- ❌ **Material Icons:** Te gekoppeld aan Material Design aesthetic
- ❌ **Heroicons:** Goed, maar kleinere set, Lucide heeft meer

### Review Status

✅ Perfect - licht, mooi, makkelijk

---

## Routing: React Router v6 (HashRouter)

**Gekozen op:** Begin project

### Waarom React Router?

✅ **Industry standard** - De facto routing library voor React
✅ **v6 improvement** - Cleaner API dan v5
✅ **Nested routes** - Layouts hergebruik
✅ **Hooks** - `useNavigate`, `useParams` intuïtief

### Waarom HashRouter ipv BrowserRouter?

✅ **Firebase Hosting compatibility** - Werkt zonder rewrite config
✅ **Simpeler deployment** - Geen 404 → index.html rewrite nodig
✅ **Hash = client-side only** - Server hoeft niks te weten

**Trade-off:**
⚠️ URLs hebben `#` → `https://app.com/#/dashboard`
⚠️ SEO sub-optimal (maar dit is authenticated app, geen SEO nodig)

### Not Chosen

- ❌ **TanStack Router:** Te nieuw, React Router volstaat
- ❌ **Wouter:** Te minimaal, mist features

### Review Status

✅ Standaard keuze - blijf gebruiken

---

## Form Handling: Manual (geen library)

**Gekozen op:** Begin project

### Waarom geen form library?

✅ **Forms zijn simpel** - Meeste forms zijn 3-5 velden
✅ **useState volstaat** - Geen complexe validatie
✅ **Zero dependencies** - Smaller bundle

### When to Reconsider

Overweeg **React Hook Form** als:
- Forms worden >10 velden
- Complexe validatie logica nodig
- Dynamic form fields met arrays

**Huidige status:** Manual form handling = fine

---

## AI Integration: Google Gemini API

**Gekozen op:** Feature add (2025)

### Waarom Gemini?

✅ **Gratis tier** - 60 requests/min gratis = genoeg voor deze use case
✅ **Low latency** - Sneller dan GPT-3.5 in tests
✅ **Good balance** - Quality vs cost optimaal
✅ **Google Cloud integration** - Zelfde account als Firebase

### Not Chosen

- ❌ **OpenAI (ChatGPT):** Duurder, geen gratis tier
- ❌ **Anthropic (Claude):** Ook betaald, Gemini volstaat
- ❌ **Open source models (Llama):** Requires hosting, extra complexity

### Use Case

Chat feature = vragen over app data, statistieken, help

### Review Status

✅ Goede keuze voor MVP - upgrade mogelijk bij grotere feature set

---

## Testing: Minimal (TODO verbeteren)

**Huidige staat:** Basic manual testing

### Waarom geen test framework (yet)?

⏸️ **Rapid prototyping phase** - Features change snel
⏸️ **Solo development** - Geen team = minder regression risk

### Planned Improvement

**Todo:**
- [ ] Setup Vitest (sneller dan Jest)
- [ ] React Testing Library voor component tests
- [ ] Cypress voor E2E (critical paths)

**Target:**
- Unit tests voor utility functies
- Integration tests voor Context API functions
- E2E tests voor login, create melding, deploy

---

## Deployment: Firebase Hosting

**Gekozen op:** Begin project

### Waarom Firebase Hosting?

✅ **Integrated met Firebase** - Eén platform voor alles
✅ **Auto HTTPS** - Gratis SSL certificates
✅ **CDN included** - Global edge locations
✅ **Easy deploys** - `firebase deploy` = klaar
✅ **Free tier generous** - 10GB storage, 360MB/day transfer
✅ **Custom domain** - Gratis toe te voegen

### Not Chosen

- ❌ **Vercel:** Great voor Next.js, maar Firebase Hosting volstaat + integreert beter met Firestore
- ❌ **Netlify:** Zelfde reden als Vercel
- ❌ **AWS S3 + CloudFront:** Meer config, overkill

### Review Status

✅ Perfect fit - geen reden om te switchen

---

## Summary: Tech Stack Final

```
Frontend:     React 18 + TypeScript 5.6
Build:        Vite 6
Styling:      Tailwind CSS 3.4
State:        React Context API
Backend:      Firebase (Firestore + Functions + Storage + Hosting)
Maps:         Leaflet (+ Google Maps voor statistics)
Charts:       Apache ECharts
Icons:        Lucide React
Routing:      React Router v6 (HashRouter)
AI:           Google Gemini API
Testing:      Manual (TODO: Vitest + RTL)
Deployment:   Firebase Hosting
```

---

## Decision Making Framework (Voor Toekomstige Keuzes)

### Criteria voor Tech Keuzes

1. **Developer Experience** (40%)
   - Snelle development cycle?
   - Goede docs?
   - TypeScript support?

2. **Performance** (25%)
   - Bundle size impact?
   - Runtime performance?

3. **Maintainability** (20%)
   - Mature library?
   - Active development?
   - Breaking changes frequent?

4. **Cost** (15%)
   - Free tier available?
   - Predictable pricing?

### Red Flags (Vermijd)

❌ Unmaintained libraries (>1 jaar geen updates)
❌ Beta/experimental tech voor production
❌ Libraries met <100 GitHub stars (tenzij niche)
❌ Tech met bekende security issues
❌ Proprietary formats zonder exports

---

## Review Schedule

**Quarterly Review:**
Check elke 3 maanden:
- Zijn er betere alternatieven?
- Zijn dependencies up-to-date?
- Zijn er security advisories?

**Annual Deep Dive:**
Per jaar:
- Volledige tech stack evaluatie
- Breaking changes voorbereiden
- Migration paths overwegen

**Next Review:** April 2026

---

Laatst gereviewd: 17 februari 2026
Status: ✅ Alle keuzes nog steeds valide
