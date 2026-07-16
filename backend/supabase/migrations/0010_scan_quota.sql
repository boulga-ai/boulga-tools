-- Boulga AI — quota mensuel de scans (detecteur IA + plagiat)
-- Les scans passent desormais par de vrais appels LLM (+ recherche web pour le
-- plagiat) au lieu d'un mock gratuit : il leur faut un compteur dedie, separe du
-- quota mots, pour eviter un abus a cout reel.

ALTER TABLE public.quotas
    ADD COLUMN scans_used INTEGER DEFAULT 0,
    ADD COLUMN scans_limit INTEGER NOT NULL DEFAULT 5;

CREATE OR REPLACE FUNCTION public.increment_quota_usage(
    p_user_id UUID,
    p_period TEXT,
    p_words INTEGER DEFAULT 0,
    p_downloads INTEGER DEFAULT 0,
    p_scans INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.quotas
    SET words_used = words_used + p_words,
        downloads_used = downloads_used + p_downloads,
        scans_used = scans_used + p_scans
    WHERE user_id = p_user_id AND period = p_period;
$$;
