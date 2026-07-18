# Boulga AI — Amélioration Détection IA, Plagiat, Reformulation

Ces prompts améliorent les trois outils de vérification (Détecteur IA, Plagiat,
Reformulation) en s'inspirant du pattern GPTZero. L'objectif : une interface
claire et professionnelle, une détection plus granulaire, et un surlignage PDF
fonctionnel.

Exécute dans l'ordre. Commite après chaque prompt. Vérifie à la fin de chacun.

Référence visuelle : GPTZero (gptzero.me) — étudie leur interface si besoin
avant de coder. Le pattern clé : document à gauche (dominant), résultats à
droite (panneau compact), bouton Scan en bas.

---

## Prompt 1 — Réorganisation du layout Détecteur IA (pattern GPTZero)

```
AVANT DE CODER : ouvre src/app/(dashboard)/tools/ai-detector/page.tsx et
analyse le layout actuel. Le problème : le haut est éparpillé (toggle
Texte/Fichier, nom du fichier, bouton Retirer, bouton Analyser — tout empilé
verticalement avant le contenu). L'historique dans la colonne gauche prend trop
de place. Le résultat apparaît sous le contenu au lieu d'être à côté.

Refactore vers un layout inspiré de GPTZero :

=== LAYOUT CIBLE : deux colonnes fixes ===

COLONNE GAUCHE (~60-65%, dominante) — le viewer/éditeur :
- BARRE SUPÉRIEURE du viewer (une seule ligne, compacte) :
  * Toggle Texte / Fichier (compact, pas des gros boutons)
  * En mode fichier : bouton « Charger un fichier » qui ouvre une MODALE
    de drag & drop (comme GPTZero image 5 — pas une zone de drop qui prend
    toute la largeur). Quand un fichier est chargé, son nom apparaît dans
    la barre avec un « × » pour retirer.
  * En mode texte : rien de plus, l'éditeur est en dessous.
  * À droite de la barre : bouton « + Nouvelle analyse » (reset tout).
- ZONE PRINCIPALE :
  * Mode texte : le RichTextEditor (comme maintenant). En dessous de
    l'éditeur vide : les exemples cliquables (« Exemple IA », « Exemple
    humain », « Exemple mixte » — garder, c'est bien).
  * Mode fichier, avant scan : le nom du fichier affiché, pas de viewer
    encore.
  * Mode fichier, après scan : le UploadedDocViewer avec le surlignage
    (PDF natif ou DOCX rendu) occupe toute la zone.
  * Mode texte, après scan : le texte avec HighlightedText (surlignage
    inline), en lecture seule, avec un lien « Modifier » pour revenir à
    l'éditeur.
- BARRE INFÉRIEURE du viewer (une seule ligne) :
  * Bouton « Analyser » (principal, Bleu Boulga) à gauche.
  * Compteur « X caractères · X mots » à droite.
  * Indicateur « Résultat à jour » / « Contenu modifié — relancez
    l'analyse » (le stale indicator actuel).

COLONNE DROITE (~35-40%) — résultats et actions :
- Avant scan : message discret « Lancez une analyse pour voir les résultats. »
- Après scan :
  * ScoreRing (le cercle avec le %) + phrase de confiance — en haut.
  * ScoreGauge (IA / Mixte / Humain — les 3 badges).
  * Lien dépliable « Phrases signalées » (AiSentenceList).
  * Lien dépliable « Détail page par page » (PageScoreList, si multi-pages).
  * FeedbackButtons (pouces haut/bas) + bouton Export.
  * Séparateur.
  * Section « Réécrire dans un autre ton » : sélecteur de ton + bouton
    Réécrire. Le résultat de réécriture s'affiche EN DESSOUS dans cette
    même colonne (original vs réécrit empilés, pas côte à côte — la colonne
    est étroite).

HISTORIQUE : NE PLUS le mettre en colonne gauche permanente. À la place :
- Un bouton/icône « Historique » dans la barre supérieure du viewer.
- Au clic : un panneau latéral (drawer) qui glisse depuis la gauche, avec
  la liste des scans passés (HistoryList). Le user clique sur un item, le
  drawer se ferme, le scan se charge.
- Ou bien : l'historique passe dans un onglet/section dépliable en bas
  de la colonne droite (sous la réécriture). Choisis l'option la plus
  propre visuellement.

MOBILE : les deux colonnes s'empilent (viewer puis résultats).

=== CE QUE TU NE CHANGES PAS ===
- La logique backend (endpoints, détection, scoring) reste identique.
- Les composants existants (ScoreRing, ScoreGauge, HighlightedText,
  UploadedDocViewer, AiSentenceList, PageScoreList, HistoryList,
  FeedbackButtons, ModeToggle, CopyButton, StreamingOutput,
  ReformulatorOutput, GenerationError) sont RÉUTILISÉS, pas réécrits.
  Tu réorganises leur placement, pas leur code interne.
- Les exemples cliquables restent.
- Le RichTextEditor reste.

VÉRIFICATION : compare visuellement avec GPTZero. Le document/texte doit
dominer à gauche, les résultats doivent être compacts à droite, le bouton
Analyser doit être en bas du viewer, et l'historique ne doit plus occuper
une colonne permanente.
```

