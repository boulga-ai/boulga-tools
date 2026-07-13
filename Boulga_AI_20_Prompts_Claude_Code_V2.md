# Boulga AI — 20 prompts de construction pour Claude Code

Ce document contient vingt prompts à exécuter **dans l'ordre**, un par un, dans Claude Code (VS Code). Chaque prompt est autoportant et s'appuie sur le résultat du précédent. Ils couvrent les **13 outils V1** et suivent la feuille de route du cahier des charges technique.

## Les 13 outils V1

| # | Outil | Famille | LLM |
|---|---|---|---|
| 1 | Convertisseur de fichiers | Traitement | Aucun |
| 2 | Détecteur de contenu IA | Analyse | Copyleaks + ChatGPT (réécriture) |
| 3 | Vérificateur de plagiat | Analyse | Copyleaks + ChatGPT (correction) |
| 4 | Reformulateur / Correcteur | Rédaction | ChatGPT |
| 5 | Rédacteur d'email pro | Rédaction | ChatGPT |
| 6 | Chat IA généraliste | Rédaction | ChatGPT |
| 7 | Rédacteur de posts réseaux sociaux | Rédaction | ChatGPT |
| 8 | Rédacteur de discours et pitchs | Rédaction | ChatGPT |
| 9 | Générateur de plan / outline | Document avancé | Claude |
| 10 | Rédacteur de CV | Document avancé | Claude |
| 11 | Rédacteur de lettre de motivation | Document avancé | Claude |
| 12 | Rédacteur de document professionnel | Document avancé | Claude |
| 13 | Rédacteur de documents académiques longs | Document avancé | Claude |

## Principe de routage LLM

**Rédaction courte** (outils 2-8) → **ChatGPT via OpenRouter** : rapide, bon en français, coût maîtrisé.
**Documents avancés** (outils 9-13) → **Claude via OpenRouter** : meilleur en structuration, JSON, documents longs.

| Famille | Introduction (gratuit) | Goutte / Source | Fleuve / Océan |
|---|---|---|---|
| Rédaction (email, chat, reformulateur, posts, discours, réécriture IA/plagiat) | gpt-4o-mini | gpt-4o | gpt-4o |
| Documents avancés (CV, lettre, plan, doc pro, doc académique) | — (pas dispo) | claude-sonnet-4-6 | claude-sonnet-4-6 |
| Scores IA / plagiat | Copyleaks | Copyleaks | Copyleaks |
| Convertisseur | — (pas de LLM) | — | — |

## Comment utiliser ces prompts

1. Crée à la racine du monorepo un fichier `CLAUDE.md` avec le bloc contexte ci-dessous. Claude Code le lira automatiquement.
2. Colle **un seul prompt à la fois**. Laisse Claude Code terminer, **relis le diff, teste**, puis passe au suivant.
3. Après chaque prompt, fais un `git commit` avant d'enchaîner.
4. Ne saute pas d'étape : les prompts 9 à 20 supposent que le socle (1 à 8) est en place.

---

## Bloc contexte — à copier dans `CLAUDE.md` (racine du repo)

```markdown
# Contexte projet — Boulga AI

Boulga AI est une plateforme de 13 outils IA de production documentaire académique
et professionnelle pour l'Afrique de l'Ouest francophone. Interface 100 % en français,
desktop-first responsive. Slogan : « Puiser l'intelligence qu'il vous faut ».
Principe fondateur : la génération bornée (input défini, output prévisible, quotas explicites).

## Les 13 outils V1
1. Convertisseur de fichiers (gratuit, sans LLM)
2. Détecteur de contenu IA (Copyleaks + réécriture ChatGPT)
3. Vérificateur de plagiat (Copyleaks + correction ChatGPT)
4. Reformulateur / Correcteur (ChatGPT)
5. Rédacteur d'email pro (ChatGPT)
6. Chat IA généraliste (ChatGPT)
7. Rédacteur de posts réseaux sociaux (ChatGPT)
8. Rédacteur de discours et pitchs (ChatGPT)
9. Générateur de plan / outline (Claude)
10. Rédacteur de CV (Claude)
11. Rédacteur de lettre de motivation (Claude)
12. Rédacteur de document professionnel (Claude)
13. Rédacteur de documents académiques longs — parcours 7 étapes (Claude)

## Routage LLM (via OpenRouter, endpoint unique)
- Rédaction courte (outils 2-8) → ChatGPT : gpt-4o-mini (gratuit), gpt-4o (payant)
- Documents avancés (outils 9-13) → Claude : claude-sonnet-4-6 (payant uniquement)
- Scores IA/plagiat → Copyleaks (gratuit)
- Convertisseur → pas de LLM

## Stack imposée
- Frontend : Next.js 15 (App Router, dossier src/, TypeScript), Tailwind CSS,
  shadcn/ui, Zustand, @supabase/ssr, lucide-react. Déploiement Vercel.
- Backend : FastAPI (>=0.136), Python 3.12, Uvicorn, port local 8003. Déploiement Railway.
- BDD + Auth + Storage : Supabase (PostgreSQL).
- LLM : OpenRouter (endpoint unique OpenAI-compatible).
- Détection IA / plagiat : Copyleaks API.
- Génération de documents : python-docx ; conversion PDF via LibreOffice headless.
- Paiement : FedaPay (préparé, branché plus tard).

## Architecture
- Monolithe modulaire : un repo backend, un repo frontend (ou monorepo à 2 dossiers).
- Le navigateur parle à Supabase (auth + lectures RLS) ET à FastAPI (LLM, documents, quotas).
- FastAPI est la SEULE porte vers les LLM. Aucune clé API côté client.
- Écritures sensibles (quotas, usage_logs, subscriptions, current_tier) : FastAPI via service_role.
- Streaming des générations LLM en Server-Sent Events (SSE), client → FastAPI en direct.

## Charte
- Couleurs : Marine #0B1F3A, Bleu Boulga #1565C0, Fond neutre #F5F7FA, Blanc #FFFFFF,
  Succès #2E7D32, Attention #F57C00, Erreur #C62828, Info #1565C0.
- Police : Inter. Icônes : lucide-react (outline). Rayons : 4px inputs, 8px boutons, 12px cards.
- Esprit Claude : sobre, généreux en blanc, une seule couleur d'action (Bleu Boulga).

## Paliers d'abonnement
introduction (gratuit), goutte, source, fleuve, ocean.
Palier Introduction : accès aux outils ChatGPT (rédaction) uniquement, 5000 mots/mois, 0 téléchargement.
Palier Goutte+ : accès à TOUS les outils y compris les documents avancés (Claude).
Super admin par défaut : boulgacorporation@gmail.com.

## Règles de code
- Toujours pinner les versions. Toujours un .env.example à jour (jamais de secret committé).
- CORS backend : http://localhost:3000, :3001, :3002 + domaine prod.
- Interface et messages utilisateur en français. Jamais de « tokens » dans l'UI : parler de « mots ».
- Ne jamais exposer de clé OpenRouter/Copyleaks/service_role au frontend.
```

---

## PHASE 0 — FONDATIONS (prompts 1 à 8)

### Prompt 1 — Squelette backend FastAPI

```
Initialise le backend de Boulga AI dans un dossier `boulga-backend/`.

Objectif : un squelette FastAPI propre, démarrable, sans logique métier encore.

À créer :
- `app/main.py` : app FastAPI, middleware CORS (origines http://localhost:3000, :3001,
  :3002 + variable ALLOWED_ORIGINS), un endpoint GET /health qui renvoie {"status":"ok"},
  montage d'un router api/v1.
- `app/config.py` : configuration via pydantic-settings, lit le .env (SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, OPENROUTER_API_KEY, COPYLEAKS_EMAIL,
  COPYLEAKS_API_KEY, ENV, PORT=8003, ALLOWED_ORIGINS, ADMIN_EMAIL, LLM_ROUTING_JSON,
  FEDAPAY_* laissés vides).
- `app/api/v1/router.py` : router principal v1 (vide pour l'instant, juste inclus dans main).
- Arborescence vide prête pour la suite : app/api/v1/tools/, app/api/webhooks/, app/core/,
  app/core/llm/prompts/, app/core/document_engine/templates/, app/core/file_converter/,
  app/core/copyleaks/, app/models/, app/db/, app/utils/ (avec des __init__.py).
- `requirements.txt` : fastapi>=0.136, uvicorn[standard], pydantic>=2.0,
  pydantic-settings>=2.0, supabase>=2.0, httpx, python-docx, python-multipart, pypdf,
  openpyxl, python-pptx, Pillow, sse-starlette, python-jose[cryptography].
- `.env.example` complet (toutes les variables ci-dessus, sans valeurs secrètes).
- `.gitignore` (venv, __pycache__, .env).
- `README.md` court : comment lancer (uvicorn app.main:app --reload --port 8003).

Contrainte : Python 3.12, port 8003. Ne mets aucun secret en dur.
Valide en démarrant le serveur et en appelant /health.
```

