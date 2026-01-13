# App Icon Update - Instructies voor Gebruikers

## ✅ De app heeft een nieuw logo!

De Buurtconciërge app heeft nu een nieuw icoon/logo. 

### 🔄 Hoe krijg ik het nieuwe icoon?

**Voor gebruikers die de app al geïnstalleerd hebben:**

De app zelf zal automatisch updaten, maar **het icoon op je beginscherm wordt NIET automatisch bijgewerkt**. Je moet de app opnieuw installeren:

#### 📱 **iOS (iPhone/iPad)**
1. Houd het oude app-icoon ingedrukt op je beginscherm
2. Klik op "App verwijderen" of het minnetje (-)
3. Bevestig verwijderen
4. Open Safari en ga naar: `https://buurtapp-v3-4.web.app`
5. Klik op het deel-icoon (□↑) onderaan
6. Scroll naar beneden en klik op "Zet op beginscherm"
7. Klik op "Voeg toe"
8. ✨ Het nieuwe logo verschijnt nu!

#### 🤖 **Android**
1. Houd het oude app-icoon ingedrukt
2. Sleep naar "Verwijderen" of klik op "Deïnstalleren"
3. Open Chrome en ga naar: `https://buurtapp-v3-4.web.app`
4. Klik op het menu (drie puntjes rechtsboven)
5. Klik op "Installeren" of "App installeren"
6. Bevestig de installatie
7. ✨ Het nieuwe logo verschijnt nu!

#### 💻 **Desktop (Chrome/Edge)**
1. Ga naar `chrome://apps` (of `edge://apps`)
2. Rechtermuisklik op de Buurtconciërge app
3. Klik op "Verwijderen uit Chrome" (of Edge)
4. Ga naar: `https://buurtapp-v3-4.web.app`
5. Klik op het installatie-icoon in de adresbalk (⊕ of ↓)
6. Klik op "Installeren"
7. ✨ Het nieuwe logo verschijnt nu!

---

## 🔧 Technische Details (voor ontwikkelaars)

### Bestanden bijgewerkt:
- ✅ `/public/favicon.svg` - Favicon (browser tab)
- ✅ `/public/icons/icon-192.png` - PWA icon (klein)
- ✅ `/public/icons/icon-512.png` - PWA icon (groot)
- ✅ `/public/apple-touch-icon.png` - iOS home screen icon
- ✅ `/manifest.json` - PWA manifest (verwijst naar icons)
- ✅ `/index.html` - Favicon en icon links

### Waarom updatet het icoon niet automatisch?

PWA (Progressive Web App) icons worden door het besturingssysteem gecached wanneer de app wordt geïnstalleerd. Browser updates (service worker cache) worden wel automatisch bijgewerkt, maar de OS-level shortcut blijft hetzelfde totdat:

1. De gebruiker de app opnieuw installeert, OF
2. De browser cache wordt geleegd EN de app opnieuw wordt geopend (werkt niet altijd)

### Cache busting strategie:

Om nieuwe gebruikers direct het juiste icoon te geven, gebruiken we:
- Unieke bestandsnamen in `manifest.json` (al gedaan)
- Service Worker met juiste cache strategie (al gedaan in `sw.js`)
- Meta tags in `index.html` met juiste verwijzingen (al gedaan)

Bestaande gebruikers moeten handmatig opnieuw installeren voor het nieuwe icoon.
