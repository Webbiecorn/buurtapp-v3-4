# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
    
## Gebruikersbeheer en standaard wachtwoord

- Nieuwe gebruikers die via de Beheerpagina worden aangemaakt, krijgen nu een tijdelijk wachtwoord: `Welkom01`.
- Bij de eerste login wordt de gebruiker gedwongen om het wachtwoord te wijzigen (mustChangePassword).
- In productie wordt optioneel ook een wachtwoord-resetlink gegenereerd voor gemak; inloggen met het tijdelijke wachtwoord blijft mogelijk zolang het niet gewijzigd is.

Let op: deel het tijdelijke wachtwoord alleen veilig met de nieuwe gebruiker en verwijs naar de verplichte wijziging bij de eerste login.
