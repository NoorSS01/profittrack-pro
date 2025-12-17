import { useState, useEffect, useCallback } from "react";
import { X, Download, Smartphone, Monitor, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Capture the install prompt event globally BEFORE React loads
declare global {
  interface Window {
    deferredPWAPrompt: BeforeInstallPromptEvent | null;
  }
}

// Initialize global prompt storage
if (typeof window !== 'undefined' && window.deferredPWAPrompt === undefined) {
  window.deferredPWAPrompt = null;
  
  // Listen for the event immediately
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.deferredPWAPrompt = e as BeforeInstallPromptEvent;
    console.log("✅ PWA: beforeinstallprompt captured globally!");
  });
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");
  const { trigger } = useHaptic();

  useEffect(() => {
    // Check if already installed as standalone
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      console.log("PWA: Already running as standalone app");
      return;
    }

    // Check if dismissed this session
    const isDismissed = sessionStorage.getItem("pwa-banner-dismissed") === "true";
    if (isDismissed) return;

    // Detect device
    const userAgent = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);

    // Check if we already have the prompt from global capture
    if (window.deferredPWAPrompt) {
      console.log("✅ PWA: Using globally captured prompt");
      setInstallPrompt(window.deferredPWAPrompt);
      setDebugInfo("Install ready");
    }

    // Also listen for new events (in case it fires after component mount)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.deferredPWAPrompt = promptEvent;
      setInstallPrompt(promptEvent);
      console.log("✅ PWA: beforeinstallprompt captured in component!");
      setDebugInfo("Install ready");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      console.log("✅ PWA: App was installed!");
      setShowBanner(false);
      window.deferredPWAPrompt = null;
      setInstallPrompt(null);
    });

    // Show banner after delay
    const timer = setTimeout(() => {
      setShowBanner(true);
      
      // Debug info
      const info = [];
      if (window.deferredPWAPrompt) info.push("Prompt: ✓");
      else info.push("Prompt: ✗");
      if (isIOSDevice) info.push("iOS");
      else if (isMobileDevice) info.push("Android/Mobile");
      else info.push("Desktop");
      info.push(window.location.protocol);
      setDebugInfo(info.join(" | "));
    }, 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    trigger("medium");
    
    // Get the prompt from state or global
    const prompt = installPrompt || window.deferredPWAPrompt;
    
    console.log("PWA Install clicked. Prompt available:", !!prompt);
    
    if (prompt) {
      try {
        console.log("PWA: Triggering native install prompt...");
        await prompt.prompt();
        
        const { outcome } = await prompt.userChoice;
        console.log("PWA: User choice:", outcome);
        
        if (outcome === "accepted") {
          setShowBanner(false);
          sessionStorage.setItem("pwa-banner-dismissed", "true");
        }
        
        // Clear the prompt after use (can only be used once)
        window.deferredPWAPrompt = null;
        setInstallPrompt(null);
      } catch (error) {
        console.error("PWA: Install prompt error:", error);
        // Show fallback instructions on error
        showManualInstructions();
      }
    } else {
      console.log("PWA: No install prompt available, showing manual instructions");
      showManualInstructions();
    }
  }, [installPrompt, trigger]);

  const showManualInstructions = () => {
    const userAgent = navigator.userAgent;
    let instructions = "";
    
    if (/Android/i.test(userAgent)) {
      instructions = "To install on Android:\n\n1. Tap the menu (⋮) in Chrome\n2. Select 'Add to Home screen'\n3. Tap 'Add'";
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      instructions = "To install on iOS:\n\n1. Tap the Share button\n2. Scroll down and tap 'Add to Home Screen'\n3. Tap 'Add'";
    } else {
      instructions = "To install:\n\n• Chrome/Edge: Click the install icon (⊕) in the address bar\n• Or click menu → 'Install TransportPro'";
    }
    
    alert(instructions);
  };

  const handleDismiss = () => {
    trigger("light");
    setShowBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  };

  if (!showBanner) return null;

  const hasPrompt = !!(installPrompt || window.deferredPWAPrompt);

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
            // iOS doesn't support beforeinstallprompt, show manual instructions
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-primary" />
                <span>Tap <strong>Share</strong> button below</span>
              </div>
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>Select <strong>Add to Home Screen</strong></span>
              </div>
            </div>
          ) : (
            // Android and other mobile browsers
            <Button onClick={handleInstall} className="w-full gap-2" size="lg">
              <Download className="h-4 w-4" />
              {hasPrompt ? "Install App" : "How to Install"}
            </Button>
          )}
          
          {/* Debug info - remove in production */}
          {debugInfo && (
            <p className="text-[10px] text-muted-foreground mt-2 text-center opacity-50">
              {debugInfo}
            </p>
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
          {hasPrompt ? "Install App" : "How to Install"}
        </Button>
        
        {/* Debug info - remove in production */}
        {debugInfo && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center opacity-50">
            {debugInfo}
          </p>
        )}
      </div>
    </div>
  );
}
