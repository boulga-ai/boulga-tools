# Boulga AI — Refonte documentaire (prompts correctifs V2)

Ces prompts refondent complètement les générateurs de documents. On passe d'un
formulaire classique avec stepper à une **interface conversationnelle dans une vue
unique** : le user décrit ce qu'il veut, l'IA analyse et propose des éléments
interactifs (suggestions cliquables, questions inline, tags modifiables), le user
valide en cliquant, et le document se génère. Rien ne bloque la génération — l'IA
fait avec ce qu'elle a.

Ce pattern n'existe chez aucun concurrent en 2026. C'est le différenciateur UX
de Boulga.

Exécuter dans l'ordre. Commiter après chaque prompt.

---

## Refonte Doc 1 — Composant AIInteraction : le cœur de la nouvelle UX

```
Crée le composant central de la nouvelle UX documentaire de Boulga. Ce composant
remplace à la fois le stepper, le formulaire, et le chat. C'est une zone
d'interaction IA qui affiche des blocs interactifs en réponse à l'input du user.

Crée src/components/tools/AIInteraction.tsx :

C'est un conteneur qui affiche une séquence de blocs d'interaction. Chaque bloc
est un élément que l'IA a produit et avec lequel le user peut interagir. Les types
de blocs :

1. SuggestionBlock — L'IA propose quelque chose que le user valide ou refuse
   Props : { label: string, value: string, onAccept, onReject, onEdit }
   UI : une carte avec le label en petit gris, la valeur en texte normal,
   et trois actions : ✓ Accepter (vert), ✗ Refuser (rouge discret), ✎ Modifier
   (ouvre un input inline pour changer la valeur). Quand accepté, la carte passe
   en fond vert très léger avec un check.

2. TagsBlock — L'IA propose une liste de tags que le user peut modifier
   Props : { label: string, tags: string[], onAdd, onRemove, accepted: string[] }
   UI : le label en haut (ex: "Compétences détectées"), les tags en badges
   cliquables. Chaque tag a un ✗ pour le retirer. Un bouton "+ Ajouter" ouvre un
   input inline pour taper un nouveau tag. Tags acceptés en Bleu Boulga, tags
   refusés disparaissent avec une animation.

3. QuestionBlock — L'IA pose une question avec un champ de réponse
   Props : { question: string, placeholder: string, onAnswer, optional: boolean }
   UI : la question en texte, un champ input ou textarea en dessous, un bouton
   "Répondre". Si optional=true, afficher aussi "Passer →" en lien discret.
   Quand répondu, le champ se replie et la réponse s'affiche en résumé.

4. ChoiceBlock — L'IA demande de choisir parmi des options
   Props : { question: string, options: {label, value, description?}[], onChoose }
   UI : cartes cliquables côte à côte, la sélectionnée a une bordure Bleu Boulga.

5. InfoBlock — L'IA affiche une information ou un message
   Props : { text: string, type: 'info' | 'success' | 'warning' }
   UI : texte avec icône, fond coloré léger selon le type.

6. SectionPreviewBlock — L'IA montre une section de document structurée
   Props : { title: string, content: string, onEdit, onRegenerate }
   UI : carte avec titre en bold, contenu en texte (rendu Markdown→HTML),
   boutons "Modifier" et "Régénérer cette section".

Le composant AIInteraction prend en props :
- blocks: InteractionBlock[] (la liste des blocs à afficher)
- loading: boolean (affiche un indicateur "L'IA réfléchit..." en bas)

Les blocs apparaissent progressivement avec une animation douce (fade-in + slide-up)
pour donner l'impression que l'IA "répond". Pas de bulles de chat — c'est une
interface structurée, pas un chatbot.

Style général : fond blanc, chaque bloc séparé par un espace léger, pas de bordures
lourdes, esprit épuré Claude. Les actions (✓ ✗ ✎) sont discrètes jusqu'au hover.

Crée aussi src/types/interaction.ts avec les types TypeScript pour tous les blocs.
```

## Refonte Doc 2 — Rédacteur de CV : vue unique conversationnelle

