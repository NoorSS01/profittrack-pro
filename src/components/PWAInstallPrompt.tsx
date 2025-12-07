import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { trigger } = useHaptic();

  useEffect(() => {
    // Check if already installed or dismissed
    const isInstalled = window.matchMedia("(display-mode: standalone)").matches;
    const isDismissed = localStorage.getItem("pwa-install-dismissed");
    
    if (isInstalled || isDismissed) return;

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // For iOS, show banner after a delay
    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // For other browsers, listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    trigger("medium");
    
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    trigger("light");
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300 md:hidden">
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-2xl">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
            <Smartphone className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-semibold text-foreground text-sm">
              Install TransportPro
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isIOS 
                ? "Tap the share button and select 'Add to Home Screen'"
                : "Install for quick access and offline use"
              }
            </p>
          </div>
        </div>
        
        {!isIOS && (
          <Button
            onClick={handleInstall}
            className="w-full mt-4 gap-2"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Install App
          </Button>
        )}
        
        {isIOS && (
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Tap</span>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span>then "Add to Home Screen"</span>
          </div>
        )}
      </div>
    </div>
  );
}