## Prompt 2 — Surlignage PDF fonctionnel

```
AVANT DE CODER : analyse le composant UploadedDocViewer et identifie pourquoi
le surlignage ne fonctionne pas sur les PDF. Le surlignage DOCX marche bien
(confirmé par le user) — le problème est spécifique au PDF.

Le problème probable : les flagged_spans contiennent des offsets (start/end)
dans le TEXTE EXTRAIT par pypdf, mais le rendu PDF natif (pdf.js ou iframe)
affiche le document VISUEL — il n'y a pas de correspondance directe entre les
offsets texte et les positions visuelles sur les pages du PDF.

=== APPROCHE À IMPLÉMENTER ===

Option A (recommandée, la plus fiable) — Surlignage sur le texte extrait,
pas sur le PDF natif :
- Pour les PDF, au lieu d'afficher le PDF natif avec des overlays (fragile),
  afficher le TEXTE EXTRAIT page par page avec le surlignage (HighlightedText)
  comme pour les DOCX. Chaque page est un bloc séparé avec un en-tête
  « Page X / N ». Le user voit le texte avec le surlignage, pas le PDF visuel.
- Avantage : le mapping offsets → surlignage est trivial (même texte).
- Inconvénient : on perd la mise en forme visuelle du PDF.

Option B (plus ambitieuse) — Overlay sur le PDF natif via pdf.js :
- Utiliser pdf.js pour rendre le PDF page par page dans des canvas.
- Pour chaque page, mapper les flagged_spans aux positions texte sur la
  page via l'API pdf.js `page.getTextContent()` qui renvoie les items texte
  avec leurs coordonnées (x, y, width, height).
- Dessiner des rectangles semi-transparents colorés (orange clair / orange
  foncé selon highlightTier) sur les positions correspondantes.
- C'est ce que fait GPTZero, mais c'est significativement plus complexe.

CHOIX : implémente l'Option A d'abord (texte extrait avec surlignage, page
par page). C'est fonctionnel et fiable. Note dans un commentaire que l'Option
B (overlay pdf.js) est une amélioration future.

Assure-toi que :
- Chaque page affiche son numéro (« Page 1 / 18 »).
- Le surlignage utilise les bons offsets PAR PAGE (les flagged_spans du
  backend sont des offsets dans le texte concatené — il faut les re-mapper
  aux pages individuelles en utilisant la longueur de chaque page).
- Les pages trop courtes pour être analysées affichent « Trop courte pour
  être analysée » au lieu d'un surlignage vide.
- Le score par page (page_scores) est affiché à côté de chaque numéro de
  page (« Page 3 / 18 — 72% IA »).

VÉRIFICATION : uploade un PDF multi-pages → le texte de chaque page
s'affiche avec le surlignage coloré sur les passages IA détectés. Compare
avec le surlignage DOCX qui marche déjà — le résultat doit être visuellement
similaire.
```

## Prompt 3 — Amélioration du prompt de détection IA (phrase par phrase)