```
Refonte COMPLÈTE de src/app/(dashboard)/tools/cv-writer/page.tsx.
Supprime tout le formulaire actuel et le stepper. Remplace par une vue unique.

=== LAYOUT DE LA PAGE ===

La page est divisée en deux zones côte à côte (desktop) ou empilées (mobile) :

GAUCHE (ou HAUT sur mobile) — Zone d'input + interaction IA :
- En haut, un petit groupe de champs factuels FIXES (toujours visibles) :
  * Nom complet (pré-rempli du profil, modifiable)
  * Email (pré-rempli)
  * Téléphone (pré-rempli)
  * Poste visé
  Ces 4 champs sont sur 2 lignes, compacts. Pas de bouton "suivant".

- En dessous, un grand textarea :
  Label : « Décrivez votre parcours »
  Placeholder : « Racontez votre expérience, vos études, vos compétences...
  Écrivez comme vous voulez ou collez un ancien CV. L'IA structurera tout. »

- Bouton « Analyser mon parcours » (Bleu Boulga)

- EN DESSOUS DU BOUTON : la zone AIInteraction (initialement vide).
  Quand le user clique "Analyser", l'IA répond avec des blocs interactifs :

  Bloc 1 — SuggestionBlock : « Titre du CV proposé : [Comptable Senior —
  8 ans d'expérience en audit et gestion financière] » → ✓ / ✗ / ✎

  Bloc 2 — SuggestionBlock : « Résumé professionnel : [texte rédigé par l'IA] »
  → ✓ / ✗ / ✎

  Bloc 3 — Pour chaque expérience détectée, une SuggestionBlock :
  « Expérience : Auditeur Senior chez Deloitte (2019-2021) — [description
  rédigée par l'IA] » → ✓ / ✗ / ✎

  Bloc 4 — Pour chaque formation détectée, une SuggestionBlock similaire

  Bloc 5 — TagsBlock : « Compétences détectées : » avec les tags
  [Excel] [SAP] [Sage] [Gestion budgétaire] [Audit] — le user peut ✗ retirer
  ou + ajouter

  Bloc 6 — TagsBlock : « Langues : » [Français — Natif] [Anglais — Courant]
  — modifiable

  Bloc 7 (si des infos manquent) — QuestionBlock : « Vous n'avez pas mentionné
  de certifications. En avez-vous ? (optionnel) » → champ inline ou "Passer"

  Bloc final — InfoBlock success : « Votre CV est prêt à être généré.
  Vous pouvez encore modifier les éléments ci-dessus ou générer directement. »

- BOUTON « Générer le CV » — TOUJOURS VISIBLE, jamais grisé, jamais bloqué.
  Le user peut cliquer même si des questions sont sans réponse ou des suggestions
  non traitées. L'IA génère avec ce qu'elle a. Les champs vides restent vides.

DROITE (ou BAS sur mobile) — Zone de résultat :
- Initialement : placeholder « Le CV apparaîtra ici après la génération. »
- Après clic "Générer" : le contenu du CV apparaît en streaming, formaté
  proprement (rendu Markdown→HTML avec le composant StreamingOutput amélioré)
- En dessous du résultat :
  * Sélecteur de template : [Modern] [Classique] (2 cartes avec aperçu miniature)
  * Sélecteur de format : [PDF] [Word]
  * Bouton « Télécharger » (payant dès Goutte)
  * Bouton « Ajuster » → le user peut taper une instruction de modification
    (« Raccourcis le résumé », « Ajoute une compétence en leadership ») et
    l'IA regénère en tenant compte de l'ajustement
- Bouton secondaire : « Rédiger une lettre de motivation pour ce poste → »

=== BACKEND ===

Modifie app/api/v1/tools/generators.py et app/core/llm/prompts/cv.py :

Endpoint POST /api/v1/tools/generators/cv/analyze :
- Reçoit : { name, email, phone, target_position, free_text }
- Le prompt LLM dit :
  « Voici les informations brutes d'un candidat qui vise le poste de [poste].
  Extrais et structure toutes les informations en JSON :
  {
    suggested_title: string,
    suggested_summary: string,
    experiences: [{ position, company, start, end, description }],
    education: [{ degree, institution, year }],
    skills: string[],
    languages: [{ language, level }],
    missing: [{ field, question, optional: bool }],
    suggestions: [{ field, text }]
  }
  Si une information n'est pas fournie, ne l'invente pas — signale-la dans missing.
  Pour les descriptions d'expériences, rédige des bullet points percutants
  à partir de ce que le candidat a décrit. »
- Renvoie ce JSON au frontend qui le transforme en blocs AIInteraction

Endpoint POST /api/v1/tools/generators/cv :
- Reçoit le CVContent validé (après interactions du user)
- Stream le contenu final peaufiné
- Log usage, consume quota

Endpoint POST /api/v1/tools/generators/cv/adjust :
- Reçoit le CVContent actuel + une instruction de modification
- Regénère en tenant compte de l'instruction
- Stream le nouveau contenu

=== CONTRAINTES ===

- JAMAIS de stepper ou d'étapes numérotées. Une seule page, une seule vue.
- Le bouton "Générer" n'est JAMAIS bloqué. Même sans cliquer "Analyser", le user
  peut directement générer — l'analyse se fera en interne.
- Si le user n'a pas de poste visé, l'IA génère un CV générique.
- Si le user n'a pas de nom, le CV a un espace vide pour le nom.
- L'IA ne bloque JAMAIS. Elle fait avec ce qu'elle a.
- Le temps de réponse de l'analyse doit être rapide (2-4 secondes).
  Afficher un skeleton/loader pendant l'analyse.
```

