-- Boulga AI — decrement atomique des quotas
-- Appelee par le backend (service_role) en fin de generation, une fois les tokens reels
-- connus. UPDATE ... SET x = x + n est deja atomique au niveau ligne dans Postgres ; cette
-- fonction evite un aller-retour lecture/ecriture non atomique depuis le client Python.

CREATE OR REPLACE FUNCTION public.increment_quota_usage(
    p_user_id UUID,
    p_period TEXT,
    p_words INTEGER DEFAULT 0,
    p_downloads INTEGER DEFAULT 0
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.quotas
    SET words_used = words_used + p_words,
        downloads_used = downloads_used + p_downloads
    WHERE user_id = p_user_id AND period = p_period;
$$;
