/// <reference types="@capgo/capacitor-updater" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stockpro.clinique',
  appName: 'StockPro',
  webDir: 'dist',
  server: {
    // Pour le développement, utiliser l'URL locale
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorUpdater: {
      // Active les mises à jour automatiques
      autoUpdate: true,
      // Délai avant de vérifier les mises à jour (en secondes)
      appReadyTimeout: 10000,
      // Délai entre les vérifications (en secondes) - 1 heure
      periodCheckDelay: 3600,
      // Supprime automatiquement les versions qui ont échoué
      autoDeleteFailed: true,
      // Supprime automatiquement les anciennes versions
      autoDeletePrevious: true,
    },
    PushNotifications: {
      // Demander automatiquement les permissions au premier lancement
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      // Configuration des icônes par défaut
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