## Refonte Doc 3 — Lettre de motivation : vue unique conversationnelle

```
Refonte COMPLÈTE de src/app/(dashboard)/tools/cover-letter/page.tsx.

=== LAYOUT ===

GAUCHE — Zone d'input + interaction IA :

- Champs factuels FIXES en haut (2 lignes, compacts) :
  * Poste visé (obligatoire)
  * Entreprise (obligatoire)
  * Nom complet (pré-rempli)
  * Email (pré-rempli)
  * Ton (dropdown : Professionnel / Formel / Convivial — défaut Pro)

- Bouton « Importer depuis mon CV » — charge les données du dernier CV
  depuis la table documents (tool='cv_writer', content_json). Si trouvé,
  pré-remplit le textarea avec un résumé du parcours.

- Textarea :
  Label : « Pourquoi postulez-vous ? Décrivez votre motivation et ce que vous apportez. »
  Si CV importé, le textarea est pré-rempli :
  « D'après votre CV : [résumé du parcours pertinent pour le poste].
  Complétez avec votre motivation personnelle ci-dessous. »

- Champ optionnel dépliable : « Coller l'offre d'emploi (optionnel) »
  Si fourni, l'IA adaptera la lettre aux compétences demandées.

- Bouton « Générer la lettre » (Bleu Boulga)

- Zone AIInteraction (apparaît après clic) :
  Bloc 1 — InfoBlock : « J'ai identifié dans l'offre les compétences clés
  suivantes : » + TagsBlock avec les compétences clés de l'offre
  Bloc 2 — SuggestionBlock : « Points forts à mettre en avant : [expérience BCG,
  maîtrise Excel, gestion d'équipe] » → ✓ / ✗ par point
  Bloc 3 — QuestionBlock (optionnel) : « Avez-vous un contact dans l'entreprise
  à mentionner ? » → répondre ou Passer

  MAIS : la lettre se génère DIRECTEMENT en même temps dans la zone droite,
  en streaming. Les blocs d'interaction permettent d'AFFINER ensuite, pas de
  bloquer la génération.

DROITE — Zone de résultat :
- La lettre générée en streaming, dans un composant LetterOutput :
  * Référence de candidature en haut
  * Corps de la lettre formaté (accroche, argumentation, conclusion)
  * Formule de politesse
- Bouton « Copier la lettre »
- Bouton « Ajuster » → champ inline « Que voulez-vous modifier ? » → regénération
- Sélecteur template (Standard / Modern) + format (PDF / Word) + Télécharger

=== BACKEND ===

L'endpoint /cover-letter reçoit { target_position, company, name, email, tone,
free_text, job_offer_text?, cv_data? } et génère directement la lettre en SSE.

Pas besoin d'un /analyze séparé pour la lettre — la génération est assez rapide
et le feedback interactif vient APRÈS la première génération, pas avant.

L'endpoint /cover-letter/adjust reçoit la lettre actuelle + l'instruction et regénère.
```

## Refonte Doc 4 — Document professionnel : vue unique conversationnelle

