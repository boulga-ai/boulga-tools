-- V3 : le moteur documentaire generique persiste le JSON de blocs des la generation
-- (POST /documents/{doc_type}/generate), avant tout rendu de fichier — le fichier
-- n'est produit qu'au telechargement (template/format choisis a ce moment-la,
-- potentiellement change plusieurs fois pour le meme contenu). storage_path n'est
-- donc plus garanti au moment de l'insertion.
ALTER TABLE public.documents ALTER COLUMN storage_path DROP NOT NULL;
