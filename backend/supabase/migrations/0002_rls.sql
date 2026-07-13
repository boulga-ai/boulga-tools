-- Boulga AI — Row Level Security
-- Lecture : l'utilisateur voit ses propres lignes, l'admin voit tout.
-- Ecriture : aucune policy cote client. Seul FastAPI (service_role, qui bypass RLS) ecrit
-- dans quotas, usage_logs, subscriptions, documents, academic_sessions, conversations et
-- profiles.current_tier. Le navigateur ne fait jamais d'ecriture directe sur ces tables.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "own_select" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "admin_select" ON public.profiles
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));

-- SUBSCRIPTIONS
CREATE POLICY "own_select" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select" ON public.subscriptions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));

-- QUOTAS
CREATE POLICY "own_select" ON public.quotas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select" ON public.quotas
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));

-- USAGE_LOGS
CREATE POLICY "own_select" ON public.usage_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select" ON public.usage_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));

-- DOCUMENTS
CREATE POLICY "own_select" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select" ON public.documents
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));

-- ACADEMIC_SESSIONS
CREATE POLICY "own_select" ON public.academic_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select" ON public.academic_sessions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));

-- CONVERSATIONS
CREATE POLICY "own_select" ON public.conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "admin_select" ON public.conversations
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'));


-- Trigger de creation de profil + quotas a l'inscription (email ou Google)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, role, current_tier)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'phone',
        CASE WHEN NEW.email = 'boulgacorporation@gmail.com' THEN 'admin' ELSE 'user' END,
        'introduction'
    );

    INSERT INTO public.quotas (user_id, period, words_used, words_limit, downloads_used, downloads_limit)
    VALUES (
        NEW.id,
        to_char(now(), 'YYYY-MM'),
        0,
        5000,
        0,
        0
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed : si le super admin existe deja dans auth.users, s'assurer que son role est 'admin'
UPDATE public.profiles SET role = 'admin'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'boulgacorporation@gmail.com');
