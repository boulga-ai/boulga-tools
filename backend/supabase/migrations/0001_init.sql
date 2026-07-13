-- Boulga AI — schema initial
-- Six tables principales + conversations. Ecritures sensibles reservees au service_role backend.

-- PROFILES — extension de auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
    current_tier TEXT DEFAULT 'introduction'
        CHECK (current_tier IN
        ('introduction','goutte','source','fleuve','ocean')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    billing_period TEXT CHECK (billing_period IN ('monthly','annual')),
    amount_fcfa INTEGER NOT NULL,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active','expired','cancelled')),
    started_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    fedapay_transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- QUOTAS mensuels
CREATE TABLE public.quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    period TEXT NOT NULL,               -- 'YYYY-MM'
    words_used INTEGER DEFAULT 0,
    words_limit INTEGER NOT NULL,
    downloads_used INTEGER DEFAULT 0,
    downloads_limit INTEGER NOT NULL,
    UNIQUE(user_id, period)
);

-- USAGE_LOGS — le jalon critique : cout reel par outil
CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    model TEXT NOT NULL,
    tokens_in INTEGER NOT NULL,
    tokens_out INTEGER NOT NULL,
    cost_usd DECIMAL(10,6) NOT NULL,
    tier TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- DOCUMENTS generes
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    title TEXT NOT NULL,
    template TEXT,
    format TEXT CHECK (format IN ('docx','pdf')),
    storage_path TEXT NOT NULL,
    content_json JSONB,                 -- pour regenerer/reediter
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ACADEMIC_SESSIONS — parcours guide
CREATE TABLE public.academic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'in_progress'
        CHECK (status IN ('in_progress','completed','abandoned')),
    current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 7),
    doc_type TEXT,          -- rapport_stage | memoire | these
    domain TEXT,
    topic TEXT,
    outline_json JSONB,     -- plan valide
    sections_json JSONB,    -- {section_id: {content, status, summary, words}}
    template TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- CONVERSATIONS — chat generaliste, email writer, posts sociaux, discours
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tool TEXT NOT NULL,
    title TEXT,
    messages_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- INDEX
CREATE INDEX idx_usage_logs_user ON public.usage_logs(user_id, created_at DESC);
CREATE INDEX idx_usage_logs_tool ON public.usage_logs(tool, created_at DESC);
CREATE INDEX idx_documents_user ON public.documents(user_id, created_at DESC);
CREATE INDEX idx_quotas_user_period ON public.quotas(user_id, period);
CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id, status);
CREATE INDEX idx_academic_user ON public.academic_sessions(user_id, updated_at DESC);
CREATE INDEX idx_conversations_user_tool ON public.conversations(user_id, tool, updated_at DESC);
