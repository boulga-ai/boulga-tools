# Boulga AI — Prompts correctifs : parcours guidés pour les générateurs de documents

Ce fichier corrige un problème de fond identifié après les 13 premières corrections : les
générateurs de documents formatés (CV, Lettre de motivation, Document professionnel)
fonctionnent aujourd'hui comme des **formulaires classiques** où l'IA n'intervient qu'à la
toute fin, pour rédiger une fois tous les champs remplis. Ça nie la valeur de l'IA — le user
fait le travail de structuration qu'elle devrait faire à sa place.

Le Document académique (parcours en 7 étapes) et le Générateur de plan (description libre →
plan structuré → édition) sont déjà le bon modèle. L'objectif ici est d'étendre ce principe
au CV, à la Lettre de motivation et au Document professionnel.

**Principe universel à appliquer à chaque outil :**
1. **Cadrage** — quelques champs structurants qu'on ne peut pas deviner (nom, poste visé...)
2. **Description libre** — un textarea où le user écrit comme il veut
3. **L'IA analyse, structure et questionne** — elle extrait ce qu'elle peut, signale ce qui
   manque, propose des suggestions
4. **Validation** — le user ajuste le brouillon structuré, accepte/refuse les suggestions
5. **Génération** — l'IA produit le contenu final, streamé
6. **Export** — template, format, téléchargement (inchangé)

Exécuter ces corrections dans l'ordre, une par une, en validant chaque étape (tsc, eslint,
build, test manuel de l'outil) avant de passer à la suivante — même discipline que pour
`Boulga_prompt_correctif.md`.

---

## Correction 1 — Rédacteur de CV : parcours guidé conversationnel

```
Le Rédacteur de CV actuel est un formulaire plat : le user remplit manuellement chaque
expérience (intitulé, entreprise, dates, description), chaque formation, les compétences une
par une. L'IA ne sert qu'à la toute fin, pour rédiger un CV poli à partir de ce formulaire
déjà rempli.

Transforme-le en parcours en 4 étapes (reprends le composant Stepper déjà utilisé sur le
Document académique) :

ÉTAPE 1 — Informations de base
Uniquement les données factuelles qu'on ne peut pas deviner : Nom complet, Email, Téléphone,
Poste visé. Retire les champs "Résumé (optionnel)" et "LinkedIn (optionnel)" de cette étape
(LinkedIn peut être mentionné dans le texte libre à l'étape 2 si le user le souhaite ; le
résumé sera rédigé par l'IA).

ÉTAPE 2 — Décrivez votre parcours
Un grand textarea avec le label « Parlez-nous de votre parcours » et le placeholder :
« Décrivez votre expérience, vos formations, vos compétences, ce que vous avez fait de
marquant. Écrivez comme vous voulez — l'IA structurera. Vous pouvez aussi coller un ancien
CV en texte brut. »
Bouton « Analyser mon parcours ».

Côté backend, crée un nouvel endpoint POST /api/v1/tools/generators/cv/extract :
- Nouveau modèle CVExtractRequest (full_name, email, phone, target_role, bio: str, max
  8000 caractères)
- Utilise get_current_user_with_tier (generation gratuite, pas de consommation de quota,
  comme le reste de l'outil CV)
- Nouveau prompt dans app/core/llm/prompts/cv.py : EXTRACT_PROMPT, qui suit les règles de la
  Correction 7 (cadrage francophone, format JSON explicite, pas de meta-commentaire) et
  instruit le LLM de :
  - extraire les expériences, formations, compétences, langues, certifications du texte libre
  - déduire un résumé professionnel de 2-3 lignes cohérent avec le poste visé
  - suggérer 3 à 6 compétences pertinentes pour le poste visé qui ne sont PAS déjà mentionnées
  - lister les questions de clarification pertinentes (dates manquantes, poste flou, etc.)
  Réponds en JSON strict :
  {"draft": {"summary": "...", "experiences": [...], "education": [...], "skills": [...],
  "languages": [...], "certifications": [...]}, "suggested_skills": [...], "questions": [...]}

ÉTAPE 3 — Vérifiez et complétez
Affiche le formulaire structuré existant (expériences, formation, compétences, langues,
certifications), mais PRÉ-REMPLI avec le "draft" retourné par l'IA — le user édite au lieu
de remplir à partir de zéro. Au-dessus du formulaire, une zone "Suggestions de l'IA" :
- Les "questions" sont affichées comme des rappels visuels à côté du champ concerné (ex :
  bordure orange sur le champ dates d'une expérience si la question y fait référence)
- Les "suggested_skills" sont affichées comme des puces cliquables « + Ajouter » à côté du
  champ Compétences — un clic les ajoute au TagInput existant
Bouton « Continuer vers la génération ».

ÉTAPE 4 — Génération et export
Reprend le flux existant inchangé : génération streamée du CV poli (JSON strict, prompt
GENERATE_PROMPT déjà en place), choix du template, format, téléchargement.

Le Stepper doit permettre de revenir en arrière (étape 1 ↔ 2 ↔ 3) sans perdre les données
déjà saisies.
```