---

### Prompt 2 — Squelette frontend Next.js + charte

```
Initialise le frontend de Boulga AI dans un dossier `boulga-frontend/` avec Next.js 15
(App Router, dossier src/, TypeScript, Turbopack).

À créer :
- Projet Next.js 15 avec Tailwind CSS et la structure src/app.
- Initialise shadcn/ui (composants dans src/components/ui).
- Installe : @supabase/supabase-js, @supabase/ssr, zustand, lucide-react.
- `src/app/globals.css` : définis les variables CSS de la charte Boulga en :root
  (--marine #0B1F3A, --bleu-boulga #1565C0, --fond-neutre #F5F7FA, --blanc #FFFFFF,
  --succes #2E7D32, --attention #F57C00, --erreur #C62828, --info #1565C0) et une échelle
  de nuances du bleu 50→900. Configure Tailwind pour exposer ces couleurs.
- Police Inter via next/font, appliquée globalement. Tailles : h1 28px/600, h2 22px/600,
  h3 18px/600, body 15px/400, boutons 14px/500. Interlignage 1.5 corps, 1.25 titres.
- Rayons : 4px inputs, 8px boutons, 12px cards.
- Une page d'accueil temporaire (src/app/page.tsx) affichant « Boulga AI » et le slogan
  « Puiser l'intelligence qu'il vous faut » stylés à la charte, pour valider le thème.
- `.env.example` : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_BACKEND_URL=http://localhost:8003.
- `.gitignore` standard Next.

Contrainte : desktop-first, esprit Claude (sobre, beaucoup de blanc, une seule couleur
d'action). Interface en français. Valide avec npm run dev.
```

---

### Prompt 3 — Base de données Supabase (schéma + RLS + trigger)

```
Crée la migration SQL complète de Boulga AI dans `boulga-backend/supabase/migrations/0001_init.sql`.

Implémente exactement le schéma du cahier des charges technique :
- Table profiles (extension de auth.users) : id (PK → auth.users, ON DELETE CASCADE),
  full_name, phone, role ('user'|'admin' default 'user'),
  current_tier ('introduction'|'goutte'|'source'|'fleuve'|'ocean' default 'introduction'),
  created_at, updated_at.
- Table subscriptions : id, user_id (FK profiles), tier, billing_period ('monthly'|'annual'),
  amount_fcfa, status ('active'|'expired'|'cancelled' default 'active'), started_at,
  expires_at, fedapay_transaction_id, created_at.
- Table quotas : id, user_id (FK profiles), period (TEXT 'YYYY-MM'), words_used default 0,
  words_limit, downloads_used default 0, downloads_limit, UNIQUE(user_id, period).
- Table usage_logs : id, user_id, tool, model, tokens_in, tokens_out,
  cost_usd DECIMAL(10,6), tier, created_at.
- Table documents : id, user_id, tool, title, template, format ('docx'|'pdf'),
  storage_path, content_json JSONB, created_at.
- Table academic_sessions : id, user_id, status ('in_progress'|'completed'|'abandoned'),
  current_step (1..7), doc_type, domain, topic, outline_json JSONB, sections_json JSONB,
  template, created_at, updated_at.
- Table conversations : id, user_id, tool, title, messages_json JSONB default '[]',
  created_at, updated_at.
- Tous les index du CDC.

Sécurité (dans le même fichier ou 0002_rls.sql) :
- Active RLS sur toutes les tables.
- Policies SELECT : l'utilisateur voit ses lignes (auth.uid() = user_id), l'admin voit tout
  (via EXISTS sur profiles role='admin'). Sur profiles, chacun voit/modifie son profil.
- AUCUNE policy d'écriture côté client sur quotas, usage_logs, subscriptions, ni sur
  profiles.current_tier (ces écritures passeront par le service_role backend).
- Trigger sur auth.users après insertion : crée la ligne profiles (full_name depuis les
  metadata, tier 'introduction') ET la ligne quotas du mois courant (5000 mots, 0 dl).
- Seed : donne role='admin' au compte dont l'email = boulgacorporation@gmail.com.

Crée aussi les 3 buckets Storage : uploads (30j), generated (permanent), temp (24h).
Documente comment appliquer la migration (Supabase CLI ou SQL editor).
```

---

### Prompt 4 — Auth backend (JWT Supabase) + client service_role

```
Implémente la couche d'authentification et d'accès BDD du backend Boulga.

À créer :
- `app/db/supabase.py` : client Supabase Python initialisé avec l'URL et la
  SERVICE_ROLE_KEY (accès privilégié, côté serveur uniquement). Expose un singleton réutilisable.
- `app/core/auth.py` : vérification du JWT Supabase. Récupère et met en cache les clés
  JWKS du projet Supabase (cache 1h), valide la signature du token reçu dans l'en-tête
  Authorization: Bearer, extrait user_id (sub) et email.
- `app/dependencies.py` : dépendances FastAPI injectables :
  - get_current_user(request) → renvoie {user_id, email} ou 401.
  - require_admin(user) → vérifie role='admin' dans profiles (via service_role), sinon 403.
  - get_profile(user_id) → lit profiles (tier, role, full_name, phone).
- Un endpoint de test GET /api/v1/me protégé qui renvoie le profil de l'utilisateur courant
  (id, email, full_name, current_tier, role).

Contrainte : jamais de vérification de rôle uniquement côté client. Le JWT est vérifié sur
chaque requête protégée. Valide avec un token Supabase réel sur /api/v1/me.
```

---

### Prompt 5 — Auth frontend (inscription, connexion, Google, protection des routes)

```
Implémente l'authentification côté frontend Boulga avec Supabase Auth et @supabase/ssr.

À créer :
- `src/lib/supabase/client.ts` (client navigateur) et `src/lib/supabase/server.ts`
  (client serveur avec cookies) via @supabase/ssr.
- `src/lib/api.ts` : helper fetch vers FastAPI (NEXT_PUBLIC_BACKEND_URL) qui attache
  automatiquement le JWT Supabase dans Authorization: Bearer.
- Groupe de routes (auth) :
  - `src/app/(auth)/register/page.tsx` : formulaire nom complet, email, mot de passe,
    numéro de téléphone → inscription Supabase (email/mdp) avec full_name et phone en metadata.
  - `src/app/(auth)/login/page.tsx` : connexion email/mot de passe.
  - Bouton « Continuer avec Google » (OAuth Supabase) sur les deux pages.
  - `src/app/api/auth/callback/route.ts` : callback OAuth.
- `src/middleware.ts` : protège tout le groupe (dashboard). Non connecté → redirection /login.
  Session durable (refresh automatique via @supabase/ssr).
- `src/stores/authStore.ts` (Zustand) : état utilisateur courant + profil.
- `src/hooks/useAuth.ts`.

Contrainte : session durable comme Claude (l'utilisateur reste connecté). Formulaires et
messages en français, stylés à la charte. Après connexion, rediriger vers /(dashboard).
Valide inscription, connexion email et Google.
```

---

### Prompt 6 — Cœur LLM : client OpenRouter, routeur ChatGPT/Claude, streaming, coûts

