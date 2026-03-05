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

## 4. Uitnodigingen nu 7 dagen geldig (was: 1 uur)

### Wat was het probleem?
Voordat deze update werd doorgevoerd, was een uitnodigingslink maar **1 uur geldig**. Als een nieuwe gebruiker de mail niet snel genoeg opende, was de link al verlopen en moest de beheerder een nieuwe uitnodiging sturen — zonder dat iemand wist dat dit nodig was.

### Wat is er veranderd?
Het uitnodigingssysteem is volledig vernieuwd:

- Uitnodigingen zijn nu **7 dagen geldig**
- De status van elke uitnodiging is zichtbaar in **Beheer → Gebruikers → Openstaande uitnodigingen**
- Zodra een uitgenodigde gebruiker voor het eerst inlogt, wordt de uitnodiging automatisch als **geaccepteerd** gemarkeerd

### Automatische herinneringen

Het systeem controleert elke dag automatisch openstaande uitnodigingen:

| Wanneer        | Wat gebeurt er                                                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Na 3 dagen** | Je ontvangt een melding in de app dat de uitnodiging nog niet is geaccepteerd. Je kunt dan via de knop **"Stuur herinnering"** een verse link sturen. |
| **Na 7 dagen** | De uitnodiging verloopt automatisch. Je ontvangt een melding in de app. Je kunt dan een nieuwe uitnodiging sturen.                                    |

### Statusoverzicht in de app

In **Beheer → Gebruikers** zie je onder de gebruikerstabel een sectie **"Openstaande uitnodigingen"** met de volgende statussen:

| Status          | Betekenis                                                |
| --------------- | -------------------------------------------------------- |
| ⏳ In afwachting | Uitnodiging verstuurd, nog niet geaccepteerd             |
| 📧 Herinnerd     | Er is een herinnering verstuurd                          |
| ✅ Geaccepteerd  | Gebruiker heeft ingelogd en is actief                    |
| ❌ Verlopen      | Uitnodiging niet op tijd geaccepteerd — stuur een nieuwe |

---

## 5. Verbeterde uitnodigingsmails

### Wat is er veranderd?
De uitnodigingsmail die nieuwe gebruikers ontvangen is volledig opnieuw opgebouwd. De nieuwe mail bevat:

- Een persoonlijke begroeting met naam
- Duidelijke accountgegevens (e-mailadres, rol, organisatie)
- Een overzicht van de modules waartoe diegene toegang heeft
- Een grote, duidelijke knop om het account te activeren
- Een nette huisstijl in BuurtApp-blauw

De herinneringsmail (die verstuurd wordt als iemand de uitnodiging nog niet heeft geaccepteerd) is op dezelfde manier opgeknapt en vermeldt ook hoeveel dagen de uitnodiging nog geldig is.

> **De e-mails worden nu automatisch verstuurd** zodra een beheerder een nieuwe gebruiker uitnodigt.

---

## Samenvatting nieuw in één oogopslag

| #   | Nieuwe functie                               | Werkt nu? | Waar te vinden                                    |
| --- | -------------------------------------------- | --------- | ------------------------------------------------- |
| 1   | Uitnodigingen 7 dagen geldig (was: 1 uur)    | ✅ Ja      | Automatisch                                       |
| 2   | Automatische herinnering na 3 dagen          | ✅ Ja      | Beheer → Gebruikers → Openstaande uitnodigingen   |
| 3   | Uitnodiging verloopt na 7 dagen met melding  | ✅ Ja      | Beheer → Gebruikers → Openstaande uitnodigingen   |
| 4   | Statusoverzicht openstaande uitnodigingen    | ✅ Ja      | Beheer → Gebruikers (sectie onderaan)             |
| 5   | Laatste activiteit per gebruiker             | ✅ Ja      | Beheer → Gebruikers (kolom "Laatste activiteit")  |
| 6   | Sessieteller per gebruiker                   | ✅ Ja      | Beheer → Gebruikers (kolom "Sessies")             |
| 7   | Actief/Inactief badge                        | ✅ Ja      | Beheer → Gebruikers (naast de naam)               |
| 8   | Organisatieveld bij gebruiker                | ✅ Ja      | Beheer → Gebruikers → Nieuwe gebruiker uitnodigen |
| 9   | Bewerktoegang per module voor Viewers        | ✅ Ja      | Beheer → Gebruikers → Nieuwe gebruiker uitnodigen |
| 10  | Verbeterde uitnodigings- en herinneringsmail | ✅ Ja      | Automatisch verstuurd bij uitnodiging             |

---

*Vragen of opmerkingen? Neem contact op met Kevin via Webbiecorn.*
