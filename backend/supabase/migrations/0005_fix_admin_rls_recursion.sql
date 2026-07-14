-- Boulga AI — corrige la recursion infinie des policies "admin_select"
-- Les policies admin_select interrogeaient directement `profiles` depuis une policy
-- protegeant `profiles` (et les tables liees), ce qui declenche
-- "infinite recursion detected in policy for relation profiles" cote Postgres.
-- Cette fonction SECURITY DEFINER contourne RLS pour cette verification precise,
-- ce qui casse la recursion.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    );
$$;

DROP POLICY IF EXISTS "admin_select" ON public.profiles;
CREATE POLICY "admin_select" ON public.profiles
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select" ON public.subscriptions;
CREATE POLICY "admin_select" ON public.subscriptions
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select" ON public.quotas;
CREATE POLICY "admin_select" ON public.quotas
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select" ON public.usage_logs;
CREATE POLICY "admin_select" ON public.usage_logs
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select" ON public.documents;
CREATE POLICY "admin_select" ON public.documents
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select" ON public.academic_sessions;
CREATE POLICY "admin_select" ON public.academic_sessions
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select" ON public.conversations;
CREATE POLICY "admin_select" ON public.conversations
    FOR SELECT USING (public.is_admin());
