# Boulga AI — Prompts correctifs (après les 20 prompts initiaux)

Ce fichier contient les prompts d'amélioration à exécuter dans Claude Code après la V1
initiale. Ils corrigent l'UX des outils, le rendu des outputs, et affinent les prompts LLM.
Exécuter dans l'ordre, un par un, comme les 20 premiers.

---

## Correction 1 — Rendu des outputs : Markdown → HTML propre (tous les outils)

```
Le composant StreamingOutput affiche du Markdown brut (les **, les ---, les tirets) sans
le rendre. C'est illisible pour l'utilisateur.

Corrige StreamingOutput.tsx pour rendre le Markdown en HTML stylé pendant le streaming.

Utilise react-markdown (installe-le) avec les plugins remark-gfm pour les tableaux et
listes. Style le rendu avec les classes Tailwind de la charte Boulga :
- Les titres (h1, h2, h3) en Marine #0B1F3A, avec les tailles de la charte
- Le gras en semibold, pas juste font-weight
- Les listes à puces avec des puces propres, indentées
- Les blocs de code avec fond #F2F4F7, police mono, border-radius 8px
- Les séparateurs (---) en une ligne fine #E4E7EC, pas un triple tiret textuel
- Les paragraphes avec un espacement vertical aéré (mb-3)
- Les liens en Bleu Boulga #1565C0

Le rendu doit être fluide PENDANT le streaming (pas de flash à chaque chunk).
Ajoute un conteneur avec une classe prose adaptée (mais personnalisée aux couleurs Boulga,
pas les valeurs par défaut de Tailwind typography).

Teste sur le Reformulateur/Correcteur qui produit déjà de bonnes réponses Markdown —
elles doivent maintenant s'afficher proprement formatées.
```

## Correction 2 — Pattern UX : Rédacteur d'email pro (conversationnel)

```
Le Rédacteur d'email pro a actuellement un formulaire avec des champs séparés (Contexte,
Destinataire, Objectif, Ton). C'est trop rigide — le user doit décomposer sa pensée en cases
alors que le LLM peut extraire tout ça d'une description naturelle.

Refactore src/app/(dashboard)/tools/email-writer/page.tsx :

AVANT (formulaire rigide) :
- Champ Contexte
- Champ Destinataire
- Champ Objectif de l'email
- Dropdown Ton
- Bouton Rédiger

APRÈS (conversationnel + choix de cadrage) :
- Un textarea principal avec le label « Décrivez l'email que vous souhaitez rédiger »
  et le placeholder « Ex : Je dois relancer un client qui n'a pas payé sa facture
  depuis 3 semaines, c'est ma deuxième relance... »
- Un dropdown Ton (Professionnel, Convivial, Formel, Neutre — optionnel, valeur par
  défaut « Professionnel »)
- Un lien discret « + Options avancées » qui déplie :
  - Champ « Objet de l'email (optionnel) » — si laissé vide, le LLM le génère lui-même
  - Champ « Précisions supplémentaires (optionnel) »
- Bouton « Rédiger l'email »

Côté backend, adapte le prompt dans app/core/llm/prompts/email.py :
- Le prompt doit dire au LLM qu'il reçoit une description libre de l'email souhaité
  et qu'il doit en extraire le contexte, le destinataire, l'objectif, puis rédiger
  un email professionnel complet (objet + corps + formule de politesse).
- Si un objet est fourni explicitement, l'utiliser (en le corrigeant si nécessaire).
  Sinon, le générer à partir du contenu.
- Le ton choisi dans le dropdown est passé comme paramètre au prompt.

L'output email doit être structuré visuellement :
- L'objet en gras en haut, mis en valeur (fond léger ou bordure gauche Bleu Boulga)
- Le corps de l'email formaté proprement
- La formule de politesse en italique
- Un bouton « Copier l'email » bien visible qui copie tout (objet + corps)
- Un bouton « Copier le corps seulement » en secondaire

L'historique des emails reste fonctionnel (table conversations).
```

## Correction 3 — Pattern UX : Posts réseaux sociaux (conversationnel)

