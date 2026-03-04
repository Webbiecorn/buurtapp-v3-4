# Gmail e-mail activeren voor uitnodigingen

> Stap-voor-stap instructies om automatische e-mails te activeren voor:
> - **Uitnodigingsmail** — verstuurd zodra een beheerder een nieuwe gebruiker uitnodigt
> - **Herinnering** — verstuurd als een uitnodiging 3 dagen niet is geaccepteerd
> - **Verlopen melding** — verstuurd aan de beheerder als een uitnodiging na 7 dagen verloopt

---

## Vereisten

- Een Gmail-account dat als verzendadres wordt gebruikt (bijv. `info@jouworganisatie.nl` of een `@gmail.com`)
- **2-staps verificatie** ingeschakeld op dat Google-account (verplicht voor App-wachtwoorden)
- Firebase CLI geïnstalleerd en ingelogd (`firebase login`)
- Toegang tot het Firebase-project `buurtapp-v3-4`

---

## Stap 1 — Gmail App-wachtwoord aanmaken

Een App-wachtwoord is een apart 16-cijferig wachtwoord speciaal voor apps. Je gebruikt **niet** je gewone Google-inlogwachtwoord.

1. Ga naar [https://myaccount.google.com/security](https://myaccount.google.com/security)
2. Controleer of **2-staps verificatie** aanstaat — zo niet, stel dit eerst in
3. Ga naar [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
4. Kies bij **App selecteren**: "Andere (eigen naam)" → typ `BuurtApp`
5. Klik **Genereren**
6. Kopieer het wachtwoord dat verschijnt (bijv. `abcd efgh ijkl mnop`)

> ⚠️ Je ziet dit wachtwoord maar **één keer** — bewaar het direct op een veilige plek.

---

## Stap 2 — Secrets instellen in Firebase

Firebase Secrets worden beveiligd opgeslagen in de Firebase-omgeving — **niet** in `.env.local`.

Open een terminal in de projectmap en voer achtereenvolgens uit:

```bash
firebase functions:secrets:set GMAIL_USER
```
Voer in: het volledige Gmail-adres (bijv. `info@jouworganisatie.nl`)

```bash
firebase functions:secrets:set GMAIL_APP_PASSWORD
```
Voer in: het 16-cijferige App-wachtwoord **zonder spaties** (bijv. `abcdefghijklmnop`)

Controleer of de secrets zijn opgeslagen:
```bash
firebase functions:secrets:list
```
Je ziet dan `GMAIL_USER` en `GMAIL_APP_PASSWORD` in de lijst.

---

## Stap 3 — Nodemailer installeren

```bash
cd functions
npm install nodemailer @types/nodemailer
```

---

## Stap 4 — Code activeren in `sendWelcomeEmail.ts`

Open `functions/src/sendWelcomeEmail.ts`.

### 4a — Import bovenaan toevoegen

Voeg bovenaan het bestand toe (na de bestaande imports):

```typescript
import nodemailer from 'nodemailer';
```

### 4b — APP_NAME toevoegen (als dat er nog niet staat)

Controleer of bovenaan de constante `APP_NAME` aanwezig is. Als niet, voeg toe:

```typescript
const APP_NAME = 'BuurtApp Lelystad';
```

### 4c — Nodemailer-blok uncomment

Zoek het blok dat begint met:
```
// ── NODEMAILER (activeren zodra GMAIL_USER + GMAIL_APP_PASSWORD beschikbaar zijn) ──
```

Verwijder de `//` voor de relevante regels zodat het er zo uitziet:

```typescript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
await transporter.sendMail({
  from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
  to: userData.email,
  subject: emailSubject,
  html: emailHtml,
});
logger.info(`✅ Uitnodigingsmail verzonden naar ${userData.email}`);
```

> De `emailHtml` en `emailSubject` worden al vóór dit blok opgebouwd via `buildInviteEmailHtml()` — die code blijft staan zoals die is.

---

## Stap 5 — Code activeren in `checkExpiredInvites.ts`

Open `functions/src/checkExpiredInvites.ts`.

### 5a — Import bovenaan activeren

Zoek bovenaan het bestand de gecommente importregel:
```typescript
// import { buildReminderEmailHtml, buildReminderEmailSubject } from "./emailTemplates";
```

Verwijder de `//`:
```typescript
import { buildReminderEmailHtml, buildReminderEmailSubject } from "./emailTemplates";
```

Voeg ook nodemailer toe (bovenaan, na de bestaande imports):
```typescript
import nodemailer from "nodemailer";
```

### 5b — Transporter aanmaken (één keer, buiten de for-loops)

Voeg dit toe vóór de `for`-lussen (na de `expiredSnap`-query):

```typescript
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
```

### 5c — Herinnerings-mail uncomment (sectie A)

Zoek het blok:
```
// A) Stuur herinnering bij reminderDue (gebruik buildReminderEmailHtml):
```

Verwijder de `//` voor de regels die de mail versturen:

```typescript
const daysLeft = 7 - Math.floor((Date.now() - invite.invitedAt.toMillis()) / (1000 * 60 * 60 * 24));
const freshResetLink = "https://buurtapp-v3-4.web.app/#/set-password";
await transporter.sendMail({
  from: `"Buurtconciërge App" <${process.env.GMAIL_USER}>`,
  to: invite.email,
  subject: buildReminderEmailSubject(),
  html: buildReminderEmailHtml({
    name: invite.name,
    email: invite.email,
    role: invite.role,
    freshPasswordResetLink: freshResetLink,
    daysLeft: Math.max(0, daysLeft),
  }),
});
```

### 5d — Verlopen-mail uncomment (sectie B)

Zoek het blok:
```
// B) Stuur mail bij verlopen uitnodiging:
```

Verwijder de `//`:

```typescript
await transporter.sendMail({
  from: `"Buurtconciërge App" <${process.env.GMAIL_USER}>`,
  to: invite.invitedByEmail,
  subject: `Uitnodiging verlopen — ${invite.name}`,
  html: `<p>De uitnodiging voor <strong>${invite.name}</strong> (${invite.email}) is verlopen.</p>
         <p><a href="https://buurtapp-v3-4.web.app/#/admin?tab=users">Stuur een nieuwe uitnodiging →</a></p>`,
});
```

---

## Stap 6 — Bouwen en deployen

```bash
# In de functions/ map
cd functions
npm run build

# Terug naar projectroot, dan deployen
cd ..
firebase deploy --only functions
```

---

## Stap 7 — Testen

1. Ga naar de app → **Beheer** → **Gebruikers**
2. Nodig een testgebruiker uit (gebruik je eigen e-mailadres)
3. Controleer de inbox — de uitnodigingsmail zou binnen ~30 seconden moeten aankomen
4. Controleer Firebase Console → **Functions** → **Logs** voor eventuele fouten

---

## Problemen oplossen

| Probleem | Oorzaak | Oplossing |
|---|---|---|
| `Error: Invalid login` | Verkeerd wachtwoord of geen App-wachtwoord | Controleer of je `GMAIL_APP_PASSWORD` het gegenereerde App-wachtwoord is, niet je gewone wachtwoord |
| `Error: Less secure app access` | Gmail blokkeert inlog zonder App-wachtwoord | Gebruik altijd een App-wachtwoord, niet het gewone wachtwoord |
| `GMAIL_USER is not defined` | Secret niet goed ingesteld | Voer `firebase functions:secrets:list` uit en controleer de namen exact |
| Mail komt niet aan | Spam-filter | Controleer de spam-map; voeg het verzendadres toe aan contacten |
| Functions build mislukt | Nodemailer niet geïnstalleerd | Controleer of `npm install nodemailer @types/nodemailer` is uitgevoerd in de `functions/` map |

---

*Aangemaakt door: GitHub Copilot | 5 maart 2026*
