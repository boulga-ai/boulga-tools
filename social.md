# Refonte Social Posts — Prompts pour Claude Code

> Exécuter chaque prompt séparément, dans l'ordre. Chaque prompt est autonome mais s'appuie sur les modifications du précédent.

---

## Prompt 1 — Créer le composant ChatMessage réutilisable

```
Dans le dossier components/tools/, crée un composant ChatMessage.tsx.

Ce composant représente une bulle de message dans une interface de chat (comme Claude, ChatGPT).

Props :
- role: "user" | "assistant"
- children: ReactNode (le contenu du message)
- actions?: ReactNode (boutons d'action affichés sous le message côté assistant)
- badge?: string (ex: "Expert ✦", "Avancé", "Pro") — affiché en petit tag en haut à droite du message assistant
- isStreaming?: boolean — si true, affiche un indicateur de génération en cours (3 dots animés à la fin)

Design :
- Message user : bulle alignée à droite, fond bleu clair (bg-blue-50), coins arrondis, texte sombre, padding px-4 py-3, max-width 80%
- Message assistant : aligné à gauche, fond blanc avec bordure fine (border border-border), coins arrondis, padding px-4 py-3, max-width 90%
- Le badge (si présent) : petit tag arrondi en haut à droite du message assistant, texte xs, fond selon le niveau (Expert = bg-amber-50 text-amber-700, Avancé = bg-blue-50 text-blue-700, Pro = bg-gray-100 text-gray-600)
- Les actions (si présentes) : div flex gap-2 sous le contenu du message assistant, avec des boutons outline petits (text-xs)
- Animation dots pour le streaming : 3 spans avec une animation pulse décalée

Utilise les conventions du projet existant (cn(), classes Tailwind, composants shadcn/ui pour les boutons).
```

---

## Prompt 2 — Créer le composant ChatInput (barre d'input chat)

```
Dans components/tools/, crée un composant ChatInput.tsx.

C'est la barre d'envoi de message en bas de l'interface chat — PAS un textarea avec label. C'est un vrai input de chat comme Claude ou ChatGPT.

Props :
- onSend: (message: string) => void
- placeholder?: string
- disabled?: boolean
- isStreaming?: boolean
- onStop?: () => void
- settingsSlot?: ReactNode (contenu à afficher dans un popover ⚙️)

Design et comportement :
- Container : div fixé en bas de la zone chat, fond blanc, bordure top, padding p-3
- Input : un textarea auto-resize (min 1 ligne, max 4 lignes) avec des coins arrondis (rounded-2xl), bordure, padding px-4 py-3. PAS de label au-dessus. Placeholder grisé dans l'input.
- Bouton envoi : à droite de l'input, icône Send (lucide-react), bouton rond, bg bleu Boulga, apparaît seulement quand il y a du texte
- Si isStreaming=true : le bouton envoi devient un bouton Stop (icône Square, rouge/outline)
- Bouton ⚙️ : à gauche de l'input, icône Settings2 (lucide-react), ouvre un Popover (shadcn/ui) contenant le settingsSlot — c'est là qu'on met les options avancées (audience, hashtags, CTA)
- Envoi sur Enter (sans Shift). Shift+Enter = retour à la ligne.
- Après envoi, l'input se vide automatiquement

Utilise les composants shadcn/ui existants (Popover, PopoverTrigger, PopoverContent, Button) et les conventions du projet.
```

---

## Prompt 3 — Créer le composant PlatformChips (sélection plateforme par chips visuels)

