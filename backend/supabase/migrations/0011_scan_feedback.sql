-- Boulga AI — retour utilisateur (pouce haut/bas) sur un resultat de scan (detecteur
-- IA / plagiat). Version minimale : un booleen par scan de fichier, pas d'analytics
-- avancee pour l'instant.

CREATE TABLE public.scan_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_scan_feedback_conversation ON public.scan_feedback(conversation_id);

-- Meme convention que le reste du schema (0002_rls.sql) : lecture seule cote client,
-- toutes les ecritures passent par le backend (service_role, bypass RLS).
ALTER TABLE public.scan_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON public.scan_feedback
    FOR SELECT USING (auth.uid() = user_id);