## Correction 2 — Lettre de motivation : parcours guidé conversationnel

```
La Lettre de motivation actuelle demande Poste visé / Entreprise / Recruteur / Ton en champs
courts (bien, ce sont des choix structurants), puis Parcours / Motivation / Points forts en
TROIS textareas séparés — c'est artificiel de faire découper sa pensée en trois blocs.

Garde le bouton "Importer depuis mon CV" existant (bonne idée, ne change rien à cette
logique). Simplifie la suite en 2 étapes au lieu de 3 champs de texte séparés :

ÉTAPE 1 — Cadrage
Poste visé, Entreprise (structurants, gardés tels quels), Ton (dropdown existant, gardé).
Ajoute un champ optionnel replié sous "+ Options avancées" : "Coller le texte de l'offre
d'emploi (optionnel)" — s'il est rempli, le prompt backend doit s'en servir pour cibler les
mots-clés et exigences du poste.

ÉTAPE 2 — Un seul textarea de motivation
Remplace les 3 champs "Parcours" / "Motivation" / "Points forts" par UN textarea avec le
label « Pourquoi ce poste ? » et le placeholder :
« Décrivez ce qui vous motive pour ce poste et cette entreprise, et ce que vous pensez
apporter. Mentionnez les expériences ou compétences que vous jugez pertinentes. »
Si un CV a été importé (via "Importer depuis mon CV"), pré-remplis ce textarea avec un
paragraphe de départ généré automatiquement : « D'après votre CV, voici ce qui semble
pertinent pour ce poste : [résumé auto-généré des expériences/compétences les plus
pertinentes]. Ajoutez votre motivation personnelle ci-dessous. » — le user peut l'éditer,
compléter, ou tout effacer et écrire autrement.

Côté backend, adapte app/core/llm/prompts/cover_letter.py :
- build_generate_user_message reçoit maintenant motivation_text (le contenu du textarea
  unique) au lieu de background/motivation/strengths séparés
- Si job_posting_text est fourni (le texte de l'offre collée), l'ajoute au message pour que
  le LLM cible les mots-clés pertinents
- Le prompt système doit préciser : "Tu reçois une description libre de la motivation du
  candidat. Structure toi-même la lettre : accroche, adéquation au poste, motivation,
  conclusion — à partir de ce texte, sans exiger que le candidat l'ait déjà structuré."

Le bouton "Analyser mes informations" existant devient l'étape intermédiaire qui affiche les
suggestions (points forts à mettre en avant, angle d'approche) avant génération — garde-le
mais rends-le plus visible dans le flux (pas un bouton secondaire perdu en bas).
```

## Correction 3 — Document professionnel : plan généré par l'IA, pas saisi à la main

