# Google Maps API Key Setup

## Probleem
`InvalidKeyMapError` betekent dat de API key niet correct is geconfigureerd voor gebruik op het domein `buurtapp-v3-4.web.app`.

## Oplossing

### Stap 1: Ga naar Google Cloud Console
1. Open [Google Cloud Console - API Credentials](https://console.cloud.google.com/apis/credentials?project=buurtapp-v3-4)
2. Zoek naar de API key: `AIzaSyD5CTJmcJ2OVK5OSoUJz78oBSBwt9tM0SU`

### Stap 2: Configureer HTTP Referrers
1. Klik op de key om te bewerken
2. Bij **"Application restrictions"** selecteer: **"HTTP referrers (web sites)"**
3. Voeg de volgende referrers toe:
   ```
   buurtapp-v3-4.web.app/*
   buurtapp-v3-4.firebaseapp.com/*
   *.buurtapp-v3-4.web.app/*
   localhost:*
   127.0.0.1:*
   ```

### Stap 3: Configureer API Restrictions
1. Bij **"API restrictions"** selecteer: **"Restrict key"**
2. Selecteer deze APIs:
   - ✅ Maps JavaScript API
   - ✅ Geocoding API
   - ✅ Places API (optional, voor address lookup)

### Stap 4: Save en wacht
1. Klik op **"Save"**
2. ⚠️ **Wacht 5-10 minuten** voor de changes actief worden
3. Clear browser cache en test opnieuw

## Alternatief: Nieuwe key aanmaken

Als de bestaande key problemen blijft geven:

1. Ga naar [API Credentials](https://console.cloud.google.com/apis/credentials)
2. Klik op **"+ CREATE CREDENTIALS"** → **"API Key"**
3. Kopieer de nieuwe key
4. Klik op **"RESTRICT KEY"**
5. Volg Stap 2 en 3 hierboven
6. Update `.env` met de nieuwe key:
   ```bash
   VITE_GOOGLE_MAPS_API_KEY=NIEUWE_KEY_HIER
   ```
7. Rebuild en redeploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## Veelvoorkomende fouten

### InvalidKeyMapError
- **Oorzaak**: Domein niet toegevoegd aan HTTP referrers
- **Oplossing**: Voeg `buurtapp-v3-4.web.app/*` toe aan referrers

### RefererNotAllowedMapError
- **Oorzaak**: Verkeerde referrer pattern
- **Oplossing**: Gebruik `domain.com/*` (met trailing /*)

### API not enabled
- **Oorzaak**: Maps JavaScript API niet geactiveerd
- **Oplossing**: Ga naar [API Library](https://console.cloud.google.com/apis/library) en enable "Maps JavaScript API"

## Test na configuratie

1. Hard refresh browser: `Ctrl + Shift + R`
2. Open Developer Console (F12)
3. Check voor errors in Console tab
4. Navigeer naar Achterpaden → Kaart Overzicht
5. Map moet nu correct laden

## Huidige configuratie

**Project ID**: buurtapp-v3-4
**API Key**: AIzaSyD5CTJmcJ2OVK5OSoUJz78oBSBwt9tM0SU
**Hosting URL**: https://buurtapp-v3-4.web.app
**Gemini Key**: AIzaSyDd9JanhJColMXXc2hAi--X2NBoMPL_KgA (apart key voor AI)
