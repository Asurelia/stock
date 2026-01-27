-- Ajoute le support des mises à jour OTA (bundle web)
-- Le champ bundle_url contient l'URL d'un ZIP du build web (dist/)
-- Cela permet de mettre à jour le contenu de l'app sans réinstaller l'APK

-- Ajoute la colonne bundle_url si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_versions' AND column_name = 'bundle_url'
  ) THEN
    ALTER TABLE app_versions ADD COLUMN bundle_url TEXT;
    COMMENT ON COLUMN app_versions.bundle_url IS 'URL du ZIP du bundle web pour mise à jour OTA (sans réinstallation APK)';
  END IF;
END $$;

-- Désactive l'ancienne version 1.1.0 (download_url vide = inutilisable)
UPDATE app_versions SET is_active = false WHERE version = '1.1.0' AND download_url = '';

-- Insère la version 1.2.6 comme version active
-- IMPORTANT: Après le build, il faut :
-- 1. Zipper le contenu du dossier dist/ : cd frontend/dist && zip -r ../../bundle-1.2.6.zip .
-- 2. Uploader le ZIP dans Supabase Storage (bucket: app-bundles)
-- 3. Mettre à jour le bundle_url ci-dessous avec l'URL publique du ZIP
INSERT INTO app_versions (version, version_code, platform, download_url, bundle_url, release_notes_fr, is_active, force_update)
VALUES (
  '1.2.7',
  127,
  'android',
  '', -- URL de l'APK (optionnel si bundle_url est rempli)
  '', -- URL du ZIP du bundle web (À REMPLIR après upload sur Supabase Storage)
  'Corrections et améliorations :
- Système de mise à jour OTA (instantané, sans réinstallation)
- Détection de version améliorée
- Vérification automatique au retour de l''app
- Corrections de bugs mobiles',
  true,
  false
)
ON CONFLICT (version, platform) DO UPDATE SET
  bundle_url = EXCLUDED.bundle_url,
  release_notes_fr = EXCLUDED.release_notes_fr,
  is_active = EXCLUDED.is_active;