```
Implémente le cœur d'appel aux modèles de langage du backend Boulga. Aucune UI ici.

POINT CLÉ — Boulga utilise DEUX familles de modèles via OpenRouter :
- ChatGPT (OpenAI) pour la rédaction courte : reformulateur, email, chat, posts sociaux,
  discours, réécriture IA/plagiat
- Claude (Anthropic) pour les documents avancés : CV, lettre, plan, doc pro, doc académique

À créer :
- `app/core/llm/router.py` : la matrice de routage outil × palier → modèle OpenRouter.

  Matrice par défaut (les noms sont les identifiants OpenRouter) :

  RÉDACTION (ChatGPT) :
  | Outil | Introduction | Goutte/Source | Fleuve/Océan |
  |---|---|---|---|
  | reformulator | openai/gpt-4o-mini | openai/gpt-4o | openai/gpt-4o |
  | email_writer | openai/gpt-4o-mini | openai/gpt-4o | openai/gpt-4o |
  | chat | openai/gpt-4o-mini | openai/gpt-4o | openai/gpt-4o |
  | social_posts | openai/gpt-4o-mini | openai/gpt-4o | openai/gpt-4o |
  | speech_writer | — | openai/gpt-4o | openai/gpt-4o |
  | ai_detector_rewrite | — | openai/gpt-4o | openai/gpt-4o |
  | plagiarism_correction | — | openai/gpt-4o | openai/gpt-4o |

  DOCUMENTS AVANCÉS (Claude) :
  | Outil | Introduction | Goutte/Source | Fleuve/Océan |
  |---|---|---|---|
  | cv_writer | — | anthropic/claude-sonnet-4-6 | anthropic/claude-sonnet-4-6 |
  | cover_letter | — | anthropic/claude-sonnet-4-6 | anthropic/claude-sonnet-4-6 |
  | planner | — | anthropic/claude-sonnet-4-6 | anthropic/claude-sonnet-4-6 |
  | pro_doc_writer | — | anthropic/claude-sonnet-4-6 | anthropic/claude-sonnet-4-6 |
  | academic_writer | — | anthropic/claude-sonnet-4-6 | anthropic/claude-sonnet-4-6 |

  « — » signifie non disponible pour ce palier → 403 avec message d'upgrade.
  Chargeable depuis la variable LLM_ROUTING_JSON si présente (override sans redéploiement).
  Expose resolve_model(tool, tier) → nom de modèle OpenRouter.

- `app/core/llm/client.py` : client OpenRouter async (httpx), endpoint
  https://openrouter.ai/api/v1/chat/completions, mode streaming. Headers :
  Authorization: Bearer {OPENROUTER_API_KEY}, HTTP-Referer: https://boulga.ai, X-Title: Boulga AI.
  Consomme le flux SSE et yield les deltas de texte. À la fin, expose l'objet
  usage (tokens_in, tokens_out).

  Table de prix (USD/M tokens, juillet 2026) :
  MODEL_PRICES = {
      "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
      "openai/gpt-4o": {"input": 2.50, "output": 10.00},
      "anthropic/claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
      "anthropic/claude-opus-4-6": {"input": 5.00, "output": 25.00},
  }
  Fonction compute_cost(model, tokens_in, tokens_out) → cost_usd.

- `app/core/llm/prompts/__init__.py` : structure pour un module de prompt par outil (vide
  pour l'instant, on remplira au fur et à mesure).
- `app/utils/tokens.py` : comptage de mots d'un texte (pour les quotas).

Contrainte : la clé OpenRouter reste côté backend. Prévois le streaming dès maintenant
(générateur async). Ne câble pas encore d'endpoint HTTP — juste la brique réutilisable.
Note budgétaire : OpenRouter prélève ~5,5 % sur les crédits — à intégrer dans le calcul de marge.
```

---

### Prompt 7 — Système de quotas + journalisation des coûts

```
Implémente la gestion des quotas et la journalisation des coûts du backend Boulga.

À créer :
- `app/core/quota.py` :
  - get_or_create_quota(user_id, tier) : récupère la ligne quotas du mois courant
    (période 'YYYY-MM'), la crée à la volée si absente avec les limites du palier.
  - check_quota(user_id, tier, kind) : vérifie le solde avant génération. kind ∈
    {'words','downloads'}. Insuffisant → lève une erreur HTTP 402 avec message français
    clair invitant à monter de palier.
  - consume_words(user_id, n) et consume_download(user_id) : décrément ATOMIQUE via
    service_role (UPDATE ... SET words_used = words_used + n WHERE ...).
  - Limites par palier (provisoires, configurables) :
    introduction 5000 mots / 0 dl,
    goutte 40000 / 10,
    source 120000 / 30,
    fleuve 300000 / 80,
    ocean illimité (fair-use 999999999).
- `app/core/usage.py` : log_usage(user_id, tool, model, tokens_in, tokens_out, cost_usd, tier)
  qui insère dans usage_logs via service_role.
- Une dépendance FastAPI check_quota_dep utilisable dans les endpoints d'outils.
- Endpoint GET /api/v1/quota : renvoie le solde du mois courant (mots restants, dl restants)
  pour l'utilisateur connecté.

Contrainte : le décrément et le log se font EN FIN de génération (tokens réels connus).
Jamais de « tokens » exposés à l'utilisateur — l'endpoint /quota renvoie des mots.
```

---

### Prompt 8 — Layout dashboard, sidebar (13 outils), QuotaBar, gabarit d'outil

```
Construis le layout applicatif du frontend Boulga (esprit Claude), sans encore implémenter
les outils eux-mêmes. Le dashboard affiche les 13 outils V1.

À créer :
- `src/app/(dashboard)/layout.tsx` : structure sidebar gauche fixe + zone principale.
- `src/components/layout/Sidebar.tsx` : logo Boulga en haut, liste des 13 outils groupés
  par pack :

  Pack « Outils gratuits » :
    - Convertisseur de fichiers (icône ArrowRightLeft)
    - Détecteur de contenu IA (icône ScanSearch)
    - Vérificateur de plagiat (icône Shield)

  Pack « Rédaction » (ChatGPT) :
    - Reformulateur / Correcteur (icône RefreshCw)
    - Rédacteur d'email pro (icône Mail)
    - Chat IA (icône MessageSquare)
    - Posts réseaux sociaux (icône Share2)
    - Discours et pitchs (icône Mic)

  Pack « Documents avancés » (Claude) :
    - Rédacteur de CV (icône FileUser)
    - Lettre de motivation (icône FileHeart)
    - Générateur de plan (icône ListTree)
    - Document professionnel (icône Briefcase)
    - Document académique (icône GraduationCap)

  Liens Documents et Paramètres, avatar + menu en bas.

- `src/components/layout/QuotaBar.tsx` : compteur permanent « X mots restants ce mois » et
  « X téléchargements restants », alimenté par GET /api/v1/quota. Clic → /settings.
- `src/components/layout/Header.tsx` : mobile uniquement (burger + titre).
- `src/app/(dashboard)/page.tsx` : accueil = grille de cartes des 13 outils (titre, description
  d'une phrase, badge pack coloré, icône lucide, badge « ChatGPT » ou « Claude » ou « Gratuit »
  pour identifier le moteur). Les outils ChatGPT portent un badge vert « Gratuit dès l'inscription »,
  les outils Claude portent un badge bleu « Dès le palier Goutte ».
- `src/components/tools/ToolLayout.tsx` : gabarit commun (titre + description en haut,
  zone d'input, zone de résultat, zone d'actions).
- `src/components/tools/StreamingOutput.tsx` : affichage d'un flux SSE en temps réel.
- `src/hooks/useQuota.ts` et `src/hooks/useStreaming.ts` (consommation SSE via fetch +
  ReadableStream, avec bouton Arrêter).
- Pages vides placeholder pour les 13 outils sous src/app/(dashboard)/tools/ :
  converter, ai-detector, plagiarism, reformulator, email-writer, chat,
  social-posts, speech-writer, cv-writer, cover-letter, plan-generator,
  pro-doc-writer, academic-writer.
- Pages placeholder : documents, settings, admin (page, users, costs).
- `src/stores/toolStore.ts`.

Contrainte : desktop-first ; sur mobile (<768px) la sidebar devient un drawer. Sobre,
beaucoup de blanc, Bleu Boulga comme seule couleur d'action. Tout en français.
```

---

## PHASE 1 — OUTILS DE RÉDACTION ChatGPT (prompts 9 à 13)

### Prompt 9 — Reformulateur / Correcteur (premier outil de bout en bout)

