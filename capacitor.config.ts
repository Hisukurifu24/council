import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor wraps the Next.js static export in `out/` as the native web bundle.
// Build for native:  npm run build  &&  npx cap sync
const config: CapacitorConfig = {
  appId: "app.council.dndtime",
  appName: "Council",
  webDir: "out",
  backgroundColor: "#0d0a1aff",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0d0a1a",
      showSpinner: false,
    },
  },
};

export default config;
