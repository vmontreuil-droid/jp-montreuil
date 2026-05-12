# Google Business Profile — setup-gids voor Atelier Montreuil

> Doel: bovenaan verschijnen in Google Maps + lokale zoekopdrachten zoals
> "kunstschilder Anzegem", "atelier Anzegem", "portrait cheval Belgique".
>
> Tijd: ~30 minuten. **Gratis.** Veruit de belangrijkste niet-technische
> SEO-actie voor een lokale kunstenaar.

---

## Waarom dit cruciaal is

Wanneer iemand "kunstschilder + lokatie" of "atelier in West-Vlaanderen"
zoekt, toont Google bovenaan een **Maps-blok met 3 lokale resultaten**.
Wie daar verschijnt krijgt 3-5× meer kliks dan de #1-organische
zoekresultaat eronder. Dit blok wordt enkel gevuld door bedrijven met
een **Google Business Profile**.

Geen Business Profile = je bestaat niet voor lokale zoek. Klaar.

---

## Stap 1 — Profiel claimen

1. Ga naar https://business.google.com/create
2. Log in met een **Gmail-account dat je voor altijd zal behouden**
   (bv. niet een werk-account dat je later verliest). Tip: maak speciaal
   `atelier.montreuil@gmail.com` aan als je geen geschikt adres hebt.
3. Bedrijfsnaam: **Atelier Montreuil**
4. Categorie: kies hoofdcategorie **"Artiste"** (of "Galerie d'art" als
   atelier ook open staat voor publiek). Meerdere categorieën mag — voeg
   nadien toe: "Peintre", "Galerie d'art".
5. Adres invoeren:
   ```
   Heuntjesstraat 6
   8570 Anzegem
   België
   ```
   ⚠️ Als JP geen klanten ontvangt: vink **"Ik bezorg klanten op hun
   locatie"** aan en zet "Service area" op **West-Vlaanderen** + buurprovincies.
   Dan blijft het adres privé maar verschijnt hij wel in lokale zoek.
6. Telefoon: `+32 475 61 68 38`
7. Website: `https://montreuil.be`

## Stap 2 — Verificatie

Google stuurt een **kaart met code per post** (5-14 dagen) of biedt
soms video-verificatie aan (telefoon op het adres + omgeving filmen).

- Kies video als beschikbaar → onmiddellijk geverifieerd
- Anders: wacht op de kaart, log in, plak de code

## Stap 3 — Profiel optimaliseren (na verificatie)

### Foto's uploaden (zeer belangrijk voor ranking)

- **Logo** (1024×1024) — uit `/public/logo.png`
- **Cover-foto** (1080×608) — een van JP's beste werken
- **Werken** — minimaal 10 foto's van eigen werk, met titel als bestandsnaam
  (bv. `portrait-cheval-bai-2025.jpg` i.p.v. `IMG_4523.jpg`)
- **Atelier zelf** — 1-2 sfeerfoto's van de werkruimte

> ⚠️ Profielen met **20+ foto's** krijgen 42% meer "verzoek om route"-clicks
> volgens Google's eigen data. Foto's zijn de #1 ranking-factor in Maps.

### Beschrijving (750 tekens max — gebruik ze allemaal)

```
Jean-Pierre Montreuil est un artiste peintre belge basé à Anzegem,
spécialisé dans l'art animalier — chevaux, chiens, portraits et scènes
de chasse. Réalisations sur commande au crayon, à l'aquarelle ou à
l'acrylique. Tirages d'art disponibles en boutique en ligne (papier
fine-art, toile, aluminium, plexiglas) avec livraison dans toute
l'Europe. L'atelier accueille les visiteurs sur rendez-vous.
Visitez le portfolio complet sur montreuil.be.
```

(Vertaal naar NL voor Nederlandstalige bezoekers — Google Business
ondersteunt geen multi-language descriptions, dus kies de taal van je
hoofddoelgroep. Voor Vlaanderen: NL aanbevolen.)

### Diensten toevoegen

Klik "Diensten beheren" → voeg toe (gratis tekstvelden):
- **Portrait sur commande** (description: "Portraits chevaux, chiens et
  humains au crayon, aquarelle ou acrylique")
- **Tirage d'art** ("Disponibles en 4 matériaux et 5 formats")
- **Visite d'atelier** ("Sur rendez-vous")
- **Exposition** ("Voir agenda sur le site")

### Openingsuren

Vul in (al is het "Sur rendez-vous"). Lege uren = lager geranked.

### Posts (gratis micro-blog op je profiel)

Eén post per maand. Onderwerp: nieuwe expo, nieuw werk, technique-tip.
Foto + 1 alinea + link naar montreuil.be. Posten tellen mee voor
"recente activiteit" → beter geranked.

### Q&A

Plaats zelf de eerste vragen + antwoorden (mag, je beantwoordt jezelf
met je business-account):
- "Combien coûte un portrait sur commande ?" → "À partir de 350€,
  voir le configurateur sur montreuil.be/devis"
- "Livraison à l'étranger ?" → "Oui, partout en UE pour les tirages
  d'art."
- "Je peux visiter l'atelier ?" → "Oui, sur rendez-vous via notre
  formulaire de contact."

### Reviews vragen

**De goudmijn**: 5+ reviews met sterren = drastisch hogere ranking.
Vraag aan elke tevreden klant na een commande:

> "Si tu as une minute, ton avis sur Google nous aide énormément :
> https://g.page/r/[code-de-mon-profil]/review"

(De review-link genereer je in je Business dashboard onder "Demander
des avis".)

**Tip**: koppel deze link in de bevestigingsmail van een commande die
JP automatisch stuurt — dat is de moment waarop tevredenheid het hoogst
is.

---

## Stap 4 — Connect met Google Search Console

In Search Console (https://search.google.com/search-console) na de
verification (zie .env.example → `GOOGLE_SITE_VERIFICATION`):
1. Settings → "Bedrijfslocatie" → koppel je Business Profile
2. Dan zie je in Search Console ook "Maps clicks" en "phone calls"

---

## Verwachte resultaat-tijdlijn

| Tijd na claim | Wat je ziet |
|---|---|
| Direct | Profiel zichtbaar voor mensen die "Atelier Montreuil" zoeken |
| 1-2 weken | Verschijnt in Maps voor "kunstschilder Anzegem" |
| 1-3 maanden | Verschijnt voor "schilder West-Vlaanderen" / "artiste peintre Belgique" |
| 6+ maanden | Top-3 als je ≥5 reviews hebt + maandelijks post |

---

## Niet doen

- ❌ Fake reviews kopen (Google detecteert en banned het profiel)
- ❌ Adres veranderen na verificatie zonder reden (re-verificatie nodig)
- ❌ Categorieën spammen (kies max 5 echt relevante)
- ❌ Profiel maken met privé Gmail dat je later kwijt geraakt

---

## Beheer

Eens geactiveerd: 1× per maand inloggen op
https://business.google.com → 1 nieuwe foto + 1 nieuwe post + check of
er reviews te beantwoorden zijn. **5 minuten/maand voor 80% van het
voordeel.**