```
Dans components/tools/, crée un composant PlatformChips.tsx.

Ce composant remplace le Select dropdown "Plateforme" actuel par des chips/toggles visuels cliquables.

Props :
- value: string (la plateforme sélectionnée)
- onChange: (platform: string) => void
- disabled?: boolean

Plateformes avec icônes (lucide-react) :
- facebook → ThumbsUp, label "Facebook"
- linkedin → Briefcase, label "LinkedIn"
- twitter → X (ou XIcon du projet existant), label "X"
- instagram → Camera, label "Instagram"
- whatsapp → MessageCircle, label "WhatsApp"
- tiktok → Music2, label "TikTok"

Design :
- Container : div flex flex-wrap gap-2
- Chaque chip : bouton avec icône + label, coins arrondis (rounded-full), padding px-3 py-1.5, texte sm
- Non sélectionné : bg-gray-100 text-gray-600 hover:bg-gray-200, bordure transparente
- Sélectionné : bg-bleu-boulga/10 text-bleu-boulga border border-bleu-boulga/30 font-medium (utilise la couleur bleu Boulga du projet, regarde dans tailwind.config ou globals.css pour le nom exact de la variable)
- Icône taille size-4, à gauche du label
- Sur mobile : les chips wrap naturellement sur 2 lignes

Reprends les mêmes valeurs de plateforme que dans le composant SocialPosts.tsx existant.
```

---

## Prompt 4 — Créer le composant ToneChips (sélection du ton)

```
Dans components/tools/, crée un composant ToneChips.tsx.

Même principe que PlatformChips mais pour le ton. Plus compact, sans icônes.

Props :
- value: string
- onChange: (tone: string) => void
- disabled?: boolean

Tons (reprendre ceux du SocialPosts.tsx existant) :
- Convivial, Professionnel, Inspirant, Humoristique, Informatif, Promotionnel

Design :
- Container : div flex flex-wrap gap-1.5
- Chaque chip : bouton texte seulement, rounded-full, px-3 py-1, text-xs
- Non sélectionné : bg-gray-100 text-gray-500 hover:bg-gray-200
- Sélectionné : bg-bleu-boulga text-white font-medium
- Plus compact que PlatformChips — c'est un sélecteur secondaire
```

---

## Prompt 5 — Créer le composant SocialPostCard (card de rendu du post)

```
Dans components/tools/, crée un composant SocialPostCard.tsx.

Ce composant affiche le post généré dans une card stylée qui rappelle visuellement la plateforme cible. Il sera utilisé comme children du ChatMessage assistant.

Props :
- content: string (le texte du post généré)
- platform: string (facebook, linkedin, twitter, instagram, whatsapp, tiktok)
- isStreaming?: boolean

Design :
- Card avec bordure gauche colorée (4px) selon la plateforme :
  - linkedin : bleu LinkedIn (#0A66C2)
  - facebook : bleu Facebook (#1877F2)
  - twitter : noir (#000)
  - instagram : dégradé rose-orange (utilise une bordure rose #E1306C)
  - whatsapp : vert WhatsApp (#25D366)
  - tiktok : noir (#000)
- En-tête de la card : icône de la plateforme + nom de la plateforme en texte xs grisé
- Corps : le texte du post, rendu avec whitespace-pre-wrap pour garder les retours à la ligne. Les hashtags (#...) doivent être stylés en bleu (text-bleu-boulga font-medium)
- Footer : compteur de caractères en text-xs text-muted-foreground. Si platform=twitter et length > 280, afficher "(dépasse la limite X de 280)" en rouge (text-destructive)
- Si isStreaming : le contenu se remplit progressivement (pas de traitement spécial, le texte arrive en streaming, la card grandit naturellement)
- Coins arrondis, padding p-4, fond bg-white

Pour les hashtags : utilise un regex simple pour détecter les mots commençant par # et les wrapper dans un <span> bleu.
```

---

## Prompt 6 — Refondre SocialPosts.tsx en interface chat

