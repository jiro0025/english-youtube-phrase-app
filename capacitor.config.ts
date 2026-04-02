import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.phrasemanager.app',
  appName: 'English Phrase Manager',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0f0a1e',
    preferredContentMode: 'mobile',
    "useSwiftPackageManager": true,
    // @ts-expect-error SPM bypass
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0f0a1e',
    },
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1500,
      backgroundColor: '#0f0a1e',
      showSpinner: false,
    },
  },
};

export default config;
