# Refonte Convertisseur de fichiers — Prompts pour Claude Code

> Exécuter chaque prompt séparément, dans l'ordre. Chaque prompt est autonome mais s'appuie sur les modifications du précédent.
>
> Contexte : comparé aux références du secteur (iLovePDF, Smallpdf, CloudConvert), notre Convertisseur n'a que 3 outils (Convertir, Fusionner, Séparer) contre une dizaine chez les concurrents, et son UX garde un seul résultat à la fois, écrasé à chaque nouvelle action — au lieu d'un fil de résultats cumulés comme sur Posts réseaux sociaux. Ces prompts corrigent les deux à la fois.
>
> Contrainte technique commune à tous les prompts backend : n'installe AUCUN nouveau binaire système (pas de nouvelle ligne apt-get dans le Dockerfile). On vient de perdre du temps à cause de LibreOffice mal installé sur Railway — les nouvelles fonctions doivent rester en bibliothèques Python pures (pypdf, pikepdf) déjà ou facilement installables via pip.

---

## Prompt 1 — Créer le composant ConversionResultCard

```
Dans components/tools/, crée un composant ConversionResultCard.tsx.

Affiche le résultat d'une opération (conversion, compression, fusion, séparation, organisation, protection) dans un fil de résultats cumulés — remplace l'actuel bloc isolé "Télécharger X".

Props :
- filename: string
- sizeLabel?: string (ex: "1.2 Mo")
- compressionInfo?: string (ex: "1.2 Mo → 340 Ko (-72%)", affiché à la place de sizeLabel si présent)
- url: string (lien de téléchargement signé)
- onDelete: () => void

Design :
- Card rounded-[12px] border bg-white p-3, flex items-center gap-3, shadow-sm
- Icône FileText (lucide-react) à gauche, size-5, text-muted-foreground
- Nom de fichier tronqué (truncate, font-medium) + sizeLabel/compressionInfo en dessous, text-xs text-muted-foreground
- Bouton "Télécharger" à droite : <a href={url} download target="_blank" rel="noreferrer"> enveloppant un Button variant outline size sm avec icône Download
- Bouton supprimer (Trash2, icon-sm, variant ghost, hover:bg-destructive/10 hover:text-destructive) qui appelle onDelete — ne fait qu'un retrait local, aucun appel API
- Apparition avec animate-in fade-in slide-in-from-bottom-1 duration-200

Reprends les conventions de style de SocialPostCard.tsx et ChatMessage.tsx (cn(), shadcn/ui).
```

---

## Prompt 2 — Fil de résultats cumulés + fichiers multiples sur l'onglet Convertir

```
Refonds ConvertTab dans frontend/src/app/(dashboard)/tools/converter/page.tsx.

Problème actuel : un seul fichier à la fois (files[0]), un seul résultat en state, écrasé à chaque conversion suivante.

Nouveau comportement :
1. Le DropZone accepte plusieurs fichiers (multiple), sans restriction accept (comme avant).
2. Chaque fichier ajouté apparaît dans une liste "à convertir" (comme dans MergeTab) : nom, taille, un Select de format de sortie propre à CE fichier (reprends outputFormatsFor(f.name)), un bouton retirer (avant conversion).
3. Un seul bouton "Convertir" convertit tous les fichiers de la liste, séquentiellement (un appel API à la fois, pas en parallèle, pour ne pas surcharger LibreOffice côté serveur).
4. Chaque conversion terminée : le fichier quitte la liste "à convertir" et une ConversionResultCard (prompt précédent) est ajoutée à un fil de résultats cumulé (state results: Array<{id: string, filename: string, url: string}>, affiché sous le bouton). Les résultats restent visibles/téléchargeables tant qu'on ne les supprime pas individuellement.
5. Si un fichier échoue, affiche un toast d'erreur pour ce fichier précis et continue avec les suivants (n'interrompt pas le lot).
6. Pendant qu'un fichier est en cours de traitement, affiche un état visuel (spinner) sur sa ligne dans la liste "à convertir".

NE MODIFIE PAS l'endpoint backend /api/v1/tools/converter/convert (un appel par fichier, comme actuellement).
```

