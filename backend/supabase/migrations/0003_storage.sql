-- Boulga AI — buckets Storage
-- uploads   : fichiers envoyes par l'utilisateur (conversion, analyse) — retention 30 jours
-- generated : documents produits par les generateurs — permanent
-- temp      : intermediaires de conversion — retention 24h, backend uniquement

INSERT INTO storage.buckets (id, name, public)
VALUES
    ('uploads', 'uploads', false),
    ('generated', 'generated', false),
    ('temp', 'temp', false)
ON CONFLICT (id) DO NOTHING;

-- uploads : l'utilisateur ne voit que ses propres fichiers ({user_id}/...)
CREATE POLICY "uploads_own_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- generated : l'utilisateur ne voit que ses propres documents generes
CREATE POLICY "generated_own_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'generated' AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- temp : aucun acces client, backend uniquement via service_role (bypass RLS)

-- Nettoyage planifie (a executer via pg_cron si disponible sur le projet Supabase) :
-- DELETE FROM storage.objects WHERE bucket_id = 'uploads' AND created_at < now() - interval '30 days';
-- DELETE FROM storage.objects WHERE bucket_id = 'temp' AND created_at < now() - interval '24 hours';