```
Implémente le premier outil complet de Boulga : le Reformulateur / Correcteur. C'est le
patron de référence pour tous les outils de rédaction (ChatGPT) en streaming.

Backend :
- `app/core/llm/prompts/reformulator.py` : prompts système selon le mode (reformulation,
  correction, simplification, formalisation, académisation) et le ton (Convivial, Académique,
  Professionnel, Neutre, Persuasif, Formel — le choix de ton est réservé aux paliers payants).

  MODES = {
      "reformulation": "Tu es un expert en rédaction française. Reformule le texte fourni en
       conservant le sens exact mais en améliorant la fluidité et le style. Adapte au ton demandé.",
      "correction": "Tu es un correcteur professionnel de textes en français. Corrige toutes les
       fautes d'orthographe, de grammaire, de syntaxe et de ponctuation. Explique brièvement les
       corrections majeures à la fin.",
      "simplification": "Tu es un expert en communication claire. Simplifie le texte pour le rendre
       accessible, en utilisant des phrases courtes et un vocabulaire simple.",
      "formalisation": "Tu es un expert en rédaction formelle. Transforme le texte en version
       professionnelle adaptée à un contexte institutionnel ou administratif.",
      "academisation": "Tu es un expert en rédaction académique francophone. Transforme le texte en
       style académique : vocabulaire précis, tournures impersonnelles, phrases structurées."
  }
  TONES = {"convivial": "...", "academique": "...", "professionnel": "...", "neutre": "...",
           "persuasif": "...", "formel": "..."}

- `app/models/transformers.py` : ReformulatorRequest(text, mode, tone).
- `app/api/v1/tools/transformers.py` : endpoint POST /api/v1/tools/transformers/reformulator
  qui : vérifie le JWT, vérifie le quota mots, résout le modèle via resolve_model('reformulator', tier)
  → renvoie un modèle ChatGPT (gpt-4o-mini en gratuit, gpt-4o en payant),
  appelle OpenRouter en streaming, renvoie un flux SSE (events delta, usage, done, error).
  En fin de flux : log_usage + consume_words.
  Format SSE :
    event: delta → data: {"text": "..."}
    event: usage → data: {"tokens_in": N, "tokens_out": N, "cost_usd": N}
    event: done → data: {"words": N}
    event: error → data: {"code": "...", "message": "..."}

Frontend :
- `src/app/(dashboard)/tools/reformulator/page.tsx` : via ToolLayout —
  textarea source (min 4 lignes, auto-expand, max 50000 caractères),
  sélecteur de mode (5 options avec labels français),
  sélecteur de ton (6 options, désactivé + badge « Dès le palier Goutte » si palier gratuit),
  bouton « Transformer » (icône Wand2, bleu-boulga),
  StreamingOutput pour le résultat, boutons Copier et Régénérer.
  Layout : deux colonnes desktop (input gauche, output droite), empilé mobile.
  Utilise useStreaming pour le temps réel.

Contrainte : ce prompt valide TOUT le pipeline de bout en bout :
auth → quota check → LLM routing → OpenRouter streaming (ChatGPT) → SSE → usage_logs → quota décrément.
Le sélecteur de ton n'est actif qu'à partir du palier Goutte. Valide avec un vrai compte.
```

---

### Prompt 10 — Rédacteur d'email pro + Rédacteur de posts réseaux sociaux

```
Implémente deux outils de rédaction ChatGPT qui réutilisent le patron du Reformulateur :
le Rédacteur d'email pro et le Rédacteur de posts réseaux sociaux.

=== RÉDACTEUR D'EMAIL PRO ===

Backend :
- `app/core/llm/prompts/email.py` : prompt produisant un email francophone professionnel
  complet (objet + corps + formule de politesse) à partir de contexte, destinataire, objectif, ton.
  System prompt : « Tu es un expert en communication professionnelle française. Tu rédiges
  des emails professionnels clairs, structurés et adaptés au contexte. Produis : 1. Un objet
  d'email concis 2. Le corps complet avec formule d'appel, contenu structuré et formule de
  politesse. Adapte le niveau de formalité au ton demandé. »
- `app/models/transformers.py` (ajouter) : EmailWriterRequest(context, recipient, objective, tone, conversation_id?).
- Endpoint POST /api/v1/tools/transformers/email-writer (SSE), modèle ChatGPT, même cycle
  (quota, routeur tool='email_writer', log, consume_words).
- Persistance : enregistre chaque génération dans conversations (tool='email_writer').

Frontend :
- `src/app/(dashboard)/tools/email-writer/page.tsx` : champs contexte (textarea),
  destinataire (input), objectif (textarea), ton (select 6 options) ;
  bouton « Rédiger l'email » (icône Mail) ; StreamingOutput ; bouton Copier.
  Historique des emails générés (panel latéral, chargé depuis conversations).

=== RÉDACTEUR DE POSTS RÉSEAUX SOCIAUX ===

Backend :
- `app/core/llm/prompts/social_posts.py` :
  System prompt : « Tu es un expert en communication digitale et community management pour
  le marché francophone africain. Tu rédiges des posts engageants pour les réseaux sociaux.

  Règles :
  - Adapte le ton, la longueur et le style au réseau social choisi
  - LinkedIn : professionnel, informatif, 150-300 mots, hashtags pertinents (3-5)
  - Facebook : conversationnel, engageant, 100-200 mots, émojis mesurés
  - X/Twitter : concis, percutant, max 280 caractères, hashtags (1-3)
  - Instagram : visuel (décris l'image idéale en [IMAGE: ...]), texte 100-150 mots, hashtags (5-10)
  - WhatsApp Status : très court, 1-3 phrases, informel
  - TikTok : script court pour une vidéo, accroche forte en 3 secondes

  Inclus toujours : une accroche, le message principal, un appel à l'action. »

- `app/models/transformers.py` (ajouter) :
  SocialPostRequest(subject, platform, tone, target_audience, key_message, call_to_action?).
  platform ∈ {'linkedin', 'facebook', 'twitter', 'instagram', 'whatsapp', 'tiktok'}

- Endpoint POST /api/v1/tools/transformers/social-posts (SSE), modèle ChatGPT, même cycle.
  tool='social_posts'. Gratuit dès le palier Introduction (même modèle gpt-4o-mini).

Frontend :
- `src/app/(dashboard)/tools/social-posts/page.tsx` :
  - Sujet / thème du post (textarea)
  - Plateforme cible (select avec icônes : LinkedIn, Facebook, X, Instagram, WhatsApp, TikTok)
  - Ton (select : Professionnel, Décontracté, Inspirant, Humoristique, Informatif, Promotionnel)
  - Audience cible (input : « étudiants », « entrepreneurs », « recruteurs »...)
  - Message clé (textarea : le point principal à faire passer)
  - Appel à l'action (input, optionnel : « Commentez », « Visitez notre site »...)
  - Bouton « Générer le post » (icône Share2)
  - StreamingOutput avec le post généré
  - Boutons : Copier, Régénérer, « Adapter pour un autre réseau » (change la plateforme et relance)
  - Badge « Gratuit » affiché en haut de la page

Contrainte : les deux outils utilisent ChatGPT. L'email est dans le pack Rédaction.
Les posts réseaux sociaux sont accessibles dès l'Introduction (gratuit). Français.
```

---

### Prompt 11 — Chat IA généraliste

