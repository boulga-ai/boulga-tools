-- Boulga AI — sauvegarde optionnelle de generations de contenu (posts reseaux sociaux,
-- puis autres outils de redaction) dans une collection personnelle de l'utilisateur.
-- Ne consomme aucun quota : distinct du systeme de conversations/historique.

CREATE TABLE public.saved_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tool TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_generations_user_tool ON public.saved_generations(user_id, tool);

-- Meme convention que le reste du schema (0002_rls.sql) : lecture seule cote client,
-- toutes les ecritures passent par le backend (service_role, bypass RLS).
ALTER TABLE public.saved_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.saved_generations
    FOR SELECT USING (auth.uid() = user_id);
