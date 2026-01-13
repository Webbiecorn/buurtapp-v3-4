# Gemini Model Update

## ✅ Probleem opgelost!

De AI functionaliteiten gebruikten het **experimentele** model `gemini-2.0-flash-exp` wat:
- Niet stabiel is en vaak wordt aangepast/verwijderd door Google
- API key errors kan geven

**Oplossing:** Alle AI functies gebruiken nu het **stabiele** model `gemini-1.5-flash`

---

## 📝 Oude Instructies (niet meer nodig)

~~Je Gemini API key is verlopen!~~

### Stappen om een nieuwe key te krijgen:

1. **Ga naar Google AI Studio:**
   - URL: https://aistudio.google.com/app/apikey

2. **Log in met je Google account**

3. **Klik op "Create API Key"**
   - Of "Get API Key" als je de pagina voor het eerst bezoekt

4. **Kopieer de nieuwe API key**

5. **Plak de key in `.env.local`:**
   ```env
   VITE_GEMINI_API_KEY="JE_NIEUWE_KEY_HIER"
   ```

6. **Herstart de development server** (als je lokaal werkt)

7. **Build en deploy opnieuw:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## ✅ Na het vernieuwen werken weer:
- AI Dagelijkse Samenvatting op Dashboard
- AI Insights in Statistieken pagina
- AI Chat functionaliteit

## 📝 Huidige status:
- ❌ API Key: `AIzaSyDd9JanhJColMXXc2hAi--X2NBoMPL_KgA` (EXPIRED)
- 📍 Locatie: `/home/kevin/Projecten/buurtapp-v3-4/.env.local` (regel 9)
- 📍 Locatie: `/home/kevin/Projecten/buurtapp-v3-4/.env` (regel 19)

## 🔒 Beveiligingstip:
Gebruik altijd `.env.local` voor je API keys, nooit `.env` (die wordt gecommit naar Git).