```
Implémente le Chat IA généraliste (ChatGPT), borné par quota de mots.

Backend :
- `app/core/llm/prompts/chat.py` :
  System prompt : « Tu es Boulga, un assistant IA intelligent, serviable et bienveillant,
  conçu pour les étudiants et professionnels d'Afrique de l'Ouest francophone.
  Tu réponds en français par défaut, sauf si l'utilisateur écrit dans une autre langue.
  Tu es compétent dans tous les domaines : académique, professionnel, technique, créatif.
  Tu es honnête sur tes limites et tu ne fabriques pas d'informations.
  Tu ne génères JAMAIS de fichier — oriente vers les outils spécialisés de Boulga AI. »

- Endpoint POST /api/v1/tools/transformers/chat (SSE) :
  Body : { message: str, conversation_id: str | None }
  - Charge l'historique depuis conversations si conversation_id fourni
  - Limite l'historique envoyé au LLM : les 20 derniers messages max (coûts de tokens d'entrée)
  - Résout le modèle : resolve_model('chat', tier) → ChatGPT (gpt-4o-mini ou gpt-4o)
  - Stream la réponse
  - Sauvegarde le message user ET la réponse assistant dans conversations.messages_json
  - Retourne conversation_id dans l'event done
  - Décrémente le quota mots, log l'usage

- GET /api/v1/tools/chat/conversations : liste des conversations (tool='chat'), triées par date DESC
- GET /api/v1/tools/chat/conversations/{id} : détail avec messages
- DELETE /api/v1/tools/chat/conversations/{id} : suppression (vérif ownership)

Frontend :
- `src/app/(dashboard)/tools/chat/page.tsx` : interface de chat inspirée de Claude.

  Layout deux colonnes :

  COLONNE GAUCHE (sidebar chat ~240px) :
  - Bouton « Nouvelle conversation » en haut
  - Liste des conversations existantes (titre = 50 premiers caractères du premier message, date relative)
  - Clic → charge la conversation
  - Bouton supprimer (Trash2, avec confirmation)

  COLONNE DROITE (zone de chat) :
  - Si aucune conversation : message d'accueil « Bonjour ! Je suis Boulga, votre assistant IA... »
  - Liste des messages (bulles user à droite en bleu-boulga-50, bulles assistant à gauche en blanc)
  - En bas : textarea auto-resize + bouton Envoyer (Send), fixe
  - Pendant le streaming : dernier message assistant en temps réel avec curseur clignotant
  - Bouton « Arrêter » visible pendant le streaming
  - Mots restants affichés sous l'input
  - Scroll automatique vers le bas

  Sur mobile : la sidebar des conversations est un Sheet/drawer.

Contrainte : ChatGPT comme moteur. Borné par quota mots. Pas de génération de fichier. Français.
```

---

### Prompt 12 — Rédacteur de discours et pitchs

```
Implémente le Rédacteur de discours et pitchs (ChatGPT), outil du Pack Business.

Backend :
- `app/core/llm/prompts/speech.py` :
  System prompt : « Tu es un expert en rédaction de discours, présentations orales et pitchs
  pour le contexte francophone professionnel et académique.

  Types de discours que tu maîtrises :
  - Pitch (elevator pitch 1-2 min, pitch investisseur 5-10 min, pitch commercial)
  - Discours formel (cérémonie, remise de diplôme, inauguration)
  - Présentation professionnelle (réunion, conférence, webinaire)
  - Discours de motivation (équipe, étudiants)
  - Toast / discours d'occasion (mariage, départ, célébration)
  - Soutenance (mémoire, thèse, rapport de stage)

  Règles :
  - Structure claire : accroche forte, développement, conclusion mémorable
  - Adapte le registre au contexte et à l'audience
  - Inclus des indications scéniques entre crochets [pause], [regarder le public], [slide suivante]
  - Indique la durée estimée du discours
  - Pour les pitchs : suis la structure problème → solution → marché → équipe → demande
  - Phrases courtes et rythmées, faciles à dire à voix haute
  - Utilise des techniques rhétoriques (anaphore, gradation, question rhétorique) quand adapté »

- `app/models/transformers.py` (ajouter) :
  SpeechRequest(
      speech_type: str,  # pitch_elevator, pitch_investor, pitch_commercial, formal,
                         # professional, motivation, toast, soutenance
      context: str,      # occasion, événement, contexte
      audience: str,     # à qui s'adresse-t-on
      key_points: str,   # points principaux à couvrir
      duration: str,     # "1 min", "5 min", "15 min", "30 min"
      tone: str,         # professionnel, inspirant, solennel, décontracté, persuasif
      specific_instructions: str | None  # consignes particulières
  )

- Endpoint POST /api/v1/tools/transformers/speech-writer (SSE), modèle ChatGPT.
  tool='speech_writer'. Disponible dès le palier Goutte (pas en Introduction).

Frontend :
- `src/app/(dashboard)/tools/speech-writer/page.tsx` :
  - Type de discours (select avec les 8 options, labels français avec description courte)
  - Contexte / occasion (textarea : « Présentation de mon startup devant des investisseurs »)
  - Audience (input : « 20 investisseurs, profils tech et finance »)
  - Points clés à couvrir (textarea : « Notre solution résout X, marché de Y milliards... »)
  - Durée souhaitée (select : 1 min, 3 min, 5 min, 10 min, 15 min, 30 min)
  - Ton (select : Professionnel, Inspirant, Solennel, Décontracté, Persuasif)
  - Instructions particulières (textarea optionnel)
  - Bouton « Rédiger le discours » (icône Mic)
  - StreamingOutput avec le discours
  - En fin de génération : affiche la durée estimée (calculée : ~130 mots/minute)
  - Boutons : Copier, Régénérer, « Version plus courte » (relance avec durée -50%), « Version plus longue »
  - Badge « Dès le palier Goutte » si utilisateur en Introduction

Contrainte : ChatGPT comme moteur. Le discours inclut des indications scéniques.
Pas de génération de fichier (le discours est du texte à copier). Français.
Accessible dès Goutte (pas en gratuit car la qualité doit être au rendez-vous).
```

---

### Prompt 13 — Convertisseur de fichiers (sans LLM)

```
Implémente le Convertisseur de fichiers : gratuit, illimité, sans appel LLM.

Backend :
- `app/core/file_converter/converter.py` : conversions entre PDF, Word, Excel, PowerPoint,
  image. Utilise LibreOffice headless (Office ↔ PDF), pypdf (fusion et séparation de PDF),
  Pillow (images). Fonctions : convert(file, target_format), merge_pdfs(files), split_pdf(file, pages).
  Validation stricte : extension + type MIME + taille max 25 Mo.
- `app/utils/storage.py` : helpers Supabase Storage (upload vers bucket, URL signée, suppression).
- `app/api/v1/tools/converter.py` :
  POST /api/v1/tools/converter/convert (multipart : file + output_format) → URL signée 24h
  POST /api/v1/tools/converter/merge (multipart : files[]) → URL signée
  POST /api/v1/tools/converter/split (multipart : file + pages "1,3,5-8") → URL signée
  Auth requise mais PAS de quota (gratuit). Fichiers dans bucket temp (TTL 24h).

Frontend :
- `src/app/(dashboard)/tools/converter/page.tsx` :
  3 onglets (Tabs shadcn) :

  Onglet « Convertir » :
  - Zone de drop (drag & drop) + bouton « Choisir un fichier »
  - Affiche nom, taille, type après upload
  - Select format de sortie (options dynamiques selon le type d'entrée)
  - Bouton « Convertir » (ArrowRightLeft)
  - Après conversion : bouton « Télécharger »

  Onglet « Fusionner PDF » :
  - Zone de drop multiple
  - Liste ordonnée des fichiers (drag pour réordonner, bouton supprimer)
  - Bouton « Fusionner » (Merge)

  Onglet « Séparer PDF » :
  - Zone de drop (un PDF)
  - Input « Pages à extraire » (placeholder : « 1,3,5-8 »)
  - Bouton « Extraire » (Scissors)

  Badge « Gratuit et illimité » affiché en haut. Indicateur de progression.

Contrainte : aucun appel LLM, coût nul. Gère les erreurs de format (fichier trop gros,
format non supporté). Français.
```

---

## PHASE 2 — ANALYSEURS (prompts 14 à 15)

### Prompt 14 — Copyleaks + Détecteur de contenu IA

```
Implémente le client Copyleaks puis le Détecteur de contenu IA.

Backend :
- `app/core/copyleaks/client.py` : authentification Copyleaks (login via email + clé API,
  cache du token 24h), soumission d'un scan de détection IA, récupération du résultat
  (score + passages surlignés). Mode mock si COPYLEAKS_EMAIL est vide (retourne des données
  simulées pour le dev).
- `app/core/llm/prompts/ai_rewrite.py` : prompt de réécriture stylistique (les 6 tons).
  « Tu es un expert en rédaction française. Réécris le texte pour qu'il sonne naturel et humain.
  Conserve le sens, varie les phrases, utilise des expressions idiomatiques françaises. »
- `app/api/v1/tools/analyzers.py` :
  POST /api/v1/tools/analyzers/ai-detector/scan : renvoie le score IA (gratuit, hors quota).
  Accepte texte collé OU fichier (extraction côté backend : pypdf pour PDF, python-docx pour DOCX).
  POST /api/v1/tools/analyzers/ai-detector/rewrite : réécriture payante (dès Goutte),
  modèle ChatGPT (gpt-4o), streaming SSE, décrément quota mots.

Frontend :
- `src/app/(dashboard)/tools/ai-detector/page.tsx` :

  ÉTAPE 1 — Analyse (gratuite) :
  - Textarea OU drop de fichier (PDF, DOCX, TXT)
  - Bouton « Analyser » (ScanSearch)
  - Résultat : score « X% IA / Y% Humain » avec jauge colorée (rouge=IA, vert=humain),
    texte avec passages suspects surlignés en rouge/orange

  ÉTAPE 2 — Réécriture (payante, ChatGPT) :
  - Bouton « Réécrire dans un autre ton » (visible seulement si tier ≥ Goutte)
  - Si Introduction : badge « Disponible dès le palier Goutte » + bouton upgrade
  - Select du ton (6 options)
  - Bouton « Réécrire » → streaming
  - Vue côte à côte : original (highlights) | version réécrite
  - Bouton « Copier la version réécrite »

Contrainte : le score est TOUJOURS gratuit et hors quota. La réécriture utilise ChatGPT
(pas Claude — c'est de la rédaction, pas un document avancé). Français.
```

