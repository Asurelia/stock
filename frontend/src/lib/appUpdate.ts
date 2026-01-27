/**
 * Système de mise à jour automatique pour Android
 *
 * Deux niveaux de mise à jour :
 *
 * 1. OTA (Over-The-Air) - Mise à jour du bundle web
 *    - Utilise @capgo/capacitor-updater en mode self-hosted
 *    - Télécharge un ZIP du build web depuis Supabase Storage
 *    - Appliqué silencieusement, l'app recharge avec le nouveau contenu
 *    - Pas besoin de réinstaller l'APK
 *
 * 2. APK - Mise à jour native complète
 *    - Télécharge un nouvel APK depuis Supabase Storage
 *    - L'utilisateur doit accepter l'installation
 *    - Nécessaire quand les plugins natifs changent
 *
 * La version du bundle est injectée à la compilation par Vite (__APP_BUNDLE_VERSION__)
 * La version native est lue depuis build.gradle via @capacitor/app
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { createClient } from '@supabase/supabase-js';

// Version du bundle injectée à la compilation par Vite (voir vite.config.ts)
const CURRENT_BUNDLE_VERSION =
  typeof __APP_BUNDLE_VERSION__ !== 'undefined' ? __APP_BUNDLE_VERSION__ : '0.0.0';

// Cache de la version native
let _nativeVersion: string | null = null;

// Client Supabase pour la table app_versions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────────────────

export interface AppVersionRecord {
  version: string;
  version_code: number;
  download_url: string;
  bundle_url: string | null;
  release_notes: string | null;
  release_notes_fr: string | null;
  min_version: string | null;
  force_update: boolean;
  created_at: string;
}

export type UpdateType = 'bundle' | 'apk' | 'none';

export interface UpdateCheckResult {
  updateAvailable: boolean;
  updateType: UpdateType;
  currentVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  releaseNotes: string;
  downloadUrl: string;
  bundleUrl: string;
}

// ─── Version helpers ──────────────────────────────────────────────────

/**
 * Compare deux versions semver (ex: "1.2.6" vs "1.2.5")
 * Retourne 1 si v1 > v2, -1 si v1 < v2, 0 si égales
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Récupère la version native de l'APK (depuis build.gradle via @capacitor/app)
 * Cette version ne change pas avec les mises à jour OTA
 */
export async function getNativeVersion(): Promise<string> {
  if (_nativeVersion) return _nativeVersion;

  if (!Capacitor.isNativePlatform()) {
    return CURRENT_BUNDLE_VERSION;
  }

  try {
    const info = await CapApp.getInfo();
    _nativeVersion = info.version;
    return _nativeVersion;
  } catch {
    return CURRENT_BUNDLE_VERSION;
  }
}

/**
 * Récupère la version actuelle du bundle web
 * Prend en compte les mises à jour OTA déjà appliquées
 */
export function getBundleVersion(): string {
  // Si un bundle OTA a été appliqué, utilise sa version
  const otaVersion = localStorage.getItem('ota_bundle_version');
  if (otaVersion && compareVersions(otaVersion, CURRENT_BUNDLE_VERSION) > 0) {
    return otaVersion;
  }
  return CURRENT_BUNDLE_VERSION;
}

// ─── Update check ─────────────────────────────────────────────────────

/**
 * Vérifie si une mise à jour est disponible (bundle OTA ou APK)
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = getBundleVersion();

  const result: UpdateCheckResult = {
    updateAvailable: false,
    updateType: 'none',
    currentVersion,
    latestVersion: currentVersion,
    forceUpdate: false,
    releaseNotes: '',
    downloadUrl: '',
    bundleUrl: '',
  };

  // Seulement sur Android natif
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return result;
  }

  try {
    // Récupère la dernière version active depuis Supabase
    const { data, error } = await supabaseClient
      .from('app_versions')
      .select('*')
      .eq('platform', 'android')
      .eq('is_active', true)
      .order('version_code', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('[Update] Pas de version trouvée:', error?.message);
      return result;
    }

    const record = data as AppVersionRecord;
    result.latestVersion = record.version;
    result.releaseNotes = record.release_notes_fr || record.release_notes || '';
    result.downloadUrl = record.download_url || '';
    result.bundleUrl = record.bundle_url || '';
    result.forceUpdate = record.force_update;

    // Compare avec la version actuelle du bundle
    if (compareVersions(record.version, currentVersion) > 0) {
      result.updateAvailable = true;

      // Priorité 1 : mise à jour OTA du bundle (rapide, pas de réinstallation)
      if (record.bundle_url) {
        result.updateType = 'bundle';
      }
      // Priorité 2 : mise à jour APK complète
      else if (record.download_url) {
        result.updateType = 'apk';
      }

      // Vérifie si c'est une mise à jour forcée
      if (record.min_version) {
        if (compareVersions(record.min_version, currentVersion) > 0) {
          result.forceUpdate = true;
        }
      }
    }

    console.log('[Update] Vérification:', {
      current: currentVersion,
      latest: record.version,
      updateAvailable: result.updateAvailable,
      type: result.updateType,
    });

    return result;
  } catch (error) {
    console.error('[Update] Erreur lors de la vérification:', error);
    return result;
  }
}

// ─── OTA Bundle update (via CapacitorUpdater) ─────────────────────────

/**
 * Télécharge et applique une mise à jour OTA du bundle web
 * L'app rechargera automatiquement avec le nouveau contenu
 */