```
Refonte COMPLÈTE de src/app/(dashboard)/tools/pro-doc-writer/page.tsx.

=== LAYOUT ===

GAUCHE — Zone d'input + interaction IA :

- Champs de cadrage FIXES en haut :
  * Dropdown « Type de document » (Rapport d'activité, Offre commerciale,
    Business plan, Cahier des charges, Étude de cas, Analyse SWOT, Note de
    service, Autre)
  * Champ « Titre (optionnel) » — si vide, l'IA le génère
  * Ton (dropdown, défaut Professionnel)

- Grand textarea :
  Label : « Décrivez le contenu de votre document »
  Placeholder DYNAMIQUE selon le type sélectionné (change en temps réel) :
  * Rapport d'activité : « Décrivez l'activité de votre structure cette année :
    résultats, projets menés, effectifs, faits marquants... »
  * Business plan : « Décrivez votre projet : quel problème vous résolvez,
    votre solution, votre marché, votre équipe... »
  * Offre commerciale : « Décrivez votre proposition : le client, le besoin,
    votre solution, vos tarifs... »
  etc.

- Bouton « Analyser et proposer un plan » (Bleu Boulga)

- Zone AIInteraction (après clic) :
  Bloc 1 — SuggestionBlock : « Titre proposé : [Rapport d'activité 2025 —
  Société XYZ Transport] » → ✓ / ✗ / ✎

  Bloc 2 — InfoBlock : « Voici le plan que je propose pour votre document : »

  Bloc 3 — Pour chaque section du plan, un SuggestionBlock :
  « Section 1 : Introduction et contexte — [description de ce que cette section
  couvrira, basée sur ce que le user a décrit] » → ✓ / ✗ / ✎
  « Section 2 : Bilan des activités — [...] » → ✓ / ✗ / ✎
  « Section 3 : Résultats financiers — [...] » → ✓ / ✗ / ✎
  etc.
  + Bouton « + Ajouter une section » en bas des sections

  Bloc 4 (si infos manquantes pour certaines sections) — QuestionBlocks :
  « Pour la section 'Résultats financiers', pouvez-vous préciser votre CA
  et vos principaux postes de dépenses ? (optionnel) » → répondre ou Passer

  Bloc final — InfoBlock : « Le plan est prêt. Vous pouvez modifier les
  sections ci-dessus, répondre aux questions, ou générer directement. »

- Bouton « Générer le document » — JAMAIS bloqué.
- En dessous, un choix : « Section par section » ou « Document complet »

  Si "Section par section" : chaque section apparaît dans la zone droite
  une par une, avec boutons Valider / Régénérer / Modifier l'instruction.
  
  Si "Document complet" : tout le document en streaming dans la zone droite.

DROITE — Zone de résultat :
- Le document en streaming, formaté proprement
- Table des matières cliquable sur le côté (sticky) si le document est long
- Boutons Copier / Ajuster / Régénérer par section
- Sélecteur template (Corporate / Minimal) + format + Télécharger

=== BACKEND ===

POST /api/v1/tools/generators/pro-doc/analyze :
- Reçoit { doc_type, title?, tone, free_text }
- Le prompt : « Analyse cette description et génère un plan structuré adapté
  au type [type]. Pour chaque section, indique : le titre, ce qu'elle couvrira
  (basé sur les infos fournies), et les infos manquantes (questions à poser).
  Propose aussi un titre de document si non fourni. JSON : { title, sections:
  [{ title, description, available_info, missing_info: [{ question, optional }] }] } »
- Renvoie le JSON

POST /api/v1/tools/generators/pro-doc/section :
- Reçoit { plan, section_index, additional_info, previous_sections_summaries }
- Stream la section (contexte compact comme l'académique)
- Log usage

POST /api/v1/tools/generators/pro-doc :
- Reçoit tout, stream le document complet
- Log usage

POST /api/v1/tools/generators/pro-doc/adjust :
- Reçoit la section + instruction → regénère
```

## Refonte Doc 5 — Document académique : même pattern, pas de stepper

