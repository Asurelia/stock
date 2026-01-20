-- =============================================
-- Script de diagnostic: Photos de traçabilité
-- Date: 2026-01-20
-- Description: Vérifie la configuration du système de photos
-- =============================================

-- =============================================
-- 1. Vérifier si la table traceability_photos existe
-- =============================================

DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'traceability_photos'
    ) INTO table_exists;

    IF table_exists THEN
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_name = 'traceability_photos';

        RAISE NOTICE '✅ Table traceability_photos existe avec % colonnes', column_count;
    ELSE
        RAISE WARNING '❌ Table traceability_photos n''existe PAS';
    END IF;
END $$;

-- =============================================
-- 2. Vérifier les colonnes de la table
-- =============================================

SELECT
    '📋 Structure de la table' as "Info",
    column_name as "Colonne",
    data_type as "Type",
    is_nullable as "Nullable"
FROM information_schema.columns
WHERE table_name = 'traceability_photos'
ORDER BY ordinal_position;

-- =============================================
-- 3. Vérifier si le bucket storage existe
-- =============================================

DO $$
DECLARE
    bucket_exists BOOLEAN;
    bucket_public BOOLEAN;
    bucket_file_limit BIGINT;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM storage.buckets WHERE id = 'traceability-photos'
    ) INTO bucket_exists;

    IF bucket_exists THEN
        SELECT public, file_size_limit INTO bucket_public, bucket_file_limit
        FROM storage.buckets
        WHERE id = 'traceability-photos';

        RAISE NOTICE '✅ Bucket "traceability-photos" existe';
        RAISE NOTICE '   - Public: %', bucket_public;
        RAISE NOTICE '   - Taille max: % octets (%.2f MB)', bucket_file_limit, bucket_file_limit / 1048576.0;
    ELSE
        RAISE WARNING '❌ Bucket "traceability-photos" n''existe PAS';
        RAISE NOTICE '   → Exécutez la migration: 20260120_storage_traceability_photos.sql';
    END IF;
END $$;

-- =============================================
-- 4. Vérifier les policies RLS de la table
-- =============================================

SELECT
    '🔒 Policies RLS de la table' as "Info",
    policyname as "Policy",
    cmd as "Commande",
    roles::text as "Rôles"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'traceability_photos'
ORDER BY policyname;

-- =============================================
-- 5. Vérifier les policies Storage
-- =============================================

SELECT
    '🔒 Policies Storage' as "Info",
    policyname as "Policy",
    cmd as "Commande",
    roles::text as "Rôles"
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%traceability%'
ORDER BY policyname;

-- =============================================
-- 6. Compter les photos existantes
-- =============================================

DO $$
DECLARE
    photo_count INTEGER;
    today_count INTEGER;
    oldest_date TIMESTAMPTZ;
    newest_date TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*) INTO photo_count FROM traceability_photos;

    IF photo_count > 0 THEN
        SELECT COUNT(*) INTO today_count
        FROM traceability_photos
        WHERE captured_at >= CURRENT_DATE;

        SELECT MIN(captured_at), MAX(captured_at)
        INTO oldest_date, newest_date
        FROM traceability_photos;

        RAISE NOTICE '📸 Photos de traçabilité: %', photo_count;
        RAISE NOTICE '   - Aujourd''hui: %', today_count;
        RAISE NOTICE '   - Plus ancienne: %', oldest_date;
        RAISE NOTICE '   - Plus récente: %', newest_date;
    ELSE
        RAISE NOTICE '📸 Aucune photo de traçabilité enregistrée';
    END IF;
END $$;

-- =============================================
-- 7. Vérifier les sorties sans photo aujourd'hui
-- =============================================

SELECT
    '⚠️ Sorties sans photo aujourd''hui' as "Info",
    p.name as "Produit",
    p.category as "Catégorie",
    o.quantity as "Quantité",
    o.reason as "Motif",
    o.output_date as "Date"
FROM outputs o
JOIN products p ON o.product_id = p.id
WHERE DATE(o.output_date) = CURRENT_DATE
AND p.category NOT IN ('Fruits', 'Légumes')
AND NOT EXISTS (
    SELECT 1 FROM traceability_photos tp
    WHERE tp.output_id = o.id
)
ORDER BY o.output_date DESC
LIMIT 10;

-- =============================================
-- 8. Afficher les dernières photos
-- =============================================

SELECT
    '🖼️ Dernières photos' as "Info",
    tp.captured_at as "Date capture",
    p.name as "Produit",
    tp.url as "URL",
    tp.notes as "Notes"
FROM traceability_photos tp
JOIN outputs o ON tp.output_id = o.id
JOIN products p ON o.product_id = p.id
ORDER BY tp.captured_at DESC
LIMIT 5;

-- =============================================
-- FIN DU DIAGNOSTIC
-- =============================================

RAISE NOTICE '';
RAISE NOTICE '==============================================';
RAISE NOTICE 'Diagnostic terminé';
RAISE NOTICE '==============================================';