```
Refonds complètement le fichier components/tools/SocialPosts.tsx.

IMPORTANT : garde les mêmes imports de hooks (useStreaming) et les mêmes appels API (endpoint /api/v1/tools/transformers/social-posts, mêmes paramètres). Change uniquement l'interface.

Nouveau layout — structure verticale chat :

1. En-tête (en haut, fixe) :
   - Titre "Posts réseaux sociaux" en h2
   - En dessous : composant PlatformChips pour la sélection de plateforme
   - En dessous : composant ToneChips pour le ton
   - Séparateur fin (border-b)

2. Zone de messages (au centre, scrollable, flex-1 overflow-y-auto) :
   - État vide initial : message centré grisé "Décrivez ce que vous voulez publier, l'IA génère un post adapté à la plateforme choisie."
   - Les messages s'empilent : ChatMessage role="user" pour les demandes, ChatMessage role="assistant" contenant SocialPostCard pour les réponses
   - Stocker les messages dans un state local : useState<Array<{role: "user"|"assistant", content: string, platform?: string}>>([])
   - Auto-scroll vers le bas à chaque nouveau message

3. Barre d'input (en bas) :
   - Composant ChatInput
   - placeholder : "Décrivez ce que vous voulez publier..."
   - settingsSlot : les 3 champs optionnels actuels (audience, hashtags, CTA) dans le popover ⚙️, avec des inputs compacts sans labels lourds — juste des placeholders explicites

4. Actions sur chaque message assistant (via la prop actions de ChatMessage) :
   - Bouton "Copier" (CopyButton existant)
   - Bouton "Régénérer" (RotateCcw)
   - Bouton "Adapter" avec un petit Select inline pour choisir un autre réseau → re-génère avec la nouvelle plateforme et ajoute un nouveau message assistant
   - Bouton "Sauvegarder" (Bookmark icon) — pour l'instant juste un placeholder, on fera la logique plus tard

5. Presets de raffinement : après chaque message assistant (quand le streaming est fini), afficher des chips cliquables : "Plus court", "Plus percutant", "Ajoute des emojis". Au clic, ça envoie automatiquement un message de raffinement dans le chat (ajoute un message user avec le texte du preset, puis appelle l'API avec previous_output et refine_instruction).

Flow d'envoi :
- User tape un message → ajoute un ChatMessage user → appelle start() avec les params actuels → le résultat stream dans un ChatMessage assistant avec SocialPostCard
- Pour le raffinement : même chose mais avec previous_output = le dernier output assistant, refine_instruction = le message user

Le composant doit être wrappé dans le ToolLayout existant. Supprime tout le layout grid 2 colonnes, les Label, les Textarea#description, les Select dropdown de plateforme et ton, le Collapsible "Options avancées". Tout ça est remplacé par le chat + chips + popover.

NE MODIFIE PAS les fichiers backend, les hooks, ni les endpoints API.
```

---

## Prompt 7 — Gérer la persistance des messages en session et le scroll

```
Dans le composant SocialPosts.tsx refait au prompt précédent, améliore la gestion des messages et du scroll :

1. Scroll automatique :
   - Ajoute un useRef<HTMLDivElement>(null) sur la zone de messages scrollable
   - useEffect qui scroll vers le bas (scrollTo bottom avec behavior smooth) à chaque changement du tableau de messages ou quand isStreaming change
   - Pendant le streaming, scroll progressif vers le bas pour suivre le texte qui apparaît

2. Gestion du dernier output pour le raffinement :
   - Ajoute un state lastOutput qui stocke le dernier texte généré (mis à jour à la fin de chaque streaming)
   - Quand un preset de raffinement est cliqué ou que le user envoie un message alors qu'il y a déjà un output : utilise lastOutput comme previous_output

3. Réinitialisation :
   - Ajoute un bouton discret "Nouvelle conversation" (icône Plus) dans l'en-tête, à côté du titre
   - Au clic : vide le tableau de messages, reset lastOutput, reset les chips à leurs valeurs par défaut

4. Compteur de messages :
   - Affiche discrètement le nombre de générations dans la session en cours quelque part (ex: dans le header "3 posts générés")

Assure-toi que le state des messages est bien typé et que le composant ne re-render pas inutilement (pas de problèmes de performance avec le streaming).
```

---

## Prompt 8 — Ajouter le badge de qualité du modèle sur les messages