```
Refonte de src/app/(dashboard)/tools/academic-writer/page.tsx.

Le document académique avait le meilleur parcours (7 étapes), mais on passe
maintenant au même pattern que les autres : vue unique, pas de stepper.

=== LAYOUT ===

GAUCHE — Zone d'input + interaction IA :

- Champs de cadrage FIXES en haut :
  * ChoiceBlock inline : Type (3 badges cliquables : Rapport de stage /
    Mémoire / Thèse — sélection visuelle, pas un dropdown)
  * Dropdown Domaine (Informatique, Gestion, Droit, Santé, Agronomie,
    Sciences sociales, Ingénierie, Autre)

- Grand textarea :
  Label : « Décrivez votre sujet et ce que vous savez déjà »
  Placeholder : « Ex : Mon mémoire porte sur la transformation digitale
  des PME au Burkina Faso. J'étudie en master gestion à l'université
  de Ouagadougou. Mon encadreur est le Pr. Sawadogo. J'ai déjà identifié
  3 PME pour mon étude de terrain... »

  Si le user ne sait pas quoi écrire : un bouton « Suggérer des sujets »
  qui affiche 3-5 ChoiceBlocks avec des sujets proposés par l'IA, cliquables.
  Cliquer sur un sujet le copie dans le textarea.

- Bouton « Analyser et proposer un plan »

- Zone AIInteraction :
  (Similaire au doc pro, mais adapté à l'académique)

  Bloc 1 — SuggestionBlock : « Problématique proposée : [En quoi la
  transformation digitale impacte-t-elle la compétitivité des PME
  burkinabè ?] » → ✓ / ✗ / ✎

  Bloc 2 — Plan structuré en SuggestionBlocks (adapté à la profondeur :
  3-4 parties pour un rapport, chapitres et sous-chapitres pour un mémoire)

  Bloc 3 — QuestionBlocks pour les infos de page de garde :
  « Nom de votre établissement ? » (si pas déjà dans le texte)
  « Nom de votre encadreur ? » (optionnel)
  « Année académique ? » (optionnel)
  → chaque réponse met à jour les métadonnées du document

  Bloc 4 — InfoBlock : « Le plan est prêt. Générez le document complet
  ou section par section. »

- Bouton « Générer le document » — JAMAIS bloqué
- Choix : « Section par section » (recommandé pour mémoire/thèse) ou
  « Document complet » (pour rapport de stage court)

DROITE — Zone de résultat :
- Même logique que le doc pro : streaming, sections avec statuts,
  table des matières sticky, Valider/Régénérer par section
- Sélecteur template (Formel / Épuré) + format + Télécharger

=== PERSISTENCE ===

Le document académique étant potentiellement long (le user revient sur
plusieurs jours), la persistance reste critique. Mais au lieu de persister
des "étapes" dans academic_sessions, on persiste :
- Le contenu du textarea initial
- Les réponses aux interactions (suggestions acceptées/refusées, questions
  répondues)
- Le plan validé
- Les sections générées et leur statut
- Les métadonnées (établissement, encadreur, etc.)

Quand le user revient, la page se reconstruit à partir de ces données :
les champs sont pré-remplis, les blocs d'interaction affichent leur état
(accepté/refusé), les sections générées sont visibles.

Adapte la table academic_sessions si nécessaire (les champs current_step
et doc_type/domain/topic restent utiles comme métadonnées, mais plus
comme stepper). Ajoute un champ interactions_json JSONB pour stocker
l'état des blocs d'interaction.

=== BACKEND ===

Même structure que le doc pro : /analyze, /section, /full, /adjust.
Contexte compact pour les sections (résumé des sections précédentes,
pas l'historique complet).
```

## Refonte Doc 6 — Migration de la base de données

```
Les refonte Doc 2-5 peuvent nécessiter des ajustements du schéma de base de données.

Crée une migration Supabase : supabase/migrations/0003_refonte_docs.sql

Vérifie et applique les changements suivants si nécessaire :

1. Table academic_sessions :
   - Ajoute une colonne interactions_json JSONB DEFAULT '{}'::jsonb si elle
     n'existe pas — pour stocker l'état des blocs d'interaction (suggestions
     acceptées, questions répondues, tags modifiés)
   - La colonne current_step reste (utile pour savoir "où en est" le user)
     mais n'est plus utilisée comme stepper visuel côté frontend

2. Table documents :
   - Vérifie que content_json peut stocker le format enrichi de chaque type
     de document (CVContent, CoverLetterContent, ProDocContent, AcademicDocContent)
   - Pas de changement structurel attendu, juste vérifier

3. Pas de nouvelles tables nécessaires — les interactions sont stockées dans
   les sessions ou dans un état local (Zustand + localStorage comme cache)

4. Si d'autres changements sont nécessaires suite aux refonte Doc 2-5,
   les inclure ici.

Applique la migration et vérifie qu'elle n'impacte pas les données existantes.
```

## Refonte Doc 7 — Connexion entre outils

