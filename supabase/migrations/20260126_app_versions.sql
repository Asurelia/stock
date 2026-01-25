-- Table pour gérer les versions de l'application
-- Permet le système d'auto-update APK

CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(20) NOT NULL,
  version_code INTEGER NOT NULL,
  platform VARCHAR(20) NOT NULL DEFAULT 'android',
  download_url TEXT NOT NULL,
  release_notes TEXT,
  release_notes_fr TEXT,
  min_version VARCHAR(20),
  force_update BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  file_size BIGINT,
  checksum VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(version, platform)
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_app_versions_platform_active ON app_versions(platform, is_active);
CREATE INDEX idx_app_versions_version_code ON app_versions(version_code DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_app_versions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_app_versions_updated_at
  BEFORE UPDATE ON app_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_app_versions_updated_at();

-- RLS Policies
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Lecture publique (l'app doit pouvoir vérifier les mises à jour)
CREATE POLICY "Allow public read access to app_versions"
  ON app_versions
  FOR SELECT
  USING (true);

-- Écriture réservée aux admins (via service role key)
-- Pas de policy INSERT/UPDATE/DELETE pour les utilisateurs normaux

-- Commentaires
COMMENT ON TABLE app_versions IS 'Gestion des versions APK pour auto-update';
COMMENT ON COLUMN app_versions.version IS 'Version semver (ex: 1.2.0)';
COMMENT ON COLUMN app_versions.version_code IS 'Code de version numérique pour comparaison';
COMMENT ON COLUMN app_versions.download_url IS 'URL de téléchargement de l''APK (Supabase Storage ou externe)';
COMMENT ON COLUMN app_versions.min_version IS 'Version minimum requise (force update si version actuelle < min_version)';
COMMENT ON COLUMN app_versions.force_update IS 'Si true, l''utilisateur ne peut pas ignorer la mise à jour';

-- Insertion de la version actuelle comme référence
INSERT INTO app_versions (version, version_code, platform, download_url, release_notes_fr, is_active)
VALUES (
  '1.1.0',
  110,
  'android',
  '', -- URL à remplir après upload de l'APK
  'Version initiale avec:
- Push notifications (alertes stock bas, températures)
- Mode hors ligne avec synchronisation
- Authentification biométrique (empreinte)
- Widget accès rapide',
  true
);