---

### Prompt 15 — Vérificateur de plagiat

```
Implémente le Vérificateur de plagiat, en réutilisant le client Copyleaks.

Backend :
- Étends `app/core/copyleaks/client.py` pour le scan de plagiat (score + passages détectés +
  sources). Les scans Copyleaks sont asynchrones : soumission puis polling (ou webhook).
  Mode mock si COPYLEAKS_EMAIL vide.
- `app/core/llm/prompts/plagiarism.py` : prompt de correction (reformulation des passages plagiés).
  « Pour chaque passage similaire à une source existante, reformule-le complètement pour qu'il
  soit original tout en conservant le sens. Format : [PASSAGE N] suivi du texte reformulé. »
- `app/api/v1/tools/analyzers.py` (compléter) :
  POST /api/v1/tools/analyzers/plagiarism/scan : soumet le scan (gratuit, hors quota).
  GET /api/v1/tools/analyzers/plagiarism/result/{scan_id} : polling du résultat.
  POST /api/v1/tools/analyzers/plagiarism/correct : correction payante (dès Goutte),
  modèle ChatGPT, streaming SSE, décrément quota mots.

Frontend :
- `src/app/(dashboard)/tools/plagiarism/page.tsx` :

  ÉTAPE 1 — Soumission : textarea ou fichier, bouton « Vérifier le plagiat » (Shield).
  ÉTAPE 2 — Résultat (polling toutes les 3s) :
  - Animation pendant le scan « Analyse en cours... (30 secondes environ) »
  - Score global « X% de contenu similaire »
  - Passages surlignés en jaune avec source URL cliquable et % de similarité
  ÉTAPE 3 — Correction (payante, ChatGPT) :
  - Bouton « Corriger les passages détectés » (si tier ≥ Goutte, sinon upsell)
  - Select ton
  - Stream la correction : vue côte à côte passage original → version corrigée
  - Bouton « Appliquer toutes les corrections » → texte complet corrigé → Copier

Contrainte : score gratuit hors quota ; correction payante via ChatGPT. Français.
```

---

## PHASE 3 — MOTEUR DOCUMENTS ET GÉNÉRATEURS COURTS (prompts 16 à 18)

### Prompt 16 — Moteur de génération de documents

```
Implémente le moteur documentaire réutilisable de Boulga (schémas, rendu, PDF, storage).
Aucun outil complet ici — juste le moteur. Les outils qui génèrent des documents (CV, lettre,
doc pro, doc académique) utilisent TOUS ce moteur.

Backend :
- `app/core/document_engine/schema.py` : modèles Pydantic du contenu structuré :

  ContactInfo(email, phone?, address?, linkedin?)
  Experience(title, company, location?, start_date, end_date?, description, achievements[])
  Education(degree, institution, location?, year, details?)
  LanguageLevel(language, level)
  CVContent(full_name, title, contact, summary, experiences[], education[], skills[], languages[], certifications[])
  CoverLetterContent(full_name, contact, recipient_name?, recipient_title?, company_name, date, subject, greeting, paragraphs[], closing, signature)
  ProSection(title, content, subsections[])
  ProDocContent(doc_type, title, author, organization?, date, sections[ProSection])
  OutlineSection(id, title, level, children[])
  Outline(sections[OutlineSection])
  AcademicDocContent(doc_type, title, author, institution, supervisor?, year, outline, sections{id→content}, bibliography[]?, abstract?)

- `app/core/document_engine/renderer.py` : prend un contenu validé + un nom de template →
  construit un .docx via python-docx (styles, polices Inter/Calibri, couleurs charte, marges).
  Un template = un module Python avec une fonction build(content) → chemin .docx.
- `app/core/document_engine/pdf.py` : conversion .docx → .pdf via LibreOffice headless
  (soffice --headless --convert-to pdf). Timeout 30s.
- `app/utils/storage.py` (compléter si nécessaire).
- `app/api/v1/documents.py` :
  POST /api/v1/documents/render : reçoit {content_json, doc_type, template, format},
  valide avec le schéma Pydantic, rend le fichier, upload dans bucket generated
  ({user_id}/{document_id}.{ext}, permanent), insère dans table documents, décrémente
  quota téléchargement, renvoie URL signée 15 min. Conserve content_json pour regénération.
  GET /api/v1/documents : historique de l'utilisateur.
  GET /api/v1/documents/{id}/download : nouvelle URL signée.
  POST /api/v1/documents/{id}/rerender : regénère dans un autre template/format
  SANS nouvel appel LLM (utilise le content_json stocké, ne consomme que le quota dl).

Contrainte : le template ne touche QUE le design, jamais le contenu. Regénérer dans un autre
template/format = 0 quota mots (seul le quota dl s'applique).
```

---

### Prompt 17 — Templates + Rédacteur de CV + Rédacteur de lettre de motivation

```
Implémente les templates python-docx, puis le Rédacteur de CV et le Rédacteur de lettre
de motivation. Ces deux outils utilisent Claude (documents avancés).

=== TEMPLATES ===

`app/core/document_engine/templates/` :
- cv_modern.py : 2 colonnes, colonne gauche (30%) fond marine avec contact/compétences/langues
  en blanc, colonne droite (70%) avec nom, titre, résumé, expériences, formation. Accent Bleu Boulga.
- cv_classic.py : 1 colonne sobre, nom centré, sections séparées par lignes horizontales.
- letter_standard.py : format lettre classique française (expéditeur, destinataire, lieu/date,
  objet, corps, formule de politesse). Marges 2.5cm.
- letter_modern.py : header avec bande marine, mise en page aérée, accent bleu pour l'objet.

=== RÉDACTEUR DE CV (Claude) ===

Backend :
- `app/core/llm/prompts/cv.py` :
  ANALYZE_PROMPT : « Tu es un expert en recrutement francophone. Analyse les infos du candidat,
  identifie les manques, propose des suggestions (reformulation d'intitulé, compétences oubliées).
  Réponds en JSON : {completeness_score, missing_fields[], suggestions{}, recommended_skills[]} »
  GENERATE_PROMPT : « Génère un CV complet et optimisé. Résumé 3-4 lignes percutant. Expériences
  avec réalisations chiffrées. Réponds en JSON CVContent valide. Schéma : {schema} »
- Endpoints :
  POST /api/v1/tools/generators/cv/analyze (JSON, suggestions) — Claude
  POST /api/v1/tools/generators/cv (SSE, génère CVContent en JSON structuré streamé) — Claude
  Les deux utilisent resolve_model('cv_writer', tier) → claude-sonnet-4-6. Non dispo en Introduction.

Frontend :
- `src/components/tools/SmartForm.tsx` : formulaire intelligent générique (champs dynamiques
  + bouton « Analyser mes informations » + affichage des suggestions).
- `src/components/tools/TemplateSelector.tsx` (2 designs), `FormatSelector.tsx` (PDF/Word),
  `DocumentPreview.tsx`.
- `src/app/(dashboard)/tools/cv-writer/page.tsx` :
  PHASE 1 — Formulaire : poste visé, nom (pré-rempli), contact (pré-rempli), résumé (optionnel),
  expériences (répétable), formation (répétable), compétences (input tags), langues, certifications.
  Bouton « Analyser » → panel suggestions avec score, champs manquants, skills recommandés.
  PHASE 2 — Bouton « Générer mon CV » → streaming du contenu structuré → preview lisible.
  PHASE 3 — TemplateSelector (Moderne/Classique) + FormatSelector → « Télécharger » →
  appelle /documents/render → download.

=== RÉDACTEUR DE LETTRE DE MOTIVATION (Claude) ===

Backend :
- `app/core/llm/prompts/cover_letter.py` : prompts analyze + generate pour CoverLetterContent.
  Structure : accroche + pourquoi cette entreprise, parcours + compétences, adéquation, conclusion.
- Endpoints POST /api/v1/tools/generators/cover-letter/analyze et
  POST /api/v1/tools/generators/cover-letter (SSE) — Claude.

Frontend :
- `src/app/(dashboard)/tools/cover-letter/page.tsx` :
  Formulaire : poste, entreprise, recruteur (optionnel), parcours (textarea, ou import depuis
  un CV déjà généré), motivation, points forts, ton (formel/professionnel/dynamique).
  Même flow : analyze → generate → template (Standard/Moderne) → format → download.
  Bonus : bouton « Importer depuis mon CV » qui pré-remplit depuis le dernier content_json CV.

Contrainte : les deux outils utilisent CLAUDE via OpenRouter (documents avancés).
Non dispo en Introduction (badge « Dès le palier Goutte »).
Preview gratuite, téléchargement = quota dl. Français.
```