```
Le formulaire Posts réseaux sociaux est trop chargé : Sujet/thème, Plateforme, Ton,
Audience cible, Message clé, Appel à l'action. L'utilisateur moyen ne sait pas ce qu'est
un « message clé » ou un « appel à l'action » au sens marketing.

Refactore src/app/(dashboard)/tools/social-posts/page.tsx :

APRÈS :
- Un textarea principal avec le label « Que voulez-vous publier ? » et le placeholder
  « Ex : On lance notre nouveau service de livraison à Ouagadougou, tarif spécial
  la première semaine... »
- Un dropdown « Plateforme » (Facebook, WhatsApp, Instagram, LinkedIn, X/Twitter) —
  obligatoire, c'est le seul vrai choix structurant
- Un dropdown Ton (optionnel, défaut « Convivial »)
- Un lien « + Options avancées » qui déplie :
  - Champ « Audience cible (optionnel) »
  - Champ « Hashtags ou mots-clés souhaités (optionnel) »
  - Champ « Appel à l'action souhaité (optionnel) »

Côté backend, adapte le prompt dans le module de prompt des posts réseaux sociaux :
- Le LLM reçoit la description libre + la plateforme + le ton
- Il génère un post adapté aux codes de la plateforme (longueur, format, hashtags
  pour Instagram/LinkedIn, pas de hashtags pour WhatsApp, etc.)
- Si l'audience ou les mots-clés sont précisés, les intégrer. Sinon, les inférer.

L'output doit afficher :
- Le post généré, formaté comme il apparaîtrait sur la plateforme
- Un compteur de caractères (pertinent pour X/Twitter et LinkedIn)
- Bouton « Copier le post »
```

## Correction 4 — Pattern UX : Discours et pitchs (conversationnel)

```
Le formulaire Discours et pitchs demande trop de champs séparés : Type, Contexte/occasion,
Audience, Points clés à couvrir, Durée, Ton, Instructions particulières.

Refactore src/app/(dashboard)/tools/speeches/page.tsx (ou le nom actuel de la page) :

APRÈS :
- Un dropdown « Type de discours » (Pitch commercial, Pitch de soutenance, Discours
  cérémoniel, Prise de parole en public) — obligatoire, c'est le cadrage principal
- Un textarea principal avec le label « Décrivez votre discours » et le placeholder
  adapté au type sélectionné :
  * Si pitch commercial : « Ex : Je présente ma startup de logistique devant 20
    investisseurs, notre solution résout le problème du dernier kilomètre... »
  * Si soutenance : « Ex : Je soutiens mon mémoire sur la transformation digitale
    des PME au Burkina Faso, devant un jury de 3 professeurs... »
  * Si discours : « Ex : Discours d'ouverture pour la cérémonie de remise de
    diplômes de l'université... »
- Un dropdown Durée (3 min, 5 min, 10 min, 15 min, 20 min) — obligatoire
- Un dropdown Ton (optionnel, défaut « Professionnel »)
- Un lien « + Options avancées » qui déplie :
  - Champ « Points spécifiques à couvrir (optionnel) »
  - Champ « Informations sur l'audience (optionnel) »

Côté backend, adapte le prompt :
- Le LLM reçoit le type + la description libre + la durée + le ton
- Il extrait le contexte, l'audience, les points clés de la description
- Pour un pitch de soutenance, il anticipe les questions du jury
- La durée doit être respectée (environ X mots pour Y minutes)
- Le texte est structuré pour l'oral : accroche, corps, conclusion

L'output doit afficher :
- Le discours avec une structure claire (sections visuelles)
- Un indicateur « Durée estimée de lecture : X min »
- Bouton « Copier le discours »
```

## Correction 5 — Amélioration du Rédacteur d'email : output structuré

```
L'output de l'email doit ressembler visuellement à un email, pas à un bloc de texte.

Crée un composant src/components/tools/EmailOutput.tsx qui remplace le StreamingOutput
brut pour l'outil email :

Structure visuelle :
- Un conteneur type « carte email » avec une bordure fine, fond blanc, border-radius 12px
- En haut : une barre avec « Objet : » en label gris et le texte de l'objet en gras Marine
- En dessous : le corps de l'email, avec les paragraphes bien espacés, la formule de
  politesse en fin, le tout rendu en Markdown→HTML
- En bas de la carte : une barre d'actions avec :
  - Bouton primaire « Copier l'email complet » (Bleu Boulga)
  - Bouton secondaire « Copier le corps seulement »
  - Bouton ghost « Régénérer »

Le composant doit pouvoir être alimenté en streaming : l'objet apparaît en premier
(le prompt LLM doit commencer par générer l'objet sur la première ligne), puis le
corps s'affiche progressivement en dessous.

Adapte le prompt email pour qu'il génère toujours dans cet ordre :
Ligne 1 : Objet: [l'objet de l'email]
Puis une ligne vide
Puis le corps de l'email

Le composant EmailOutput parse cette structure pendant le streaming pour séparer
l'objet du corps et les afficher dans leurs zones respectives.
```

