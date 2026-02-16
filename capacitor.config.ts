import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rafiq.designer',
  appName: 'رفيق المصمم',
  webDir: 'out',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: "#e65c82", // This is the primary color hsl(350 72% 51%)
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
  server: {
    // For development with live-reload, set the server URL to your local IP.
    // Example: url: 'http://192.168.1.100:9002',
    // For production builds, this should be undefined.
    cleartext: process.env.NODE_ENV === 'production' ? undefined : true,
  }
};

export default config;