---

## Prompt 3 — Backend : compression PDF

```
Ajoute la compression PDF dans backend/app/core/file_converter/converter.py et backend/app/api/v1/tools/converter.py.

Ajoute `pikepdf` à requirements.txt (bibliothèque pip pure, pas de dépendance système supplémentaire — n'ajoute rien au Dockerfile).

1. Dans converter.py (core) :
   fonction compress_pdf(input_path: Path, output_path: Path, level: Literal["leger", "fort"] = "leger") -> Path
   - Ouvre avec pikepdf.open(), sauvegarde avec compress_streams=True
   - Si level == "fort" : ouvre aussi les images internes du PDF et les downsample (Pillow) si leur largeur dépasse ~1500px, avant réinjection
   - ConversionError si le fichier est corrompu ou protégé par mot de passe

2. Nouvelle route POST /api/v1/tools/converter/compress
   - file (PDF uniquement) + query param level (défaut "leger")
   - Même pattern que /convert (tempdir, validate_upload, _publish)
   - Retourne { url, filename, size_before, size_after } (tailles en octets, pour affichage frontend)
```

---

## Prompt 4 — Frontend : onglet Compresser

```
Dans frontend/src/app/(dashboard)/tools/converter/page.tsx, ajoute un onglet "Compresser" (CompressTab) entre "Convertir" et "Fusionner PDF".

1. DropZone accept="application/pdf", multiple — même logique de fil de résultats cumulés que ConvertTab (réutilise ConversionResultCard).
2. Pour chaque fichier de la liste : un Select "Compression" (Légère / Forte) à la place du Select de format.
3. Bouton "Compresser" (icône Minimize2, lucide-react).
4. Utilise la prop compressionInfo de ConversionResultCard pour afficher le gain ("1.2 Mo → 340 Ko (-72%)"), calculé à partir de size_before/size_after retournés par l'API.

Ajoute l'onglet dans le TabsList de ConverterPage.
```

---

## Prompt 5 — Backend : organiser les pages d'un PDF (réordonner, pivoter, supprimer)

```
Ajoute l'organisation de pages dans backend/app/core/file_converter/converter.py et backend/app/api/v1/tools/converter.py. Utilise pypdf (déjà une dépendance) — pas de nouveau binaire.

1. Dans converter.py (core) :
   fonction organize_pdf(input_path: Path, operations: list[dict], output_path: Path) -> Path
   - operations : liste ordonnée [{"page": int (index 0-based dans le PDF original), "rotate": int (0/90/180/270)}]
   - Les pages du PDF original absentes de operations sont supprimées du résultat
   - L'ordre du tableau operations détermine l'ordre des pages en sortie
   - Valide que chaque "page" existe, sinon ConversionError

2. Nouvelle route POST /api/v1/tools/converter/organize
   - file (PDF) + un champ Form "operations" (JSON stringifié, puisque c'est un multipart avec fichier)
   - Même pattern que les autres routes (tempdir, validate_upload, _publish)
```

---

## Prompt 6 — Frontend : onglet Organiser les pages

```
Dans frontend/src/app/(dashboard)/tools/converter/page.tsx, ajoute un onglet "Organiser" (OrganizeTab) après "Séparer PDF".

1. DropZone accept="application/pdf", un seul fichier.
2. Une fois le fichier chargé, rends une vignette par page avec react-pdf (déjà une dépendance du projet — regarde components/tools/PdfViewer.tsx pour la convention d'usage existante : configuration du worker, <Document>/<Page>). Chaque vignette : petite taille (ex. width=100), dans une grille flex-wrap gap-3.
3. Chaque vignette :
   - Draggable pour réordonner (même pattern drag&drop que MergeTab, avec dragIndex.current)
   - Bouton pivoter en overlay coin haut droit (RotateCw, lucide-react) : incrémente la rotation de 90° à chaque clic, applique une transformation CSS rotate() sur la vignette pour prévisualiser
   - Bouton supprimer en overlay coin haut gauche (X, lucide-react) : retire cette page de la liste locale
4. Bouton "Appliquer" : envoie le fichier + la liste operations (ordre actuel des vignettes, avec leur rotation respective) à /api/v1/tools/converter/organize.
5. Résultat affiché via ConversionResultCard dans un fil cumulé (même pattern que les autres onglets).
```