```
Le Document professionnel actuel demande au user de construire son plan à la main :
"+ Ajouter une section", puis un champ Titre et un champ "Contenu de guidage" par section.
L'IA ne rédige qu'une fois ce plan entièrement construit par le user — c'est l'usage
inversé : c'est exactement le travail que le Générateur de plan sait déjà faire pour lui.

Remplace la construction manuelle du plan par une génération IA, en réutilisant le mécanisme
déjà existant du Générateur de plan (même endpoint POST /api/v1/tools/planner, même
composant OutlineTree pour l'édition) :

ÉTAPE 1 — Cadrage
Type de document (dropdown existant, gardé), Titre, Auteur, Organisation (optionnel) —
inchangés.

ÉTAPE 2 — Décrivez le contenu
Un textarea avec le label « Décrivez ce que ce document doit couvrir » et un placeholder
adapté au type sélectionné, par exemple pour "Rapport d'activité" :
« Ex : Rapport d'activité annuel de mon entreprise de transport. Chiffre d'affaires de 50M
FCFA, 15 employés, ouverture de 3 nouvelles lignes cette année, recrutement de 5 personnes. »
Bouton « Générer le plan avec l'IA » — appelle POST /api/v1/tools/planner avec le doc_type
et cette description comme subject (réutilise le endpoint et le prompt existants du
Générateur de plan tels quels, aucun changement backend nécessaire ici).

ÉTAPE 3 — Plan
Affiche le plan retourné via le composant OutlineTree déjà existant (réordonner, renommer,
ajouter, supprimer des sections — fonctionnalité déjà là, rien à reconstruire). Bouton
« Régénérer le plan » et bouton « Valider ce plan ».

Si le user arrive depuis le Générateur de plan via "Utiliser ce plan → Document
professionnel" (mécanisme pendingOutline déjà en place), saute directement à cette étape 3
avec le plan pré-rempli, sans repasser par l'étape 2.

ÉTAPE 4 — Génération section par section
Reprend le flux existant inchangé : génération streamée du document (JSON strict), avec le
plan validé comme squelette — aucun changement au endpoint POST /api/v1/tools/generators/
pro-doc ni à son prompt, il consomme déjà un "plan" en entrée.

ÉTAPE 5 — Export
Template, format, téléchargement — inchangé.

Retire complètement le bouton "+ Ajouter une section" manuel et les champs "Titre de la
section" / "Contenu de guidage pour l'IA" saisis à la main — le plan vient maintenant
toujours de l'IA (étape 2-3), le user ne fait qu'éditer ce qu'elle propose.
```

## Correction 4 — Document académique : appliquer le même principe de bout en bout

```
Les 4 premières étapes du Document académique (Type → Domaine → Sujet → Plan) semblent
suivre le bon principe en surface, mais ce n'est qu'une façade : ce sont 4 formulaires
successifs, sans mémoire de ce que le user a dit d'une étape à l'autre. Et l'étape 5
(Rédaction) retombe complètement dans le formulaire classique : 30+ sections avec un bouton
"Générer" chacune, sans aucun contexte au-delà du titre de la section — l'IA ne sait rien de
ce que le user a précisé plus tôt, elle régénère à l'aveugle section par section.

Le vrai problème : les réponses aux questions de complétude que l'IA devrait poser ne sont
JAMAIS capturées ni réutilisées. Applique le même principe que le CV/Lettre/Document pro,
mais en le faisant persister sur TOUT le parcours, jusqu'à la rédaction de chaque section :

ÉTAPE 1 — Cadrage
Type de document (rapport de stage / mémoire / thèse) — inchangé, c'est un vrai choix
structurant qui détermine les conventions à suivre.

ÉTAPE 2 — Décrivez votre sujet
Fusionne les étapes actuelles "Domaine" (dropdown seul) et "Sujet" (textarea seul) en UNE
étape de description libre plus riche : « Décrivez votre sujet de recherche : le domaine, la
problématique, la méthodologie envisagée, le contexte. Écrivez comme vous voulez — l'IA
structurera et vous posera des questions si des informations manquent. » Garde la suggestion
de sujets (bouton "Suggérer des sujets") qui existe déjà, adaptée à ce nouveau texte libre.

ÉTAPE 3 — L'IA analyse et complète
Nouvel appel qui remplace la génération de plan "brute" actuelle : l'IA renvoie à la fois
- un plan structuré (comme aujourd'hui)
- une liste de "questions de complétude" ciblées sur ce qui manque pour bien rédiger le
  document : méthodologie (quantitative/qualitative/étude de cas ?), taille de l'échantillon
  ou du corpus, cadre théorique mobilisé, contraintes de temps/terrain, etc. — adaptées au
  domaine et au type de document.
Affiche ces questions sous le plan, sous forme de champs à compléter (comme le pattern
Correction 5 pour CV/Lettre/Doc pro : SuggestionsPanel étendu avec "questions"). Les réponses
du user sont sauvegardées dans la session (nouveau champ context_answers: dict dans
academic_sessions, ou intégré à outline_json) — ELLES SERONT RÉUTILISÉES À L'ÉTAPE 5.

ÉTAPE 4 — Plan
Édition du plan via OutlineTree (déjà existant, inchangé : réordonner, renommer, ajouter,
supprimer).

ÉTAPE 5 — Rédaction, complètement revue
Deux corrections concrètes :
1. Chaque génération de section (POST /api/v1/tools/generators/academic/generate-section)
   doit désormais injecter automatiquement dans le prompt les réponses aux questions de
   complétude de l'étape 3 (context_answers), en plus du plan et des résumés de sections déjà
   rédigées — pas seulement le titre de la section. C'est ça, la vraie continuité : le user
   ne répète jamais deux fois la même information.
2. Ajoute un bouton « Générer toutes les sections restantes » en haut de la liste, qui
   enchaîne automatiquement la génération de chaque section "à faire" (avec indicateur de
   progression X/N), sans obliger un clic manuel par section. Garde la possibilité de
   régénérer une section individuellement (bouton existant "Régénérer / Voir"), et ajoute à
   la boîte de dialogue de génération d'une section un champ optionnel « Précisions pour
   cette section » pour un ajustement ciblé sans tout redécrire.

ÉTAPE 6 — Relecture, ÉTAPE 7 — Export
Relecture inchangée. Pour l'export, revoir les templates de rendu (academic_formal.py,
academic_clean.py dans app/core/document_engine/templates) pour une mise en page qui
ressemble vraiment à un mémoire/thèse : page de garde soignée, sommaire généré automatiquement
avec numéros de page, hiérarchie de titres cohérente (chapitres/sections/sous-sections),
numérotation des pages, marges adaptées à la reliure. Compare le rendu actuel à un vrai
mémoire universitaire et corrige les écarts.

Vérifie enfin que les deux boutons de handoff du Générateur de plan fonctionnent toujours
après la Correction 3 :
- « Utiliser ce plan → Document professionnel » atterrit sur l'étape 3 du nouveau parcours
  Document professionnel, plan pré-rempli.
- « Utiliser ce plan → Document académique » doit maintenant atterrir sur l'étape 4 (Plan) du
  nouveau parcours ci-dessus, plan pré-rempli, en sautant les étapes 2-3 — mais SANS
  context_answers puisqu'ils n'ont pas été collectés par le Générateur de plan. Prévois un
  état par défaut (context_answers vide) qui n'empêche pas la rédaction de fonctionner,
  simplement avec moins de contexte injecté automatiquement.
```

