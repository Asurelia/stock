-- =============================================
-- Script de vérification rapide du bucket storage
-- =============================================

\echo '\n=========================================='
\echo 'DIAGNOSTIC: Bucket traceability-photos'
\echo '==========================================\n'

-- 1. Vérifier si le bucket existe
\echo '1. Vérification du bucket:'
SELECT
    CASE
        WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'traceability-photos')
        THEN '✅ Le bucket "traceability-photos" existe'
        ELSE '❌ Le bucket "traceability-photos" N''EXISTE PAS - Exécutez la migration 20260120_storage_traceability_photos.sql'
    END as "Status";

-- 2. Afficher les paramètres du bucket
\echo '\n2. Configuration du bucket:'
SELECT
    id as "ID",
    name as "Nom",
    public as "Public",
    file_size_limit as "Limite taille (octets)",
    ROUND(file_size_limit::numeric / 1048576, 2) as "Limite taille (MB)",
    allowed_mime_types as "Types MIME autorisés"
FROM storage.buckets
WHERE id = 'traceability-photos';

-- 3. Compter les policies storage
\echo '\n3. Policies Storage:'
SELECT
    COUNT(*) as "Nombre de policies",
    string_agg(policyname, ', ') as "Noms des policies"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%traceability%';

-- 4. Détail des policies
\echo '\n4. Détail des policies:'
SELECT
    policyname as "Policy",
    cmd as "Commande",
    roles::text as "Rôles"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%traceability%'
ORDER BY cmd, policyname;

-- 5. Vérifier les policies RLS de la table
\echo '\n5. Policies RLS de la table traceability_photos:'
SELECT
    COUNT(*) as "Nombre de policies RLS"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'traceability_photos';

-- 6. Compter les fichiers dans le bucket
\echo '\n6. Fichiers dans le bucket:'
SELECT
    COUNT(*) as "Nombre de fichiers",
    COALESCE(SUM((metadata->>'size')::bigint), 0) as "Taille totale (octets)",
    ROUND(COALESCE(SUM((metadata->>'size')::bigint), 0)::numeric / 1048576, 2) as "Taille totale (MB)"
FROM storage.objects
WHERE bucket_id = 'traceability-photos';

-- 7. Derniers fichiers uploadés
\echo '\n7. Derniers fichiers uploadés:'
SELECT
    name as "Nom fichier",
    created_at as "Date upload",
    (metadata->>'size')::bigint as "Taille (octets)",
    ROUND((metadata->>'size')::bigint::numeric / 1024, 2) as "Taille (KB)"
FROM storage.objects
WHERE bucket_id = 'traceability-photos'
ORDER BY created_at DESC
LIMIT 5;

-- 8. Vérifier les enregistrements dans traceability_photos
\echo '\n8. Photos dans la table traceability_photos:'
SELECT
    COUNT(*) as "Nombre total",
    COUNT(DISTINCT output_id) as "Sorties uniques avec photo",
    MAX(captured_at) as "Photo la plus récente"
FROM traceability_photos;

\echo '\n=========================================='
\echo 'FIN DU DIAGNOSTIC'
\echo '==========================================\n'

-- Actions recommandées
DO $$
DECLARE
    bucket_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'traceability-photos') INTO bucket_exists;
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%traceability%';

    RAISE NOTICE '';
    RAISE NOTICE '========== ACTIONS RECOMMANDÉES ==========';

    IF NOT bucket_exists THEN
        RAISE WARNING '❌ BUCKET MANQUANT !';
        RAISE NOTICE '   → Exécutez: supabase/migrations/20260120_storage_traceability_photos.sql';
    ELSE
        RAISE NOTICE '✅ Bucket configuré correctement';
    END IF;

    IF policy_count < 7 THEN
        RAISE WARNING '⚠️  Policies storage incomplètes (trouvées: %, attendues: 7)', policy_count;
        RAISE NOTICE '   → Exécutez: supabase/migrations/20260120_storage_traceability_photos.sql';
    ELSE
        RAISE NOTICE '✅ Policies storage correctes (% policies)', policy_count;
    END IF;

    RAISE NOTICE '==========================================';
    RAISE NOTICE '';
END $$;