```
AVANT DE CODER : lis le code de detect_ai_content dans
app/core/llm/detection.py (ou le fichier équivalent). Comprends comment le
LLM est actuellement invité à produire les scores et les flagged_spans.

Le problème : le LLM produit un score global et des spans approximatifs.
GPTZero analyse PHRASE PAR PHRASE avec des critères précis (perplexité,
burstiness, variabilité lexicale). On ne peut pas reproduire leur modèle ML,
mais on peut rendre le prompt LLM beaucoup plus rigoureux.

=== REFONTE DU PROMPT DE DÉTECTION ===

Modifie le prompt système de détection IA pour demander au LLM :

1. Découper le texte en phrases (ou le recevoir déjà découpé).

2. Pour CHAQUE phrase, évaluer sur une échelle 0-100 la probabilité qu'elle
   soit générée par IA, en se basant sur des CRITÈRES CONCRETS :
   - Variabilité lexicale : les IA utilisent un vocabulaire limité et
     répétitif (« il est important de noter », « en effet », « de plus »,
     « par ailleurs », « il convient de souligner »).
   - Structure des phrases : les IA produisent des phrases de longueur
     uniforme, avec des structures parallèles et des connecteurs logiques
     sur-utilisés.
   - Spécificité : les humains donnent des détails personnels, des anecdotes,
     des références précises à leur contexte. L'IA reste dans le générique.
   - Burstiness (variation) : les humains alternent phrases courtes et
     longues, changent de registre, font des digressions. L'IA maintient
     un rythme régulier.

3. Produire en sortie un JSON structuré :
   {
     "sentences": [
       { "text": "la phrase exacte", "start": offset, "end": offset,
         "ai_score": 0-100, "reason": "critère principal" }
     ],
     "ai_score": score global 0-100,
     "mixed_score": 0-100,
     "human_score": 0-100,
     "ai_vocabulary": ["il est important de noter", "de plus", ...],
     "summary": "résumé en une phrase du verdict"
   }

=== CÔTÉ BACKEND ===

- Le backend découpe le texte en phrases AVANT d'envoyer au LLM (utilise
  une segmentation par points/points-virgules/retours à la ligne, pas une
  regex fragile — ou laisse le LLM le faire si le texte est court).
- Pour les textes longs (> 3000 mots), découper en lots de ~1000 mots
  et faire plusieurs appels, puis agréger les scores.
- Les flagged_spans sont construits à partir des sentences dont le score
  dépasse le seuil (40 pour light, 70 pour strong — les seuils existants
  dans highlightTier.ts).
- Ajoute le champ ai_vocabulary dans la réponse au frontend.

=== CÔTÉ FRONTEND ===

- Ajoute un bloc « Vocabulaire IA détecté » dans la colonne résultats
  (sous les phrases signalées) : liste des expressions typiquement IA
  trouvées dans le texte, avec un compteur (« 7 marqueurs IA détectés »).
- Chaque marqueur est un badge cliquable : au clic, le viewer scrolle
  vers la première occurrence dans le texte.

VÉRIFICATION : analyse un texte clairement IA (l'exemple existant « Il est
important de noter... ») → chaque phrase doit avoir un score individuel,
le vocabulaire IA doit être identifié. Analyse un texte clairement humain
(l'exemple existant « Bon alors hier j'ai encore raté le bus... ») → les
scores par phrase doivent être bas, pas de vocabulaire IA. Analyse le texte
mixte → seules les phrases IA doivent être surlignées, les phrases humaines
épargnées.
```

## Prompt 4 — Analyse page par page réelle pour les PDF

```
AVANT DE CODER : lis comment detect_ai_content reçoit et traite les pages.
Vérifie si chaque page est analysée indépendamment ou si c'est le texte
concatené qui est analysé en bloc.

Le problème actuel (probable) : toutes les pages sont concatenées et
envoyées en un seul appel LLM, avec un score global. Les page_scores sont
des sous-produits approximatifs, pas de vraies analyses indépendantes.

=== ANALYSE PAGE PAR PAGE ===

Modifie detect_ai_content pour analyser chaque page séparément :

1. Pour les PDF multi-pages : chaque page = un appel LLM séparé (ou un lot
   de 2-3 pages si le texte par page est court). Chaque appel produit le
   JSON phrase par phrase de la Correction 3 pour cette page spécifique.

2. Le score global du document = moyenne pondérée des scores par page
   (pondérée par le nombre de mots de chaque page — une page de 50 mots
   compte moins qu'une page de 300 mots).

3. Les flagged_spans globaux = union de tous les spans de toutes les pages,
   avec les offsets recalculés pour le texte concatené.

4. Le nombre de pages analysées dépend du PALIER :
   - introduction : 3 pages max (le reste est ignoré avec un message)
   - goutte : 10 pages
   - source : 25 pages
   - fleuve : 50 pages
   - ocean : illimité
   Afficher « X pages analysées sur Y » dans les résultats (comme
   actuellement).

5. Pour les textes collés et les DOCX (pas de vraies pages) : pas de
   changement, une seule analyse sur le texte complet (ou par lots de
   1000 mots si long, comme défini en Correction 3).

=== PARALLÉLISME ===

Les appels LLM par page peuvent être lancés en parallèle (asyncio.gather)
pour ne pas multiplier le temps d'attente. Limite le parallélisme à 3-5
appels simultanés pour ne pas surcharger OpenRouter.

VÉRIFICATION : uploade un PDF de 10+ pages → vérifie que les page_scores
sont réellement différents d'une page à l'autre (pas tous entre 55-65%
comme avant). Les pages avec du contenu clairement humain doivent scorer
bas, les pages avec du contenu IA doivent scorer haut.
```

## Prompt 5 — Réorganisation du layout Vérificateur de plagiat