## Correction 6 — Accents et caractères français dans toute l'interface

```
Je remarque que les textes de l'interface n'ont pas d'accents dans plusieurs endroits :
- « Generateur de plan » → « Générateur de plan »
- « Genere des publications adaptees a chaque reseau social » → « Génère des publications
  adaptées à chaque réseau social »
- « Le resultat apparaitra ici » → « Le résultat apparaîtra ici »
- « Redacteur d'email pro » → « Rédacteur d'email pro »
- « Detecteur de contenu IA » → « Détecteur de contenu IA »
- « Verificateur de plagiat » → « Vérificateur de plagiat »
- Les placeholders aussi : « Promotion, annonce, actualite » → « Promotion, annonce,
  actualité... »
- « detaille » → « détaillé »
- « Decrivez la situation » → « Décrivez la situation... »

Fais une passe complète sur TOUS les fichiers du frontend (pages des outils, sidebar,
composants, placeholders, labels, descriptions, messages d'erreur, boutons) pour corriger
tous les accents manquants. L'interface est en français — les accents ne sont pas optionnels.

Vérifie aussi les descriptions sous les titres d'outils dans la sidebar et sur la page
d'accueil (grille d'outils).
```

## Correction 7 — Prompts LLM : qualité des réponses en français

```
Les réponses LLM semblent « pas appropriées » selon les retours utilisateur. Le problème
vient probablement des prompts système qui ne sont pas assez cadrés.

Revois TOUS les prompts système dans app/core/llm/prompts/ avec ces règles :

1. Chaque prompt système doit commencer par :
   « Tu es un assistant professionnel francophone spécialisé en [domaine de l'outil].
   Tu rédiges exclusivement en français, avec un style [adapté à l'outil]. »

2. Chaque prompt doit préciser le format de sortie attendu :
   - Pour l'email : « Commence TOUJOURS par la ligne "Objet: [objet]" suivie d'une
     ligne vide, puis le corps de l'email. Termine par une formule de politesse adaptée
     au contexte francophone professionnel. »
   - Pour les posts : « Adapte le format à la plateforme [plateforme]. Pour LinkedIn,
     utilise un ton professionnel et des paragraphes courts. Pour WhatsApp, sois concis
     et direct. Pour Instagram, utilise des emojis pertinents et des hashtags. »
   - Pour les discours : « Structure le texte pour l'oral : accroche percutante, corps
     argumenté, conclusion mémorable. Utilise des phrases courtes, un vocabulaire
     accessible. La durée cible est [X] minutes (environ [Y] mots). »

3. Interdis au LLM de produire des méta-commentaires :
   « Ne fournis AUCUNE explication, note ou commentaire. Produis directement le contenu
   demandé, prêt à être utilisé. »
   Exception : le Reformulateur/Correcteur DOIT expliquer ses corrections (c'est sa valeur).

4. Pour le Reformulateur/Correcteur, affine le prompt pour qu'il sépare clairement :
   - D'abord le texte corrigé/reformulé (dans un bloc distinct)
   - Puis les explications des corrections (en dessous)
   Le user doit pouvoir copier le texte corrigé sans les explications.

5. Vérifie que chaque prompt utilise bien le ton passé en paramètre s'il est fourni.

Teste chaque outil modifié avec un cas réel et vérifie que la réponse est directement
utilisable, en français correct, sans méta-commentaires parasites.
```

## Correction 8 — Reformulateur : séparer texte corrigé et explications