```
Dans SocialPosts.tsx, ajoute l'affichage du badge de qualité sur chaque message assistant.

1. Déterminer le niveau :
   - Lis le profil utilisateur via useAuth() (déjà importé ou à importer). Le champ profile.current_tier donne le palier (introduction, goutte, source, fleuve, ocean).
   - Mapping palier → badge label :
     - "ocean" ou "fleuve" → "Expert ✦"
     - "source" → "Avancé"
     - "goutte" → "Pro"
     - "introduction" → "Standard" (sauf si c'est une des 3 générations Expert bonus — on gèrera ça plus tard)

2. Passe le badge en prop au composant ChatMessage pour chaque message assistant :
   <ChatMessage role="assistant" badge={badgeLabel}>

3. Le badge est déjà stylé dans ChatMessage (prompt 1). Vérifie juste que le mapping est correct et que le badge s'affiche bien.

4. Ajoute aussi le badge "Gratuit" existant (le span vert) dans le header du composant si le palier est "introduction", comme c'était avant. Pour les autres paliers, pas de badge dans le header.
```

---

## Prompt 9 — Ajouter le système de sauvegarde optionnelle des posts

```
Ajoute la fonctionnalité de sauvegarde optionnelle des posts générés.

1. Nouveau endpoint backend (si pas déjà existant) :
   - POST /api/v1/tools/saved-generations
   - Body : { tool: "social_posts", content: string, metadata: { platform: string, tone: string } }
   - Stocke dans une table saved_generations (user_id, tool, content, metadata jsonb, created_at)
   - Si la table n'existe pas, crée une migration Supabase ou un script SQL pour la créer

2. Dans SocialPosts.tsx :
   - Le bouton "Sauvegarder" (Bookmark) dans les actions du ChatMessage appelle ce endpoint
   - Au clic : appel API, puis change l'icône en BookmarkCheck (lucide-react) et désactive le bouton avec un tooltip "Sauvegardé"
   - Si erreur : toast ou message discret

3. GET /api/v1/tools/saved-generations?tool=social_posts
   - Retourne les posts sauvegardés de l'utilisateur, triés par date desc
   - Pour l'instant on ne l'affiche nulle part dans Social Posts (on fera une page "Mes créations" plus tard), mais l'endpoint doit exister

NE modifie PAS le système de quota existant. La sauvegarde ne consomme pas de quota.
```

---

## Prompt 10 — Polish UI et responsive mobile

```
Fais une passe de polish sur le composant SocialPosts.tsx refait :

1. Responsive mobile :
   - Les PlatformChips doivent bien wrapper sur 2 lignes sur mobile (flex-wrap est déjà là, vérifie que ça marche en < 400px)
   - La zone de messages doit prendre toute la hauteur disponible (h-full ou flex-1 dans un flex flex-col h-screen ou h-[calc(100vh-...)])
   - Le ChatInput doit être sticky en bas, pas caché par le clavier mobile (position sticky bottom-0)
   - Les actions sous les messages assistant doivent wrapper proprement (flex-wrap gap-1.5)

2. Transitions et animations :
   - Les messages apparaissent avec une animation fade-in slide-up subtile (CSS transition ou Tailwind animate-in)
   - Le changement de plateforme dans PlatformChips a une transition de couleur douce (transition-colors duration-150)

3. État vide attractif :
   - Quand il n'y a aucun message, au centre de la zone : une illustration ou icône grande (Share2 en taille 48, opacity 20%), avec le texte d'invite en dessous
   - Des suggestions cliquables sous le texte d'invite : 3 exemples de demandes courtes en chips grisés, au clic ça pré-remplit l'input
   - Exemples : "Lancement de produit à Dakar", "Offre de stage en informatique", "Promo week-end restaurant"

4. Bordures et détails :
   - La SocialPostCard doit avoir une ombre subtile (shadow-sm)
   - L'en-tête avec les chips doit avoir un fond légèrement différent (bg-gray-50/50) pour se distinguer de la zone de messages
   - La barre d'input doit avoir une ombre vers le haut (shadow-[0_-2px_10px_rgba(0,0,0,0.05)])

5. Accessibilité :
   - Tous les boutons ont des aria-label explicites
   - Le textarea du ChatInput a un aria-label "Message"
   - Les chips ont role="radio" et aria-checked
```