---

## PHASE 4 — DOCUMENTS LONGS (prompts 18 à 19)

### Prompt 18 — Générateur de plan + Rédacteur de document pro + Discours en fichier (optionnel)

```
Implémente le Générateur de plan/outline et le Rédacteur de document professionnel.
Les deux utilisent Claude (documents avancés).

=== GÉNÉRATEUR DE PLAN (Claude) ===

Backend :
- `app/core/llm/prompts/planner.py` :
  « Tu es un expert en structuration de documents francophones. Génère un plan hiérarchique
  adapté au type de document et à la profondeur demandée.
  Types : rapport_stage, memoire, these, rapport, note, proposition, business_plan,
  etude_de_cas, analyse_swot, cahier_charges.
  Réponds en JSON Outline : {schema} »
- Endpoint POST /api/v1/tools/planner (SSE, Claude) : sujet + type + profondeur → plan structuré JSON.

Frontend :
- `src/app/(dashboard)/tools/plan-generator/page.tsx` :
  INPUT : sujet (textarea), type de document (select avec les 10 types), profondeur
  (Essentiel / Détaillé / Très détaillé). Bouton « Générer le plan ».
  RÉSULTAT : plan en arborescence éditable (tree view). Chaque section :
  drag pour réordonner, titre éditable (double-clic), bouton supprimer (Trash2),
  bouton ajouter sous-section (Plus). Boutons globaux : « Ajouter une section »,
  « Régénérer tout », « Régénérer une partie ».
  ACTIONS : « Envoyer vers le Rédacteur de document pro » (navigue avec plan en state),
  « Envoyer vers le Rédacteur académique », « Copier le plan ».

=== RÉDACTEUR DE DOCUMENT PRO (Claude) ===

Backend :
- Templates pro_corporate.py (header Bleu Boulga + organisation, TOC si >3 sections,
  pied de page confidentiel) et pro_minimal.py (sobre, sans couleurs, universel).
- `app/core/llm/prompts/pro_doc.py` : prompts analyze + generate pour ProDocContent.
  Le doc pro s'appuie sur un plan validé comme squelette.
- Endpoints POST /api/v1/tools/generators/pro-doc/analyze et
  POST /api/v1/tools/generators/pro-doc (SSE, Claude).

Frontend :
- `src/app/(dashboard)/tools/pro-doc-writer/page.tsx` :
  Type de document (select : Rapport d'activité, Note de service, Compte-rendu,
  Proposition commerciale, Business plan, Étude de cas, Analyse SWOT, Cahier des charges).
  Titre, auteur (pré-rempli), organisation.
  Plan : importé depuis le Générateur de plan OU saisie libre (sections répétables avec
  titre + contenu de guidage pour le LLM).
  Consignes particulières (textarea optionnel).
  Ton (select).
  Flow : analyze → generate (streaming) → template (Corporate/Minimal) → format → download.

Contrainte : Claude pour les deux outils. Non dispo en Introduction.
Le plan est le squelette réutilisable. Français.
```

---

### Prompt 19 — Rédacteur de documents académiques longs (parcours 7 étapes, Claude)

```
Implémente l'outil phare : le Rédacteur de documents académiques longs, avec son parcours
guidé en 7 étapes et sa persistance en temps réel. C'est l'outil le plus complexe.
Il utilise Claude (claude-sonnet-4-6) car c'est un document avancé.

Backend :
- Utilise la table academic_sessions (current_step, doc_type, domain, topic, outline_json,
  sections_json, template, status).
- `app/api/v1/tools/generators/academic.py` : endpoints pour chaque étape.
- `app/core/llm/prompts/academic.py` : prompts par étape.

  SUGGEST_TOPICS : « Propose 5 sujets de {doc_type} originaux pour un étudiant en {domain}
  en Afrique de l'Ouest francophone. Pour chaque : titre, problématique, 3 mots-clés.
  JSON : [{title, problematic, keywords[]}] »

  GENERATE_OUTLINE : « Génère un plan détaillé pour un {doc_type} sur : {topic}.
  Conventions académiques françaises. JSON Outline : {schema} »

  GENERATE_SECTION : « Tu rédiges la section "{section_title}" d'un {doc_type} académique.
  Contexte : sujet {topic}, domaine {domain}.
  Plan complet : {outline}.
  Résumés des sections précédentes : {previous_summaries}.
  Consignes : style académique français, impersonnel, {target_words} mots environ,
  sous-titres si section longue, cite des sources (Auteur, Année).
  Rédige le contenu en markdown léger (pas de JSON). »

  SUMMARIZE_SECTION : « Résume en 2-3 phrases : {content} »

  POINT CLÉ — Gestion du contexte entre sections :
  NE PAS renvoyer tout l'historique. À chaque génération, le prompt contient un contexte compact :
  type + domaine + sujet, le plan validé complet, un résumé de 2-3 phrases de chaque section
  déjà validée (stocké dans sections_json lors de la validation), consignes de style.
  Coût prévisible, cohérence maintenue.

- Endpoints :
  POST /api/v1/tools/generators/academic/sessions → crée une session
  GET /api/v1/tools/generators/academic/sessions → liste
  GET /api/v1/tools/generators/academic/sessions/{id} → détail
  PATCH /api/v1/tools/generators/academic/sessions/{id} → update (outline, step, etc.)
  POST /api/v1/tools/generators/academic/suggest-topics (body: domain, doc_type) → 5 sujets
  POST /api/v1/tools/generators/academic/generate-outline (body: topic, domain, doc_type) → SSE plan
  POST /api/v1/tools/generators/academic/generate-section (body: session_id, section_id) → SSE section
  POST /api/v1/tools/generators/academic/validate-section (body: session_id, section_id) → stocke résumé
  POST /api/v1/tools/generators/academic/regenerate-section → comme generate mais re-génère

  Si l'utilisateur modifie le plan après avoir généré des sections, les sections dont le titre
  a changé passent au statut « à revoir ».

- Templates : academic_formal.py (page de garde, table des matières, numérotation, en-têtes,
  marges 3cm gauche), academic_clean.py (page de garde simple, minimaliste).

Frontend :
- `src/app/(dashboard)/tools/academic-writer/page.tsx` :
  Stepper horizontal en haut (7 étapes numérotées, courante en bleu-boulga, complétées en vert).

  ÉTAPE 1 — Type : 3 grandes cartes (Rapport de stage / Mémoire / Thèse).
  Clic → crée la session + étape 2.

  ÉTAPE 2 — Domaine : select (Informatique, Gestion, Droit, Santé, Agronomie,
  Sciences sociales, Ingénierie, Autre). Bouton « Suivant ».

  ÉTAPE 3 — Sujet : textarea + bouton « Suggérer des sujets » → 5 cards cliquables.
  Bouton « Autres suggestions ». Bouton « Suivant ».

  ÉTAPE 4 — Plan : bouton « Générer le plan » → streaming → arborescence éditable
  (même composant que le Générateur de plan). Bouton « Valider le plan ».

  ÉTAPE 5 — Rédaction : liste de cards (une par section du plan).
  Chaque card : titre, badge statut (gris « À rédiger » / orange « Généré » / vert « Validé »),
  nb mots. Boutons « Générer » / « Régénérer » / « Voir ». Clic « Générer » → streaming dans
  un panel/modal. Après : « Valider » / « Régénérer ». Progress bar globale « 5/12 sections ».
  Ordre libre.

  ÉTAPE 6 — Relecture : vue du document complet assemblé. Chaque section cliquable pour
  modifier/régénérer. Compteur total de mots. Bouton « Passer à l'export ».

  ÉTAPE 7 — Export : TemplateSelector (Formel/Épuré) + FormatSelector (PDF/Word).
  Bouton « Télécharger mon document ». Message de félicitations.

  Navigation : retour possible sur toute étape précédente. Reprise après plusieurs jours
  (session persistée, current_step sauvé). Stepper vertical compact sur mobile.

Contrainte : Claude comme moteur (claude-sonnet-4-6). Non dispo en Introduction.
Persistance temps réel. Contexte compact entre sections (jamais l'historique complet).
Qualité maximale attendue. Français.
```