```
Applique le MÊME pattern de layout que le Détecteur IA (Prompt 1) au
Vérificateur de plagiat (src/app/(dashboard)/tools/plagiarism/page.tsx).

LAYOUT IDENTIQUE :
- Colonne gauche dominante : viewer/éditeur avec barre supérieure (toggle
  Texte/Fichier, upload, nouvelle analyse), zone principale (éditeur ou
  viewer avec surlignage des passages plagiés), barre inférieure (bouton
  Analyser + compteur).
- Colonne droite : résultats (score de similarité, passages détectés avec
  sources si disponibles, section « Corriger les passages détectés » avec
  sélecteur de ton et résultat de correction).
- Historique en drawer/panneau, pas en colonne permanente.

Les composants communs (ModeToggle, DropZone/modale upload, HighlightedText,
UploadedDocViewer, HistoryList, FeedbackButtons) sont les MÊMES que le
Détecteur IA — réutilise-les, ne les duplique pas.

La différence avec le Détecteur IA :
- Le score principal est « Similarité » au lieu de « IA ».
- Les passages surlignés indiquent une correspondance avec des sources
  existantes (si le LLM en identifie), pas une probabilité IA.
- L'action de remédiation est « Corriger les passages détectés » au lieu de
  « Réécrire dans un autre ton » (mais même 6 tons).

VÉRIFICATION : les deux outils (Détecteur IA et Plagiat) doivent avoir le
même layout et le même comportement d'upload/affichage. La seule différence
est le type d'analyse et les résultats affichés.
```

## Prompt 6 — Reformulation ciblée des passages détectés

```
Actuellement la réécriture prend TOUT le texte et le reformule entièrement.
C'est excessif : le user veut réécrire seulement les passages signalés
comme IA, pas le texte entier.

=== REFORMULATION CIBLÉE ===

Dans le Détecteur IA ET le Vérificateur de plagiat :

1. Chaque passage surlignée (flagged_span) dans le viewer/éditeur est
   CLIQUABLE. Au clic : le passage est sélectionné visuellement (bordure
   plus marquée) et un petit popover/tooltip apparaît :
   « Réécrire ce passage ? [Convivial] [Académique] [Pro] [Neutre] »
   (les 4 tons les plus courants en boutons, + un « Voir tous les tons »
   pour les 6).

2. Au clic sur un ton : appel au backend pour réécrire UNIQUEMENT ce
   passage (pas tout le texte). Le backend reçoit le passage + le ton +
   le contexte environnant (2-3 phrases avant et après, pour que le LLM
   garde la cohérence).

3. Le résultat remplace le passage surlignée inline dans le viewer/éditeur
   (le passage passe de orange/surlignée à vert/réécrit). Le user voit
   directement l'effet dans le contexte de son document.

4. Un bouton « Annuler » permet de revenir au texte original pour ce
   passage.

5. La fonctionnalité « Réécrire dans un autre ton » globale (colonne
   droite) RESTE disponible pour ceux qui veulent tout réécrire d'un coup.
   Les deux modes coexistent.

6. Si le user est en palier Introduction (réécriture non disponible),
   le clic sur un passage surlignée affiche « Disponible dès le palier
   Goutte » avec un lien vers /settings.

=== BACKEND ===

Ajoute un endpoint (ou modifie l'existant) :
POST /api/v1/tools/analyzers/ai-detector/rewrite-passage
  Body: { passage: string, context_before: string, context_after: string,
          tone: string }
  Réponse: SSE streaming du passage réécrit.

Le prompt dit au LLM : « Réécris UNIQUEMENT le passage suivant dans le
ton [ton], en le rendant naturel et cohérent avec le contexte qui l'entoure.
Ne modifie PAS le sens, seulement le style. Contexte avant : [...].
Passage à réécrire : [...]. Contexte après : [...]. »

Même endpoint réutilisable pour le plagiat (corriger un passage plagié).

VÉRIFICATION : analyse un texte → clique sur un passage surlignée →
réécriture dans le ton choisi → le passage est remplacé inline. Vérifie
que le reste du texte n'est pas affecté.
```

---

## Ordre d'exécution

1. Prompt 1 — Layout Détecteur IA (le plus gros, UX complète)
2. Prompt 2 — Surlignage PDF fonctionnel
3. Prompt 3 — Prompt de détection phrase par phrase + vocabulaire IA
4. Prompt 4 — Analyse page par page pour PDF
5. Prompt 5 — Layout Plagiat (même pattern)
6. Prompt 6 — Reformulation ciblée des passages

Les prompts 1 et 5 sont de l'UX pure (réorganisation). Les prompts 2, 3, 4
sont des améliorations de la détection. Le prompt 6 est une fonctionnalité
nouvelle. L'ordre permet de valider le layout d'abord, puis d'améliorer la
qualité de l'analyse, puis d'ajouter la reformulation ciblée.

*Boulga AI — Puiser l'intelligence qu'il vous faut.*