import { useState, useEffect } from "react";
import { X, Download, Smartphone, Monitor, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/use-haptic";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Store the deferred prompt globally so it persists
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const { trigger } = useHaptic();

  useEffect(() => {
    // Check if already installed as standalone
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      console.log("PWA: Already installed as standalone");
      return;
    }

    // Check if dismissed recently (24 hours)
    const dismissedTime = localStorage.getItem("pwa-install-dismissed-time");
    const isDismissedRecently = dismissedTime && 
      (Date.now() - parseInt(dismissedTime)) < 24 * 60 * 60 * 1000;
    
    if (isDismissedRecently) {
      console.log("PWA: Dismissed recently, not showing");
      return;
    }

    // Check device type
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    setIsIOS(isIOSDevice);
    setIsMobile(isMobileDevice);

    console.log("PWA: Device check - iOS:", isIOSDevice, "Mobile:", isMobileDevice);

    // For iOS, always show the banner with instructions
    if (isIOSDevice) {
      console.log("PWA: iOS device detected, showing banner");
      setCanInstall(true);
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }

    // Check if we already have a deferred prompt
    if (globalDeferredPrompt) {
      console.log("PWA: Using existing deferred prompt");
      setDeferredPrompt(globalDeferredPrompt);
      setCanInstall(true);
      setShowBanner(true);
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      console.log("PWA: beforeinstallprompt event fired!");
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
      setShowBanner(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log("PWA: App was installed!");
      setShowBanner(false);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
      setCanInstall(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    // For non-iOS browsers that support PWA but haven't fired the event yet
    // Show a generic banner after delay if the browser might support installation
    const isChromium = /Chrome|Chromium|Edge/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isSamsung = /SamsungBrowser/.test(userAgent);
    
    if ((isChromium || isFirefox || isSamsung) && !isIOSDevice) {
      console.log("PWA: Chromium/Firefox/Samsung browser detected, waiting for install prompt...");
      // Give the browser time to fire beforeinstallprompt
      const timer = setTimeout(() => {
        if (!globalDeferredPrompt && !showBanner) {
          console.log("PWA: No install prompt received, browser may not support or already installed");
        }
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    trigger("medium");
    
    if (deferredPrompt) {
      console.log("PWA: Triggering install prompt");
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("PWA: User choice:", outcome);
        
        if (outcome === "accepted") {
          setShowBanner(false);
          localStorage.setItem("pwa-install-dismissed-time", Date.now().toString());
        }
      } catch (error) {
        console.error("PWA: Install prompt error:", error);
      }
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    }
  };

  const handleDismiss = () => {
    trigger("light");
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed-time", Date.now().toString());
  };

  // Clear dismissal for testing (can be called from console)
  useEffect(() => {
    (window as any).resetPWABanner = () => {
      localStorage.removeItem("pwa-install-dismissed-time");
      setShowBanner(true);
      console.log("PWA: Banner reset, refresh the page");
    };
  }, []);

  if (!showBanner || !canInstall) return null;

  // Mobile Banner (Bottom)
  if (isMobile) {
    return (
      <div className="fixed bottom-20 left-3 right-3 z-50 animate-in slide-in-from-bottom-4 duration-500 lg:bottom-4 lg:left-auto lg:right-4 lg:w-96">
        <div className="bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 shadow-2xl shadow-primary/10">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shrink-0 shadow-lg shadow-primary/30">
              <Smartphone className="h-7 w-7" />
            </div>
            
            <div className="flex-1 min-w-0 pr-6">
              <h3 className="font-bold text-foreground text-base">
                Install TransportPro
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {isIOS 
                  ? "Add to your home screen for the best experience"
                  : "Get quick access & work offline"
                }
              </p>
            </div>
          </div>
          
          {isIOS ? (
            <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                  <Share className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground">Tap the <span className="font-semibold text-foreground">Share</span> button below</span>
              </div>
              <div className="flex items-center gap-3 text-sm mt-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-muted-foreground">Select <span className="font-semibold text-foreground">Add to Home Screen</span></span>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button
              onClick={handleInstall}
              className="w-full mt-4 gap-2 h-11 text-base font-semibold shadow-lg shadow-primary/20"
              size="lg"
            >
              <Download className="h-5 w-5" />
              Install Now
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Use your browser menu to install this app
            </p>
          )}
        </div>
      </div>
    );
  }

  // Desktop Banner (Top Right)
  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-500 w-80">
      <div className="bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-xl border border-primary/20 rounded-2xl p-4 shadow-2xl shadow-primary/10">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shrink-0 shadow-lg shadow-primary/30">
            <Monitor className="h-6 w-6" />
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-foreground text-sm">
              Install TransportPro
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Install for quick access and offline use
            </p>
          </div>
        </div>
        
        {deferredPrompt ? (
          <Button
            onClick={handleInstall}
            className="w-full mt-3 gap-2 font-semibold shadow-lg shadow-primary/20"
            size="sm"
          >
            <Download className="h-4 w-4" />
            Install App
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Click the install icon in your browser's address bar
          </p>
        )}
      </div>
    </div>
  );
}
