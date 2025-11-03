# Firebase Email Configuratie voor Gebruikersuitnodigingen

## Probleem dat is opgelost
Voorheen werd geprobeerd om vanuit de client-side een wachtwoord reset email te versturen direct na het aanmaken van een gebruiker in de Cloud Function. Dit leidde tot een **race condition** waarbij de email faalde met de foutmelding `auth/user-not-found` omdat de client-side Firebase Auth instance nog geen kennis had van de nieuwe gebruiker.

## Oplossing
De email functionaliteit is verplaatst naar de Cloud Function `inviteUser`. Deze genereert nu server-side een wachtwoord reset link direct nadat de gebruiker is aangemaakt, waardoor de timing problemen zijn opgelost.

## Firebase Email Templates Configuratie

Om ervoor te zorgen dat nieuwe gebruikers daadwerkelijk een email ontvangen, moet je de Firebase Email Templates configureren in de Firebase Console:

### Stap 1: Open Firebase Console
1. Ga naar [Firebase Console](https://console.firebase.google.com/)
2. Selecteer je project: **buurtapp-v3-4**

### Stap 2: Ga naar Authentication Templates
1. Klik in het linker menu op **Authentication**
2. Klik op het tabblad **Templates** (bovenaan)
3. Zoek het template voor **Password reset** / **Wachtwoord opnieuw instellen**

### Stap 3: Configureer het Email Template
1. Klik op het **potlood icoon** (edit) bij "Password reset"
2. Pas de volgende velden aan:

#### Afzender naam (optioneel)
```
Buurtapp Team
```

#### Reply-to email (optioneel)
```
noreply@buurtapp.nl
```

#### Onderwerp
```
Welkom bij Buurtapp - Stel je wachtwoord in
```

#### Email body (HTML)
Je kan de standaard template gebruiken of een custom template maken. Voorbeeld:

```html
<p>Hallo %DISPLAY_NAME%,</p>

<p>Je bent uitgenodigd om lid te worden van de Buurtapp!</p>

<p>Klik op onderstaande link om een wachtwoord in te stellen:</p>

<a href="%LINK%">Wachtwoord instellen</a>

<p>Als deze knop niet werkt, kopieer dan deze link en plak deze in je browser:</p>
<p>%LINK%</p>

<p>Deze link is 1 uur geldig.</p>

<p>Met vriendelijke groet,<br>
Het Buurtapp Team</p>
```

### Stap 4: Sla de wijzigingen op
Klik op **Save** / **Opslaan**

### Stap 5: Test de configuratie
1. Log in als Beheerder in de app
2. Ga naar de Admin pagina
3. Klik op "Nieuwe Gebruiker Toevoegen"
4. Vul de gegevens in en verstuur
5. Controleer of de nieuwe gebruiker een email ontvangt

## Alternatieve oplossingen (indien Firebase Email niet werkt)

### Optie A: SendGrid / Mailgun / andere email service
Als je de Firebase Email Templates niet wilt gebruiken of als ze niet werken in je setup, kun je een externe email service integreren:

1. Installeer een email service (bijvoorbeeld SendGrid)
2. Voeg de API key toe aan Firebase Functions environment variables
3. Update de `inviteUser` Cloud Function om de email via de externe service te versturen

### Optie B: Handmatige link delen
Als laatste optie kun je de `passwordResetLink` die wordt geretourneerd door de Cloud Function tonen aan de beheerder, die deze dan handmatig kan delen met de nieuwe gebruiker via WhatsApp, SMS, etc.

## Emulator Mode
In emulator mode worden geen emails verstuurd. De gebruiker kan inloggen met:
- **Email**: het opgegeven email adres
- **Wachtwoord**: `Welkom01`

## Troubleshooting

### Email wordt niet ontvangen
1. **Check spam folder** - Firebase emails komen soms in spam terecht
2. **Controleer Firebase Console Logs** - Ga naar Functions > Logs om te zien of de email functie fouten geeft
3. **Verify Domain** (productie) - Voor productie moet je mogelijk je domein verifiëren in Firebase Console
4. **Check Firebase Quota** - Firebase heeft limieten op het aantal emails per dag

### Error: "auth/user-not-found"
Dit probleem is opgelost door de email functionaliteit naar de Cloud Function te verplaatsen. Als je deze fout nog steeds ziet, check dan of je de nieuwste versie van de Cloud Function hebt gedeployed.

### Email template wordt niet toegepast
Zorg ervoor dat je op "Save" hebt geklikt na het bewerken van het template in de Firebase Console.

## Code wijzigingen

### functions/src/inviteUser.ts
- Genereert nu `passwordResetLink` met `generatePasswordResetLink()`
- Returned `emailSent` status naar de client
- Loggt de reset link voor debugging

### src/pages/AdminPage.tsx
- Verwijderd: client-side `sendInvitationEmail()` call
- Vertrouwt nu op de Cloud Function voor email verzending
- Toont het bericht dat van de Cloud Function terugkomt

### src/services/emailService.ts
- Kan verwijderd worden of bewaard worden voor toekomstige custom email functionaliteit

## Deployment
Vergeet niet om de Cloud Functions te deployen na deze wijzigingen:

```bash
npm run build
firebase deploy --only functions
```

Of deploy alles:
```bash
npm run deploy
```