export async function downloadAndApplyBundle(
  bundleUrl: string,
  version: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    console.log('[Update] Téléchargement du bundle OTA:', version, bundleUrl);
    onProgress?.(5);

    // Télécharge le bundle ZIP via le plugin CapacitorUpdater
    const bundle = await CapacitorUpdater.download({
      url: bundleUrl,
      version: version,
    });

    console.log('[Update] Bundle téléchargé, id:', bundle.id);
    onProgress?.(80);

    // Mémorise la version avant d'appliquer
    localStorage.setItem('ota_bundle_version', version);

    // Applique le bundle — l'app va recharger
    await CapacitorUpdater.set(bundle);

    onProgress?.(100);
    console.log('[Update] Bundle appliqué, rechargement...');

    return true;
  } catch (error) {
    console.error('[Update] Erreur OTA:', error);
    // Nettoie en cas d'échec
    localStorage.removeItem('ota_bundle_version');
    return false;
  }
}

// ─── APK update (téléchargement + installation) ──────────────────────

/**
 * Télécharge l'APK et lance l'installateur Android
 */
export async function downloadAndInstallApk(
  downloadUrl: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;

  try {
    onProgress?.(0);

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Cannot read response');

    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total > 0) {
        onProgress?.(Math.round((loaded / total) * 90));
      }
    }

    // Combine en un seul buffer
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    // Convertit en base64
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    const base64 = btoa(binary);

    // Sauvegarde le fichier
    const fileName = 'stockpro-update.apk';
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    onProgress?.(95);

    // Récupère le chemin complet
    const fileUri = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    // Lance l'installation via intent Android
    await installApk(fileUri.uri);

    onProgress?.(100);
    return true;
  } catch (error) {
    console.error('[Update] Erreur téléchargement APK:', error);
    return false;
  }
}

/**
 * Lance l'installateur d'APK Android
 */
async function installApk(fileUri: string): Promise<void> {
  try {
    // @ts-expect-error - cordova plugin global
    if (window.cordova?.plugins?.fileOpener2) {
      // @ts-expect-error - cordova plugin global
      window.cordova.plugins.fileOpener2.open(
        fileUri,
        'application/vnd.android.package-archive',
        {
          error: (e: Error) => {
            console.error('[Update] Erreur ouverture APK:', e);
            window.open(fileUri, '_system');
          },
          success: () => {
            console.log('[Update] Installateur APK lancé');
          },
        }
      );
    } else {
      console.log('[Update] FileOpener2 non disponible, fallback');
      window.open(fileUri, '_system');
    }
  } catch (error) {
    console.error('[Update] Erreur lancement installateur:', error);
    window.open(fileUri, '_system');
  }
}

// ─── Startup check ───────────────────────────────────────────────────

/**
 * Vérifie les mises à jour au démarrage de l'app
 * - Throttle : 1 vérification par 30 minutes maximum
 * - Si bundle OTA disponible : l'applique silencieusement
 * - Si APK disponible : retourne le résultat pour afficher le dialogue
 */
export async function checkUpdateOnStartup(): Promise<UpdateCheckResult | null> {
  // Seulement sur Android natif
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null;
  }

  // Throttle : vérifie max 1 fois par 30 minutes
  const lastCheck = localStorage.getItem('lastUpdateCheck');
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;

  if (lastCheck && now - parseInt(lastCheck) < THIRTY_MINUTES) {
    console.log('[Update] Vérification récente, skip');
    return null;
  }

  localStorage.setItem('lastUpdateCheck', now.toString());

  try {
    const result = await checkForUpdate();

    if (!result.updateAvailable) {
      console.log('[Update] App à jour');
      return null;
    }

    // Pour les mises à jour bundle OTA : on retourne le résultat
    // L'UI décidera si elle applique silencieusement ou montre un dialogue
    return result;
  } catch (error) {
    console.error('[Update] Erreur startup check:', error);
    return null;
  }
}