## Correction 5 — Composants partagés à créer ou étendre

```
Pour éviter de dupliquer la logique de suggestions/questions entre CV, Lettre, Document pro
ET Document académique (Correction 4), crée ou étends ces composants partagés dans
src/components/tools/ :

1. Étends SuggestionsPanel.tsx (déjà utilisé pour l'analyse) pour accepter optionnellement
   une liste "questions" (string[]) affichée sous forme de champs à compléter, en plus des
   champs existants (completeness_score, missing_fields, suggestions, recommended_skills).
   Les réponses saisies doivent remonter au composant parent (onAnswersChange) pour être
   sauvegardées côté state/session — c'est ce même mécanisme que réutilise l'étape 3 du
   Document académique (Correction 4) pour capturer les context_answers.

2. Crée SuggestedChips.tsx : une liste de puces cliquables (ex. compétences suggérées) avec
   un bouton "+ Ajouter" par puce et un bouton "Tout ajouter" — réutilisable pour les
   suggestions de compétences du CV et, potentiellement, les mots-clés suggérés des posts
   réseaux sociaux plus tard.

3. Le pattern "textarea de description libre → bouton d'analyse → brouillon structuré
   pré-rempli" doit rester cohérent visuellement entre CV, Lettre, Document pro et Document
   académique : même style de placeholder, même position du bouton, même style de zone de
   suggestions (fond bleu clair, comme SuggestionsPanel actuel).
```

---

*Exécute ces 5 corrections dans l'ordre, une par une, avec la même rigueur que pour
`Boulga_prompt_correctif.md` : valide (tsc --noEmit, eslint, build, test manuel de l'outil
concerné) avant de passer à la suivante. Commite après chaque correction si demandé.
Après chaque outil restructuré, teste avec un cas réel (parcours + génération complète)
pour vérifier que le brouillon extrait par l'IA est pertinent et que rien n'est perdu par
rapport au formulaire précédent.*
