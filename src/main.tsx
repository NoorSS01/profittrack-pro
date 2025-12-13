import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";
import { CurrencyProvider } from "./contexts/CurrencyContext";

// Declare global type for the install prompt
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  }
  interface Window {
    deferredInstallPrompt: BeforeInstallPromptEvent | null;
  }
}

// Capture beforeinstallprompt EARLY - before React mounts
// This prevents missing the event due to timing issues
window.deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
  console.log("PWA: Install prompt captured and stored");
});

// Register service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New content available. Reload to update?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(
  <CurrencyProvider>
    <App />
  </CurrencyProvider>
);