---

## PHASE 5 — ADMIN ET FINITIONS (prompt 20)

### Prompt 20 — Dashboard admin, Documents, Paramètres, responsive, déploiement

```
Finalise Boulga V1 : dashboard admin, pages Documents et Paramètres, passe responsive,
et configuration de déploiement.

=== BACKEND ADMIN ===

`app/api/v1/admin.py` (protégé par require_admin) :
- GET /api/v1/admin/kpis :
  Utilisateurs : total, nouveaux 7j/30j, répartition par palier.
  Coûts LLM : total jour/semaine/mois, coût par outil, coût par modèle (ChatGPT vs Claude),
  coût moyen par génération (agrégations usage_logs).
  Volumes : générations par outil, mots générés, documents téléchargés.
- GET /api/v1/admin/users?search=&page=&per_page= : liste paginée + recherche.
- GET /api/v1/admin/users/{id} : détail (profil, quotas, 50 derniers usage_logs).
- PATCH /api/v1/admin/users/{id}/tier : changer le palier manuellement (critique tant que
  FedaPay n'est pas branché). Met à jour profiles.current_tier + quotas du mois.
- POST /api/v1/admin/users/{id}/reset-quota : remet words_used et downloads_used à 0.
- GET /api/v1/admin/costs?period=7d|30d|90d : tableau coût réel par outil × palier × modèle.
- Squelette webhook `app/api/webhooks/fedapay.py` (non actif, prêt à brancher).

=== BACKEND COMPLÉMENTS ===

`app/api/v1/users.py` (compléter) :
- PATCH /api/v1/users/me : modifier full_name, phone.
- DELETE /api/v1/users/me : supprimer le compte (cascade tables + fichiers Storage).
- GET /api/v1/users/me/quota/history : quotas des 6 derniers mois.

=== FRONTEND ADMIN ===

`src/app/(dashboard)/admin/page.tsx` — KPIs :
- Cards : Total utilisateurs, Nouveaux 7j, Coût du jour (USD), Coût du mois (USD).
- Graphique barres : coût par outil (les 13 outils).
- Graphique barres : coût ChatGPT vs Claude (comparaison des deux moteurs).
- Camembert : répartition par palier.

`src/app/(dashboard)/admin/users/page.tsx` — Utilisateurs :
- Recherche + tableau paginé : Nom, Email, Palier (badge), Mots utilisés/limite, Inscrit le.
- Détail : profil, quotas, select changer palier (confirmation), bouton reset quotas, historique.

`src/app/(dashboard)/admin/costs/page.tsx` — Coûts :
- Select période (7j/30j/90j).
- Tableau : Outil | Palier | Modèle (ChatGPT/Claude) | Nb générations | Tokens in | Tokens out |
  Coût total | Coût moyen. Triable. Total en bas.

=== PAGE DOCUMENTS ===

`src/app/(dashboard)/documents/page.tsx` :
- Historique des documents générés. Filtres : outil, format, période.
- Chaque document : icône type, titre, outil (badge), template, format, date relative.
- Actions : Télécharger, Regénérer (autre template/format, sans LLM), Supprimer.

=== PAGE PARAMÈTRES ===

`src/app/(dashboard)/settings/page.tsx` — 3 tabs :
- Profil : nom, email (lecture), téléphone, bouton sauvegarder, changer mdp, supprimer compte.
- Abonnement : palier actuel, comparatif des 5 paliers avec les 13 outils, bouton upgrade
  (V1 : « Contactez boulgacorporation@gmail.com »).
- Quotas : mots et dl du mois avec progress bar, historique 6 mois.

=== RESPONSIVE ===

Passe complète sur TOUTES les pages :
- Mobile (<768px) : sidebar drawer, grilles 1 col, tableaux scroll horizontal, stepper vertical.
- Tablette : sidebar collapsible, grilles 2 col.
- Desktop : layout nominal.

=== POLISH ===

- Toasts shadcn pour toutes les actions (succès, erreur, info).
- Skeleton loaders sur toutes les pages qui chargent.
- Empty states (icône + message + CTA).
- Favicon + meta (titre « Boulga AI », description).
- Rate limiting backend : dict en mémoire {user_id: [timestamps]}, 10 appels/min par user
  sur les endpoints LLM. 429 si dépassé.

=== DÉPLOIEMENT ===

- `boulga-backend/Dockerfile` : Python 3.12 + LibreOffice headless + uvicorn.
- Vercel config pour le frontend (variables NEXT_PUBLIC_*).
- README de déploiement : Railway (backend), Vercel (frontend), Supabase (migrations + buckets),
  CORS prod, variables d'env.
- `TESTS_CHECKLIST.md` : checklist complète des 13 outils + auth + quotas + admin + responsive.

Contrainte : sécurité (rate limiting, URLs signées 15 min, aucun secret côté client).
Après déploiement, exploiter usage_logs (coût ChatGPT vs Claude par outil) pour calibrer les quotas.
```

---

## Récapitulatif des 20 prompts × 13 outils

| # | Phase | Prompt | Outils couverts | Moteur LLM |
|---|---|---|---|---|
| 1 | 0 | Squelette backend | — | — |
| 2 | 0 | Squelette frontend + charte | — | — |
| 3 | 0 | BDD Supabase | — | — |
| 4 | 0 | Auth backend | — | — |
| 5 | 0 | Auth frontend | — | — |
| 6 | 0 | Cœur LLM + routage ChatGPT/Claude | — | ChatGPT + Claude |
| 7 | 0 | Quotas + coûts | — | — |
| 8 | 0 | Layout dashboard (13 outils) | — | — |
| 9 | 1 | Reformulateur (bout en bout) | #4 | ChatGPT |
| 10 | 1 | Email pro + Posts sociaux | #5, #7 | ChatGPT |
| 11 | 1 | Chat IA | #6 | ChatGPT |
| 12 | 1 | Discours et pitchs | #8 | ChatGPT |
| 13 | 1 | Convertisseur de fichiers | #1 | Aucun |
| 14 | 2 | Détecteur IA (Copyleaks) | #2 | Copyleaks + ChatGPT |
| 15 | 2 | Plagiat | #3 | Copyleaks + ChatGPT |
| 16 | 3 | Moteur documents | — | — |
| 17 | 3 | Templates + CV + Lettre | #10, #11 | Claude |
| 18 | 4 | Plan + Doc pro | #9, #12 | Claude |
| 19 | 4 | Académique (7 étapes) | #13 | Claude |
| 20 | 5 | Admin + Documents + Paramètres + deploy | — | — |

---

## Après les 20 prompts

- **Calibrage** : exploite usage_logs pour comparer le coût ChatGPT vs Claude par outil et ajuster les quotas.
- **FedaPay** : branche le paiement (webhook en squelette).
- **Outils V1.1** : traducteur multilingue (wolof, dioula, mooré, bambara), citations bibliographiques,
  factures/devis FCFA, chat sur document, fiches de révision/QCM, notifications email.

*Boulga AI — Puiser l'intelligence qu'il vous faut.*
