import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, Smartphone, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import {
  type UpdateCheckResult,
  downloadAndApplyBundle,
  downloadAndInstallApk,
} from '@/lib/appUpdate';

interface UpdateDialogProps {
  updateInfo: UpdateCheckResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateDialog({ updateInfo, open, onOpenChange }: UpdateDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [downloadComplete, setDownloadComplete] = useState(false);

  if (!updateInfo) return null;

  const isBundleUpdate = updateInfo.updateType === 'bundle';

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    setProgress(0);

    let success: boolean;

    if (isBundleUpdate) {
      // Mise à jour OTA du bundle web (rapide, pas de réinstallation)
      success = await downloadAndApplyBundle(
        updateInfo.bundleUrl,
        updateInfo.latestVersion,
        (p) => setProgress(p)
      );
    } else {
      // Mise à jour APK complète (téléchargement + installation)
      success = await downloadAndInstallApk(updateInfo.downloadUrl, (p) => setProgress(p));
    }

    if (success) {
      setDownloadComplete(true);
    } else {
      setError('Erreur lors du téléchargement. Vérifiez votre connexion internet.');
    }

    setDownloading(false);
  };

  const handleClose = () => {
    if (!updateInfo.forceUpdate && !downloading) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => updateInfo.forceUpdate && e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {updateInfo.forceUpdate ? (
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            ) : isBundleUpdate ? (
              <div className="p-2 bg-blue-500/10 rounded-full">
                <Zap className="w-6 h-6 text-blue-500" />
              </div>
            ) : (
              <div className="p-2 bg-primary/10 rounded-full">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
            )}
            <div>
              <DialogTitle>
                {updateInfo.forceUpdate
                  ? 'Mise à jour requise'
                  : 'Nouvelle version disponible'}
              </DialogTitle>
              <DialogDescription className="text-left">
                Version {updateInfo.latestVersion}
                {isBundleUpdate && ' — Mise à jour rapide'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Notes de version */}
          {updateInfo.releaseNotes && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Nouveaut&eacute;s :</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {updateInfo.releaseNotes}
              </p>
            </div>
          )}

          {/* Version actuelle vs nouvelle */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Version actuelle</span>
            <span className="font-mono">{updateInfo.currentVersion}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Nouvelle version</span>
            <span className="font-mono text-primary">{updateInfo.latestVersion}</span>
          </div>

          {/* Info type de mise à jour */}
          {isBundleUpdate && !downloading && !downloadComplete && (
            <p className="text-sm text-blue-600 bg-blue-500/10 p-3 rounded-lg">
              Mise à jour instantan&eacute;e — l'application se rechargera automatiquement.
            </p>
          )}

          {/* Barre de progression */}
          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {isBundleUpdate
                    ? 'Application de la mise à jour...'
                    : 'Téléchargement en cours...'}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Message de succès */}
          {downloadComplete && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">
                {isBundleUpdate
                  ? "Mise à jour appliquée ! L'application va recharger..."
                  : "Téléchargement terminé ! L'installation va démarrer..."}
              </span>
            </div>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Message mise à jour forcée */}
          {updateInfo.forceUpdate && (
            <p className="text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg">
              Cette mise à jour est obligatoire pour continuer à utiliser l'application.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!updateInfo.forceUpdate && !downloading && !downloadComplete && (
            <Button variant="outline" onClick={handleClose}>
              Plus tard
            </Button>
          )}

          {!downloadComplete && (
            <Button onClick={handleDownload} disabled={downloading} className="gap-2">
              {downloading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isBundleUpdate ? 'Mise à jour...' : 'Téléchargement...'}
                </>
              ) : (
                <>
                  {isBundleUpdate ? (
                    <Zap className="w-4 h-4" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isBundleUpdate ? 'Mettre à jour maintenant' : 'Télécharger la mise à jour'}
                </>
              )}
            </Button>
          )}

          {error && (
            <Button onClick={handleDownload} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