```
Le Reformulateur/Correcteur fonctionne bien mais son output mélange le texte corrigé
et les explications dans un seul flux. Le user doit pouvoir copier le texte corrigé
sans les explications.

Crée un composant src/components/tools/ReformulatorOutput.tsx qui remplace le
StreamingOutput brut pour cet outil :

Structure visuelle :
- Zone haute « Texte corrigé » : fond blanc, bordure gauche Bleu Boulga 3px, padding,
  texte rendu en HTML (Markdown→HTML). Bouton « Copier le texte corrigé » en haut à droite.
- Zone basse « Corrections apportées » : fond #F5F7FA (fond neutre), texte plus petit,
  explications rendues en HTML.

Pour que ça fonctionne avec le streaming, adapte le prompt du Reformulateur pour qu'il
utilise un séparateur clair :
- D'abord le texte corrigé
- Puis la ligne « ---CORRECTIONS--- » (séparateur technique que le composant intercepte)
- Puis les explications

Le composant ReformulatorOutput parse le flux en temps réel :
- Tant que le séparateur n'est pas reçu, tout va dans la zone « Texte corrigé »
- Après le séparateur, tout va dans la zone « Corrections apportées »
- Le séparateur lui-même n'est jamais affiché

Si le mode est « reformulation » (pas « correction »), il n'y a pas besoin d'explications —
le prompt ne doit pas en générer et seule la zone haute s'affiche.
```

## Correction 9 — Sidebar : accents, organisation, outils hors V1

```
La sidebar affiche les outils mais il y a des problèmes :
1. Les noms manquent d'accents (corrigé par la Correction 6, mais vérifie)
2. Des outils hors périmètre V1 sont visibles (Posts réseaux sociaux, Discours et pitchs)
   alors que le CDC ne les inclut pas dans les 11 outils V1

Corrige la sidebar :
- Retire « Posts réseaux sociaux » et « Discours et pitchs » de la sidebar active.
  S'ils sont déjà codés et fonctionnels, garde-les accessibles mais marque-les comme
  « Bientôt » (texte grisé, icône cadenas, non cliquable) ou bien garde-les actifs
  si le fondateur préfère — mais ne les affiche pas comme des outils V1 standard.
  
  DÉCISION À PRENDRE : puisque ces outils sont déjà codés et fonctionnels grâce aux
  20 prompts, on peut les garder actifs. Dans ce cas, applique simplement les corrections
  UX des Corrections 3 et 4 pour les rendre utilisables proprement.

- Vérifie que les catégories dans la sidebar correspondent au CDC :
  * OUTILS GRATUITS : Convertisseur de fichiers, Détecteur de contenu IA,
    Vérificateur de plagiat
  * RÉDACTION : Reformulateur / Correcteur, Rédacteur d'email pro, Chat IA
  * DOCUMENTS : Rédacteur de CV, Lettre de motivation, Générateur de plan,
    Document professionnel, Document académique
  * Si Posts réseaux sociaux et Discours sont gardés, les mettre dans une catégorie
    « AUTRES OUTILS » ou les intégrer dans RÉDACTION

- Vérifie que l'espacement, les icônes et les hover sont cohérents avec la charte.
```

## Correction 10 — Page d'accueil : grille d'outils propre

```
La page d'accueil (dashboard) doit présenter les outils de manière claire et engageante.

Vérifie et corrige src/app/(dashboard)/page.tsx :

- Chaque outil est une carte cliquable avec :
  - Icône lucide cohérente (outline, 24px, Bleu Boulga)
  - Titre de l'outil (avec accents)
  - Description d'une ligne (avec accents)
  - Badge de catégorie discret (Gratuit / Rédaction / Documents)
  - Hover : élévation légère (shadow), bordure Bleu Boulga subtile

- Les outils gratuits sont visuellement mis en avant (badge vert « Gratuit »)
- Les outils qui nécessitent un abonnement ont un petit indicateur discret

- La grille est responsive :
  - Desktop : 3 colonnes
  - Tablette : 2 colonnes
  - Mobile : 1 colonne

- En haut de la page : « Bienvenue sur Boulga AI » avec le slogan
  « Puiser l'intelligence qu'il vous faut » en sous-titre

- Sous le titre : le QuotaBar résumé (« X mots restants ce mois »)

Vérifie que les descriptions de chaque outil sont en français correct avec accents.
```

## Correction 11 — Générateur de plan : type de document élargi

