-- =============================================
-- Migration: Storage Bucket for Traceability Photos
-- Date: 2026-01-20
-- Description: Crée le bucket storage pour les photos de traçabilité
--              et configure les policies d'accès public
-- =============================================

-- =============================================
-- 1. Créer le bucket storage (si non existant)
-- =============================================

-- Insérer le bucket s'il n'existe pas déjà
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'traceability-photos',
    'traceability-photos',
    true, -- Bucket public pour accès direct aux URLs
    10485760, -- 10MB max par fichier
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Commentaire explicatif
COMMENT ON TABLE storage.buckets IS 'Stockage des fichiers dans Supabase Storage';

-- =============================================
-- 2. Supprimer les anciennes policies (si existantes)
-- =============================================

DROP POLICY IF EXISTS "Public read access for traceability photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload traceability photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their traceability photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their traceability photos" ON storage.objects;

-- Pour compatibilité avec anon (mode actuel)
DROP POLICY IF EXISTS "Anon read access for traceability photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon upload access for traceability photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon update access for traceability photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete access for traceability photos" ON storage.objects;

-- =============================================
-- 3. Créer les policies pour l'accès public (READ)
-- =============================================

-- Lecture publique des photos (pour affichage)
CREATE POLICY "Public read access for traceability photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'traceability-photos');

-- =============================================
-- 4. Créer les policies pour ANON (mode actuel)
-- =============================================

-- ANON peut uploader des photos
CREATE POLICY "Anon upload access for traceability photos"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'traceability-photos'
    AND (storage.foldername(name))[1] IS NOT NULL -- Doit être dans un sous-dossier (output_id)
);

-- ANON peut mettre à jour des photos
CREATE POLICY "Anon update access for traceability photos"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'traceability-photos')
WITH CHECK (bucket_id = 'traceability-photos');

-- ANON peut supprimer des photos
CREATE POLICY "Anon delete access for traceability photos"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'traceability-photos');

-- =============================================
-- 5. Créer les policies pour AUTHENTICATED (futur)
-- =============================================

-- Authenticated peut uploader des photos
CREATE POLICY "Authenticated upload access for traceability photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'traceability-photos'
    AND (storage.foldername(name))[1] IS NOT NULL -- Doit être dans un sous-dossier (output_id)
);

-- Authenticated peut mettre à jour des photos
CREATE POLICY "Authenticated update access for traceability photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'traceability-photos')
WITH CHECK (bucket_id = 'traceability-photos');

-- Authenticated peut supprimer des photos
CREATE POLICY "Authenticated delete access for traceability photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'traceability-photos');

-- =============================================
-- 6. Vérifier et afficher le résultat
-- =============================================

DO $$
DECLARE
    bucket_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Vérifier si le bucket existe
    SELECT EXISTS(
        SELECT 1 FROM storage.buckets WHERE id = 'traceability-photos'
    ) INTO bucket_exists;

    -- Compter les policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%traceability photos%';

    -- Afficher les résultats
    IF bucket_exists THEN
        RAISE NOTICE '✅ Bucket "traceability-photos" créé avec succès';
        RAISE NOTICE '✅ % policies créées pour le storage', policy_count;
    ELSE
        RAISE WARNING '⚠️ Erreur: Le bucket n''a pas été créé correctement';
    END IF;
END $$;

-- =============================================
-- FIN DE LA MIGRATION
-- =============================================
