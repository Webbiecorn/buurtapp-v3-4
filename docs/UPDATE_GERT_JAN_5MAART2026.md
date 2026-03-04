# BuurtApp — Update overzicht voor Gert Jan
**Datum:** 5 maart 2026

Hieronder vind je een overzicht van alle nieuwe functies en verbeteringen die vandaag zijn doorgevoerd in de BuurtApp. De wijzigingen zijn direct beschikbaar na een herstart/ververs van de app.

---

## 1. Gebruikersactiviteit bijhouden

### Wat is er veranderd?
De app houdt nu automatisch bij wanneer iemand voor het laatst is ingelogd en hoe vaak iemand de app heeft gebruikt.

### Hoe werkt het?
- Elke keer dat een gebruiker de app opent, wordt de datum en tijd opgeslagen als **"laatste activiteit"**
- Er wordt ook een **sessieteller** bijgehouden die elke keer ophoogt

### Waar zie je dit als beheerder?
In **Beheer → Gebruikers** zijn drie nieuwe kolommen toegevoegd aan de gebruikerstabel:

| Kolom                  | Uitleg                                                                                                         |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Organisatie**        | Het bedrijf of de instelling waarbij de gebruiker hoort (zie punt 2)                                           |
| **Laatste activiteit** | Wanneer de gebruiker de app voor het laatst heeft geopend, weergegeven als "3 dagen geleden", "gisteren", etc. |
| **Sessies**            | Het totaal aantal keren dat de gebruiker de app heeft geopend                                                  |

Er is ook een **Actief / Inactief badge** bij elke gebruiker:
- 🟢 **Actief** — gebruiker heeft de app de afgelopen 14 dagen geopend
- 🔴 **Inactief** — gebruiker heeft de app langer dan 14 dagen niet geopend

---

## 2. Organisatie of instelling koppelen aan een gebruiker

### Wat is er veranderd?
Bij het uitnodigen van een nieuwe gebruiker kun je nu ook opgeven bij welk bedrijf of welke instelling diegene hoort.

### Hoe werkt het?
Wanneer je via **Beheer → Gebruikers → Nieuwe gebruiker uitnodigen** een gebruiker aanmaakt, zie je een nieuw (optioneel) veld:
- **Organisatie / instelling** — bijv. "Gemeente Lelystad", "Centrada", "Politie", "Welzijn Lelystad"

Dit wordt opgeslagen bij het gebruikersprofiel en is zichtbaar in de gebruikerstabel.

---

## 3. Viewers bewerktoegang geven per module

### Wat is er veranderd?
Voorheen konden gebruikers met de rol **Viewer** alleen gegevens bekijken, nooit bewerken. Nu kun je per module instellen of een Viewer ook mag bewerken.

### Hoe werkt het?
Bij het uitnodigen van een nieuwe Viewer-gebruiker werkt de module-selectie nu als volgt:

1. Vink de modules aan die de gebruiker mag **zien** (dit werkte al)
2. Per aangevinkte module verschijnt nu een extra optie: **"Mag bewerken"**
3. Zet het vinkje aan om die gebruiker ook bewerkrechten te geven voor die module

**Voorbeeld:** Je kunt een Viewer toegang geven tot alleen de module Achterpaden, maar dan wél met bewerkrechten — zodat diegene registraties kan aanmaken en aanpassen.

> Gebruikers met de rol **Beheerder** of **Conciërge** hebben altijd volledige bewerkrechten en hoeven dit niet ingesteld te krijgen.

---

## 4. Verbeterde uitnodigingsmails (voorbereid)

### Wat is er veranderd?
De uitnodigingsmail die nieuwe gebruikers ontvangen is volledig opnieuw opgebouwd. De nieuwe mail bevat:

- Een persoonlijke begroeting met naam
- Duidelijke accountgegevens (e-mailadres, rol, organisatie)
- Een overzicht van de modules waartoe diegene toegang heeft
- Een grote, duidelijke knop om het account te activeren
- Een nette huisstijl in BuurtApp-blauw

De herinneringsmail (die verstuurd wordt als iemand de uitnodiging nog niet heeft geaccepteerd) is op dezelfde manier opgeknapt en vermeldt ook hoeveel dagen de uitnodiging nog geldig is.

> **Let op:** De e-mails worden momenteel nog niet automatisch verzonden. De inhoud wordt al wel aangemaakt en opgeslagen. Zodra de e-mailkoppeling (Gmail) is ingesteld, gaan de mails automatisch de deur uit. Kevin werkt dit op korte termijn af.

---

## Samenvatting nieuw in één oogopslag

| #   | Nieuwe functie                               | Waar te vinden                                    |
| --- | -------------------------------------------- | ------------------------------------------------- |
| 1   | Laatste activiteit per gebruiker             | Beheer → Gebruikers (kolom "Laatste activiteit")  |
| 2   | Sessieteller per gebruiker                   | Beheer → Gebruikers (kolom "Sessies")             |
| 3   | Actief/Inactief badge                        | Beheer → Gebruikers (naast de naam)               |
| 4   | Organisatieveld bij gebruiker                | Beheer → Gebruikers → Nieuwe gebruiker uitnodigen |
| 5   | Bewerktoegang per module voor Viewers        | Beheer → Gebruikers → Nieuwe gebruiker uitnodigen |
| 6   | Verbeterde uitnodigings- en herinneringsmail | Automatisch (zodra e-mail actief is)              |

---

*Vragen of opmerkingen? Neem contact op met Kevin via Webbiecorn.*