---

## Prompt 7 — Backend : protéger / déverrouiller un PDF par mot de passe

```
Ajoute la protection/déverrouillage par mot de passe dans backend/app/core/file_converter/converter.py et backend/app/api/v1/tools/converter.py. Utilise pypdf (déjà une dépendance) — pas de nouveau binaire.

1. Dans converter.py (core) :
   - protect_pdf(input_path: Path, password: str, output_path: Path) -> Path : PdfReader + PdfWriter.encrypt(password)
   - unlock_pdf(input_path: Path, password: str, output_path: Path) -> Path : PdfReader(input_path, password=password) (erreur explicite si mot de passe incorrect ou fichier non protégé), réécrit sans chiffrement via PdfWriter

2. Deux nouvelles routes, même pattern que les autres :
   - POST /api/v1/tools/converter/protect (file + query param password)
   - POST /api/v1/tools/converter/unlock (file + query param password) — si mot de passe incorrect, 400 avec message clair ("Mot de passe incorrect.")
```

---

## Prompt 8 — Frontend : onglet Protéger / Déverrouiller

```
Dans frontend/src/app/(dashboard)/tools/converter/page.tsx, ajoute un onglet "Protéger" (ProtectTab) après "Organiser".

1. Deux boutons toggle (ou sous-Tabs) : "Ajouter un mot de passe" / "Retirer un mot de passe".
2. DropZone accept="application/pdf", un seul fichier.
3. Input type="password" pour le mot de passe.
4. Bouton "Protéger" ou "Déverrouiller" selon le mode actif (icônes Lock / Unlock, lucide-react).
5. Résultat affiché via ConversionResultCard dans un fil cumulé.
6. Si mot de passe incorrect au déverrouillage, toast d'erreur clair.
```

---

## Prompt 9 — Retirer le titre et sous-titre redondants du ToolLayout

```
Dans frontend/src/app/(dashboard)/tools/converter/page.tsx, retire les props title et description du <ToolLayout> (déjà affichés par la sidebar de navigation — redondant, comme corrigé précédemment sur Posts réseaux sociaux). Garde uniquement le badge "Gratuit et illimité".

ToolLayout accepte déjà title/description en optionnel suite à une modification précédente — vérifie juste que rien ne casse sur les autres pages qui les utilisent encore.
```

---

## Prompt 10 — Persistance de session + polish responsive

```
Sur toute la page frontend/src/app/(dashboard)/tools/converter/page.tsx :

1. Persistance : sauvegarde le fil de résultats cumulés de chaque onglet (Convertir, Compresser, Organiser, Fusionner, Séparer, Protéger) dans sessionStorage, une clé par onglet (ex. "boulga:converter:convert-results"). Restaure au montage si présent. Les résultats expirent avec le lien signé (24h) — un lien expiré donnera une erreur au clic, c'est acceptable.

2. Responsive mobile :
   - Le TabsList (6 onglets) doit scroller horizontalement si ça ne tient pas (overflow-x-auto, whitespace-nowrap sur les triggers)
   - Toutes les listes de fichiers/résultats restent lisibles sous 400px de large (troncature des noms déjà en place, vérifie que ça tient)

3. Cohérence visuelle : vérifie que toutes les ConversionResultCard des 6 onglets utilisent exactement le même style (pas de divergence de copier-coller).
```