```
Les outils documentaires doivent former un écosystème connecté, pas des silos.

Implémente les connexions suivantes :

1. CV → Lettre de motivation :
   Après génération du CV, un bouton « Rédiger une lettre de motivation
   pour ce poste → » apparaît. Au clic, le user arrive sur la page Lettre
   de motivation avec :
   - Le poste visé pré-rempli
   - Le textarea pré-rempli avec les points pertinents du CV
   - Le nom et email pré-remplis

2. Lettre → CV :
   Le bouton « Importer depuis mon CV » dans la lettre de motivation
   cherche le dernier document CV dans la table documents (tool='cv_writer')
   et extrait les données de content_json pour pré-remplir la lettre.

3. Générateur de plan → Document professionnel / académique :
   Après génération et validation d'un plan dans le Générateur de plan,
   deux boutons : « Rédiger un document professionnel → » et « Rédiger un
   document académique → ». Le plan est passé via le store Zustand et
   pré-chargé dans l'outil cible (il apparaît directement dans les blocs
   d'interaction comme plan déjà validé).

4. Document professionnel / académique → Générateur de plan :
   Dans la zone d'interaction, un lien discret « Utiliser le Générateur
   de plan pour créer un plan plus détaillé → » qui ouvre le Générateur
   dans un panneau latéral ou une nouvelle page avec retour automatique.

Utilise le store Zustand (src/stores/toolStore.ts) pour passer les données
entre outils. Le store contient un champ crossToolData qui est lu par
chaque outil au montage et vidé après utilisation.

Les connexions doivent être naturelles — un petit texte ou bouton au bon
endroit, pas une popup ou une modale.
```

## Refonte Doc 8 — Preview et templates documents

```
Les documents générés doivent avoir un aperçu avant téléchargement et les
templates python-docx doivent produire des fichiers visuellement professionnels.

=== APERÇU CÔTÉ FRONTEND ===

Dans la zone de résultat de chaque outil documentaire, entre le contenu généré
et le bouton Télécharger, ajoute un sélecteur de template avec aperçu :

- 2 miniatures côte à côte montrant les 2 templates disponibles
  (des images statiques représentant chaque design, stockées dans public/)
- Le template sélectionné a une bordure Bleu Boulga
- Un bouton "Aperçu détaillé" qui ouvre une modale avec le contenu rendu
  dans une mise en page qui approxime le template (CSS Grid/Flexbox)

=== TEMPLATES PYTHON-DOCX ===

Vérifie et améliore chaque template dans app/core/document_engine/templates/ :

CV Modern : 2 colonnes, colonne gauche fond sombre (#0B1F3A) avec nom +
contact + compétences en blanc, colonne droite avec expériences et formation.
Titres de section en uppercase 11pt Bleu Boulga. Puces rondes petites.

CV Classique : 1 colonne, nom centré 16pt bold, contact sur une ligne,
sections séparées par des lignes fines. Sobre, noir et Marine uniquement.

Lettre Standard : expéditeur haut gauche, destinataire haut droite,
lieu et date, objet en gras, corps justifié avec indentation première ligne.

Lettre Modern : bandeau Bleu Boulga en haut avec nom et coordonnées en blanc,
corps aéré sans indentation.

Academic Formal : page de garde complète (titre, auteur, établissement,
encadreur, année), table des matières, numérotation des pages.

Academic Clean : titre + auteur en haut de première page, pas de page de
garde séparée, même rigueur de numérotation.

Pro Corporate : page de garde sobre avec titre + auteur + organisation + date,
bandeau fin Bleu Boulga, sections numérotées.

Pro Minimal : pas de page de garde, titre en haut, noir et blanc avec
touches de Marine.

Teste chaque template avec des données fictives réalistes et vérifie le rendu.
```

---

## Ordre d'exécution recommandé

1. **Refonte Doc 1** — Composant AIInteraction (le socle)
2. **Refonte Doc 6** — Migration BDD (avant de toucher aux outils)
3. **Refonte Doc 2** — CV (le premier outil refait de bout en bout)
4. **Refonte Doc 3** — Lettre de motivation
5. **Refonte Doc 4** — Document professionnel
6. **Refonte Doc 5** — Document académique
7. **Refonte Doc 7** — Connexions entre outils
8. **Refonte Doc 8** — Preview et templates

Après chaque refonte, teste avec un cas réel : décris un parcours en texte libre
et vérifie que l'IA propose des blocs pertinents, que les interactions fonctionnent,
et que le document se génère correctement même avec des infos manquantes.

*Boulga AI — Puiser l'intelligence qu'il vous faut.*