```
Le Générateur de plan affiche une liste de types de documents (Rapport de stage, Mémoire,
Thèse, Rapport d'activité, Note de service, Proposition commerciale, Business plan,
Étude de cas, Analyse SWOT).

C'est bien fait, mais vérifie et corrige :
1. Tous les labels ont les bons accents (« Mémoire » pas « Memoire », « Thèse » pas « These »,
   « Étude de cas » pas « Etude de cas »)
2. Le placeholder du champ Sujet devrait être conversationnel :
   « Décrivez le sujet ou le thème de votre document... »
3. Le dropdown Profondeur devrait avoir des labels clairs :
   « Résumé (3-4 sections) », « Standard (5-8 sections) », « Détaillé (8-12 sections) »
   et non pas juste « résumé / standard / détaillé »

Le plan généré doit être éditable (réordonner, renommer, ajouter, supprimer des sections)
comme prévu dans le CDC. Vérifie que cette fonctionnalité est bien implémentée et
fonctionnelle. Si ce n'est pas le cas, implémente-la :
- Chaque section du plan est un élément draggable (ou avec des boutons haut/bas)
- Bouton « + Ajouter une section » en bas
- Icône poubelle pour supprimer une section
- Clic sur le texte d'une section pour l'éditer inline
- Bouton « Régénérer le plan » pour recommencer
- Bouton « Utiliser ce plan → Document professionnel » et
  « Utiliser ce plan → Document académique » pour enchaîner
```

## Correction 12 — Boutons Copier fonctionnels et feedback visuel

```
Vérifie que TOUS les boutons « Copier » de TOUS les outils sont fonctionnels et donnent
un feedback visuel clair.

Pour chaque outil qui a un output textuel (Reformulateur, Email, Posts, Discours, Chat,
Plan) :

1. Le bouton « Copier » utilise l'API Clipboard (navigator.clipboard.writeText).
2. Au clic : le texte du bouton change brièvement (1.5s) de « Copier » à « Copié ✓ »
   avec un changement de couleur (Bleu Boulga → Succès #2E7D32), puis revient.
3. Si l'API Clipboard n'est pas disponible (certains navigateurs mobiles), fallback
   vers la sélection du texte dans un textarea caché + document.execCommand('copy').
4. Le bouton est désactivé (grisé) tant que la génération est en cours (streaming).
5. Le contenu copié est le texte BRUT (pas le Markdown), nettoyé des séparateurs
   techniques comme ---CORRECTIONS---.

Crée un hook utilitaire src/hooks/useCopy.ts qui encapsule cette logique et qui est
réutilisé par tous les outils.
```

## Correction 13 — États de chargement et gestion d'erreurs

```
Vérifie et améliore les états de chargement et la gestion d'erreurs sur tous les outils.

1. Pendant la génération (streaming en cours) :
   - Le bouton de soumission affiche un spinner + « Génération en cours... » et est désactivé
   - Un indicateur de streaming est visible dans la zone output (curseur clignotant ou
     barre de progression pulsante)
   - Le bouton « Arrêter » est visible et fonctionnel (ferme la connexion SSE)

2. Si la génération échoue (erreur réseau, timeout, erreur LLM) :
   - Un message d'erreur clair en français s'affiche dans la zone output, stylé avec la
     couleur Erreur #C62828, fond légèrement rosé
   - Messages types : « Une erreur est survenue. Veuillez réessayer. »,
     « La génération a pris trop de temps. Veuillez réessayer. »,
     « Vous avez atteint votre limite de mots ce mois-ci. Passez au palier supérieur
     pour continuer. » (code 402)
   - Un bouton « Réessayer » est affiché

3. Si le quota est épuisé (402 du backend) :
   - Message clair : « Vous avez utilisé tous vos mots disponibles ce mois-ci. »
   - Bouton d'upgrade : « Passer au palier supérieur » → redirige vers /settings

4. Avant toute génération, si le textarea principal est vide :
   - Le bouton est désactivé
   - Pas de requête envoyée

5. Zone output vide (avant première génération) :
   - Affiche « Le résultat apparaîtra ici. » en gris italique (avec accents !)
   - Pas de placeholder brutal
```

---

*Exécute ces 13 corrections dans l'ordre. Commite après chaque correction.
Après la correction 7 (prompts LLM), teste chaque outil avec un cas réel
pour vérifier la qualité des réponses en français.*