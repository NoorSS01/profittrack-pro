import { createRoot } from "react-dom/client";
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
window.deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
  console.log("PWA: Install prompt captured and stored");
});

// Register service worker manually
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/dist/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("PWA: Service Worker registered with scope:", registration.scope);
      })
      .catch((error) => {
        console.log("PWA: Service Worker registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <CurrencyProvider>
    <App />
  </CurrencyProvider>
);

