-- Generalise academic_sessions (jusqu'ici academique uniquement) en document_sessions,
-- reutilisable par tout outil a projets multiples/longue duree (academique, document
-- pro, plus tard CV/lettre) — meme raison d'etre que la table conversations qui
-- discrimine deja plusieurs outils via une colonne "tool".
--
-- Renommer une table conserve automatiquement contraintes, index (sous leur ancien
-- nom) et policies RLS existantes (attachees a l'OID de la relation, pas au nom) —
-- seule la colonne "tool" est nouvelle, avec backfill 'academic' pour les lignes
-- existantes puisque cette table ne servait qu'a l'outil academique jusqu'ici.

ALTER TABLE public.academic_sessions RENAME TO document_sessions;

ALTER TABLE public.document_sessions
    ADD COLUMN IF NOT EXISTS tool TEXT NOT NULL DEFAULT 'academic';

ALTER TABLE public.document_sessions ALTER COLUMN tool DROP DEFAULT;

DROP INDEX IF EXISTS idx_academic_user;
CREATE INDEX IF NOT EXISTS idx_document_sessions_user_tool
    ON public.document_sessions(user_id, tool, updated_at DESC);
