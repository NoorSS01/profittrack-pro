import { useState, useEffect } from "react";
import { X, Download, Smartphone, Monitor, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { trigger } = useHaptic();

  useEffect(() => {
    // Check if already installed as standalone
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // Check if dismissed
    const isDismissed = sessionStorage.getItem("pwa-banner-dismissed") === "true";
    if (isDismissed) return;

    // Detect device
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Show banner after short delay
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    trigger("medium");
    
    const prompt = deferredPrompt || globalDeferredPrompt;
    
    if (prompt) {
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === "accepted") {
          setShowBanner(false);
          sessionStorage.setItem("pwa-banner-dismissed", "true");
        }
      } catch (error) {
        console.error("Install error:", error);
      }
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    } else {
      // Fallback: Show instructions for manual installation
      alert("To install:\n\n• Chrome/Edge: Click the install icon (⊕) in the address bar\n• Safari: Tap Share → Add to Home Screen\n• Firefox: Click menu → Install");
    }
  };

  const handleDismiss = () => {
    trigger("light");
    setShowBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (!showBanner) return null;

  // Mobile view
  if (isMobile) {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-[100] animate-in slide-in-from-bottom-5 duration-300 lg:hidden">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xl">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-primary text-primary-foreground">
              <Smartphone className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Install TransportPro</h3>
              <p className="text-xs text-muted-foreground">Quick access & offline mode</p>
            </div>
          </div>
          
          {isIOS ? (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-primary" />
                <span>Tap <strong>Share</strong> button</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>Select <strong>Add to Home Screen</strong></span>
              </div>
            </div>
          ) : (
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="h-4 w-4" />
              Install App
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Desktop view
  return (
    <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-5 duration-300 w-72 hidden lg:block">
      <div className="bg-card border border-border rounded-xl p-4 shadow-xl">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary text-primary-foreground">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Install TransportPro</h3>
            <p className="text-xs text-muted-foreground">Quick access & offline mode</p>
          </div>
        </div>
        
        <Button onClick={handleInstall} className="w-full gap-2" size="sm">
          <Download className="h-4 w-4" />
          Install App
        </Button>
      </div>
    </div>
  );
}
