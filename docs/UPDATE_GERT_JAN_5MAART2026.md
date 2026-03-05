# BuurtApp — Update overzicht voor Gert Jan
**Datum:** 5 maart 2026  
**Laatste update:** 5 maart 2026 (namiddag)

Hieronder vind je een overzicht van alle nieuwe functies en verbeteringen die vandaag zijn doorgevoerd in de BuurtApp. De wijzigingen zijn direct beschikbaar na een herstart/ververs van de app.

---

## 1. Gebruikersactiviteit bijhouden

De app houdt nu automatisch bij wanneer iemand voor het laatst is ingelogd en hoe vaak iemand de app heeft gebruikt.

- Elke keer dat een gebruiker de app opent, wordt de datum en tijd opgeslagen als **"laatste activiteit"**
- Er wordt ook een **sessieteller** bijgehouden die elke keer ophoogt

In **Beheer → Gebruikers** zijn extra kolommen toegevoegd:

| Kolom | Uitleg |
|---|---|
| **Organisatie** | Het bedrijf of de instelling waarbij de gebruiker hoort |
| **Laatste activiteit** | Wanneer de gebruiker de app voor het laatst heeft geopend, bijv. "3 dagen geleden" |
| **Sessies** | Het totaal aantal keren dat de gebruiker de app heeft geopend |

Er is ook een **Actief / Inactief badge** bij elke gebruiker:
- 🟢 **Actief** — gebruiker heeft de app de afgelopen 14 dagen geopend
- 🔴 **Inactief** — gebruiker heeft de app langer dan 14 dagen niet geopend

---

## 2. Organisatie of instelling koppelen aan een gebruiker

Bij het uitnodigen van een nieuwe gebruiker kun je nu ook opgeven bij welk bedrijf of welke instelling diegene hoort — bijv. "Gemeente Lelystad", "Centrada", "Politie". Dit is ook achteraf aan te passen via het gebruikersprofiel (zie punt 5).

---

## 3. Viewers bewerktoegang geven per module

Voorheen konden gebruikers met de rol **Viewer** alleen gegevens bekijken. Nu kun je per module instellen of een Viewer ook mag bewerken.

Bij het uitnodigen (of achteraf bewerken) van een Viewer:

1. Vink de modules aan die de gebruiker mag **zien**
2. Per aangevinkte module verschijnt een extra optie: **"Mag bewerken"**
3. Zet het vinkje aan om ook bewerkrechten te geven voor die module

**Voorbeeld:** Viewer toegang tot alleen Achterpaden, maar wél met bewerkrechten zodat diegene registraties kan aanmaken en aanpassen.

---

## 4. Uitnodigingen nu 7 dagen geldig + herinneringssysteem

Het uitnodigingssysteem is volledig vernieuwd:

- Uitnodigingen zijn nu **7 dagen geldig**
- De status van elke uitnodiging is zichtbaar in **Beheer → Gebruikers → Openstaande uitnodigingen**
- Zodra een uitgenodigde gebruiker voor het eerst inlogt, wordt de uitnodiging automatisch als **geaccepteerd** gemarkeerd

Het systeem controleert elke dag automatisch openstaande uitnodigingen:

| Wanneer | Wat gebeurt er |
|---|---|
| **Na 3 dagen** | Je ontvangt een melding in de app. Via de knop **"Stuur herinnering"** stuur je een verse link. |
| **Na 7 dagen** | De uitnodiging verloopt automatisch. Je ontvangt een melding en kunt een nieuwe sturen. |

**Statusoverzicht in de app:**

| Status | Betekenis |
|---|---|
| ⏳ In afwachting | Uitnodiging verstuurd, nog niet geaccepteerd |
| 📧 Herinnerd | Er is een herinnering verstuurd |
| ✅ Geaccepteerd | Gebruiker heeft ingelogd en is actief |
| ❌ Verlopen | Uitnodiging niet op tijd geaccepteerd — stuur een nieuwe |

