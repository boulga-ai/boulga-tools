-- V3-6 : simplifie academic_sessions autour d'un work_state JSONB unique, aligne sur
-- le WorkState du frontend (cadrage, history, validatedInfo, plan, blocks,
-- documentId, title) — remplace domain/topic/outline_json/sections_json/
-- interactions_json/template, tous herites du parcours en etapes (V1/V2) desormais
-- abandonne au profit de la vue unique conversationnelle.
--
-- Les sessions existantes ne sont PAS perdues : leur contenu brut est copie tel quel
-- dans work_state.legacy avant suppression des colonnes. Le nouveau frontend ne peut
-- pas rejouer un ancien etat de stepper (les deux UX sont incompatibles), donc une
-- conversion champ-a-champ serait trompeuse — on preserve plutot que de faire
-- semblant de convertir.
--
-- current_step est CONSERVE (plus lu par le frontend, qui ne pilote plus de stepper)
-- par prudence / eventuel usage analytique futur, conformement a la consigne V3-6.

ALTER TABLE public.academic_sessions
    ADD COLUMN IF NOT EXISTS work_state JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS title TEXT;

UPDATE public.academic_sessions
SET
    work_state = jsonb_build_object(
        'cadrage', jsonb_build_object('doc_type', doc_type, 'domain', COALESCE(domain, '')),
        'history', '[]'::jsonb,
        'validatedInfo', '{}'::jsonb,
        'plan', NULL,
        'blocks', '[]'::jsonb,
        'documentId', NULL,
        'title', COALESCE(topic, ''),
        'legacy', jsonb_build_object(
            'topic', topic,
            'outline_json', outline_json,
            'sections_json', sections_json,
            'interactions_json', interactions_json,
            'current_step', current_step
        )
    ),
    title = COALESCE(NULLIF(topic, ''), 'Session académique')
WHERE work_state = '{}'::jsonb;

ALTER TABLE public.academic_sessions
    DROP COLUMN IF EXISTS domain,
    DROP COLUMN IF EXISTS topic,
    DROP COLUMN IF EXISTS outline_json,
    DROP COLUMN IF EXISTS sections_json,
    DROP COLUMN IF EXISTS interactions_json,
    DROP COLUMN IF EXISTS template;
