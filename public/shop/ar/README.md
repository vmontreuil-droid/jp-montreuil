# AR Quick Look — USDZ + GLB bestanden

De AR-knop op de fotodetail-pagina (`/shop/boutique/photo/[slug]`)
verwacht modelbestanden in deze map met de naamconventie:

```
{material-slug}-{size-key}.usdz   ← iOS Quick Look
{material-slug}-{size-key}.glb    ← Android Scene Viewer
```

## Naamgeving

`material-slug` komt uit `shop.print_media.slug` (canvas, fine_art,
aluminum, plexi). `size-key` is het size-label zonder spaties of cm,
met `×` als `x`. Voorbeelden:

- `S — 30×45 cm`  → `s30x45`
- `M — 50×75 cm`  → `m50x75`
- `XXL — 90×135 cm` → `xxl90x135`

Dus voor canvas in M-formaat: `canvas-m50x75.usdz` en
`canvas-m50x75.glb`.

## Hoe genereer je deze?

**USDZ (iOS):**
- Met **Reality Composer Pro** op een Mac: importeer een rechthoek-mesh,
  hang er de foto-textuur op, exporteer als `.usdz`.
- Of online via `usdzconvert` (Apple SDK) vanuit een glTF.

**GLB (Android):**
- Met **Blender**: maak een rechthoek met de juiste afmetingen, voeg
  de foto toe als albedo-texture, exporteer als `.glb`.

## Templates

Eén template per material × oriëntatie volstaat — de foto kun je
dynamisch swappen door de texture te updaten. Voor nu: één bestand per
unieke combinatie material × size.

## Fallback

Als een bestand ontbreekt geeft de browser een 404. Dat lijkt voor de
gebruiker op "AR niet beschikbaar voor deze combinatie". Later kunnen
we een HEAD-request doen om de knop alleen te tonen wanneer het
bestand bestaat.