---

## 5. Gebruikersprofiel bekijken en bewerken ✨ Nieuw

In **Beheer → Gebruikers** kun je nu op een medewerker klikken om een gedetailleerd profiel te openen.

#### Wat zie je in het profiel?

| Onderdeel | Inhoud |
|---|---|
| **Profieloverzicht** | Naam, e-mailadres, rol, actief/inactief status |
| **Statistieken** | Aantal sessies, tijdstip laatste activiteit |
| **Module-toegang** | Overzicht van alle modules met ✓ of ✗ per module |
| **Bewerkrechten** | Per module of de gebruiker ook mag bewerken (✏️ als dat zo is) |
| **Organisatie** | Het bedrijf of de instelling van de gebruiker |

#### Bewerken via het profiel

Onderin het profiel staan twee knoppen:

- **Verwijderen** — verwijdert de gebruiker na bevestiging
- **Bewerken** — opent een bewerkformulier direct in de popup

In de bewerkweergave kun je aanpassen:

| Wat | Uitleg |
|---|---|
| **Rol** | Wijzig de rol naar Beheerder, Conciërge of Viewer |
| **Organisatie** | Pas het bedrijf of de instelling aan |
| **Module-toegang** | Schakel modules aan of uit voor de gebruiker |
| **Bewerkrechten** | Geef een Viewer per module de mogelijkheid om ook te bewerken |

Wijzigingen worden direct opgeslagen zodra je op **Opslaan** klikt.

---

## 6. Verbeterde uitnodigingsmails

De uitnodigingsmail die nieuwe gebruikers ontvangen is volledig opnieuw opgebouwd. De nieuwe mail bevat:

- Een persoonlijke begroeting met naam
- Duidelijke accountgegevens (e-mailadres, rol, organisatie)
- Een overzicht van de modules waartoe diegene toegang heeft
- Een grote, duidelijke knop om het account te activeren
- Een nette huisstijl in BuurtApp-blauw

> **De e-mails worden automatisch verstuurd** zodra een beheerder een nieuwe gebruiker uitnodigt.

---

## Alles in één oogopslag

| # | Functie | Werkt nu? | Waar te vinden |
|---|---|---|---|
| 1 | Uitnodigingen 7 dagen geldig (was: 1 uur) | ✅ Ja | Automatisch |
| 2 | Automatische herinnering na 3 dagen | ✅ Ja | Beheer → Gebruikers → Openstaande uitnodigingen |
| 3 | Uitnodiging verloopt na 7 dagen met melding | ✅ Ja | Beheer → Gebruikers → Openstaande uitnodigingen |
| 4 | Statusoverzicht openstaande uitnodigingen | ✅ Ja | Beheer → Gebruikers (sectie onderaan) |
| 5 | Laatste activiteit per gebruiker | ✅ Ja | Beheer → Gebruikers (kolom) |
| 6 | Sessieteller per gebruiker | ✅ Ja | Beheer → Gebruikers (kolom) |
| 7 | Actief/Inactief badge | ✅ Ja | Beheer → Gebruikers |
| 8 | Organisatieveld bij gebruiker | ✅ Ja | Beheer → Gebruikers → Uitnodigen / Profiel |
| 9 | Bewerktoegang per module voor Viewers | ✅ Ja | Beheer → Gebruikers → Uitnodigen / Profiel |
| 10 | Verbeterde uitnodigings- en herinneringsmail | ✅ Ja | Automatisch verstuurd bij uitnodiging |
| 11 | Uitnodigen formulier reparatie | ✅ Ja | Automatisch opgelost |
| 12 | Bevestigingsmelding na uitnodigen | ✅ Ja | Rechtsboven in beeld na versturen |
| 13 | Gebruikersprofiel popup (bekijken + bewerken) | ✅ Ja | Beheer → Gebruikers → klik op een medewerker |

---

*Vragen of opmerkingen? Neem contact op met Kevin via Webbiecorn.*
