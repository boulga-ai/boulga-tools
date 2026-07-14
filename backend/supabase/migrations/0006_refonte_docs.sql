-- Refonte documentaire V2 : passage a une UX conversationnelle en vue unique.
-- academic_sessions garde current_step/doc_type/domain/topic comme metadonnees
-- (elles ne pilotent plus un stepper visuel), et gagne interactions_json pour
-- stocker l'etat des blocs AIInteraction (suggestions acceptees/refusees,
-- questions repondues, tags modifies) afin que le user retrouve son etat
-- exact en revenant sur une session en cours.

ALTER TABLE public.academic_sessions
    ADD COLUMN IF NOT EXISTS interactions_json JSONB DEFAULT '{}'::jsonb;
