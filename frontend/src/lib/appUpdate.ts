/**
 * Système de mise à jour automatique APK pour Android
 *
 * Fonctionnement :
 * 1. Vérifie sur Supabase s'il y a une nouvelle version
 * 2. Compare avec la version installée
 * 3. Télécharge et propose l'installation
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { createClient } from '@supabase/supabase-js';

// Version actuelle de l'app (doit correspondre à package.json)
export const APP_VERSION = '1.2.0';

// Client Supabase non-typé pour la table app_versions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

export interface AppUpdateInfo {
  version: string;
  version_code: number;
  download_url: string;
  release_notes: string;
  release_notes_fr: string;
  min_version?: string;
  force_update: boolean;
  created_at: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  releaseNotes: string;
  downloadUrl: string;
}

/**
 * Compare deux versions semver (ex: "1.2.0" > "1.1.0")
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
 * Vérifie si une mise à jour est disponible
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const result: UpdateCheckResult = {
    updateAvailable: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    forceUpdate: false,
    releaseNotes: '',
    downloadUrl: '',
  };

  // Seulement sur Android natif
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return result;
  }

  try {
    // Récupère la dernière version depuis Supabase
    const { data, error } = await supabaseClient
      .from('app_versions')
      .select('*')
      .eq('platform', 'android')
      .eq('is_active', true)
      .order('version_code', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.log('No update info found:', error?.message);
      return result;
    }

    const updateInfo = data as AppUpdateInfo;
    result.latestVersion = updateInfo.version;
    result.releaseNotes = updateInfo.release_notes_fr || updateInfo.release_notes;
    result.downloadUrl = updateInfo.download_url;
    result.forceUpdate = updateInfo.force_update;

    // Compare les versions
    if (compareVersions(updateInfo.version, APP_VERSION) > 0) {
      result.updateAvailable = true;

      // Vérifie si c'est une mise à jour forcée (version minimum requise)
      if (updateInfo.min_version) {
        if (compareVersions(updateInfo.min_version, APP_VERSION) > 0) {
          result.forceUpdate = true;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error checking for update:', error);
    return result;
  }
}

/**
 * Télécharge l'APK et lance l'installation
 */
export async function downloadAndInstallUpdate(
  downloadUrl: string,
  onProgress?: (progress: number) => void
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    onProgress?.(0);

    // Télécharge l'APK
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Cannot read response');
    }

    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      loaded += value.length;

      if (total > 0) {
        onProgress?.(Math.round((loaded / total) * 100));
      }
    }

    // Combine les chunks en un seul ArrayBuffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedArray = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combinedArray.set(chunk, offset);
      offset += chunk.length;
    }

    // Convertit en base64
    let binary = '';
    for (let i = 0; i < combinedArray.length; i++) {
      binary += String.fromCharCode(combinedArray[i]);
    }
    const base64 = btoa(binary);

    // Sauvegarde le fichier
    const fileName = 'stockpro-update.apk';
    await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    onProgress?.(100);

    // Récupère le chemin complet du fichier
    const fileUri = await Filesystem.getUri({
      path: fileName,
      directory: Directory.Cache,
    });

    // Lance l'installation via intent Android
    await installApk(fileUri.uri);

    return true;
  } catch (error) {
    console.error('Error downloading update:', error);
    return false;
  }
}

/**
 * Lance l'installation de l'APK via un intent Android
 */
async function installApk(fileUri: string): Promise<void> {
  try {
    // Utilise cordova-plugin-file-opener2 pour ouvrir l'APK
    // @ts-expect-error - cordova plugin global
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.fileOpener2) {
      // @ts-expect-error - cordova plugin global
      window.cordova.plugins.fileOpener2.open(
        fileUri,
        'application/vnd.android.package-archive',
        {
          error: (e: Error) => {
            console.error('Error opening APK:', e);
            // Fallback: essayer d'ouvrir directement
            window.open(fileUri, '_system');
          },
          success: () => {
            console.log('APK installer launched successfully');
          }
        }
      );
    } else {
      // Fallback si le plugin n'est pas disponible
      console.log('FileOpener2 not available, trying fallback');
      window.open(fileUri, '_system');
    }
  } catch (error) {
    console.error('Error launching APK installer:', error);
    // Dernier fallback
    window.open(fileUri, '_system');
  }
}

/**
 * Vérifie les mises à jour au démarrage et affiche une notification si disponible
 */
export async function checkUpdateOnStartup(): Promise<UpdateCheckResult | null> {
  // Seulement sur Android
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return null;
  }

  // Vérifie si on a déjà vérifié récemment (1 fois par heure max)
  const lastCheck = localStorage.getItem('lastUpdateCheck');
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  if (lastCheck && now - parseInt(lastCheck) < ONE_HOUR) {
    return null;
  }

  localStorage.setItem('lastUpdateCheck', now.toString());

  const result = await checkForUpdate();

  if (result.updateAvailable) {
    return result;
  }

  return null;
}
