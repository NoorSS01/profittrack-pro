import { ReactNode, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Truck, 
  FileText, 
  BarChart3,
  History,
  Settings, 
  LogOut,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useHaptic } from "@/hooks/use-haptic";
import { useSwipe } from "@/hooks/use-swipe";
import { ChatWidget } from "./chat/ChatWidget";

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { trigger } = useHaptic();

  // Navigation order for swipe gestures
  const navOrder = useMemo(() => [
    "/",
    "/trip-history",
    "/daily-entry",
    "/reports",
    "/vehicles",
    "/settings"
  ], []);

  const currentIndex = navOrder.indexOf(location.pathname);

  const handleSwipeLeft = () => {
    if (currentIndex < navOrder.length - 1) {
      trigger('light');
      navigate(navOrder[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      trigger('light');
      navigate(navOrder[currentIndex - 1]);
    }
  };

  const { swipeState, handlers: swipeHandlers } = useSwipe(
    {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight,
    },
    { threshold: 80 }
  );

  const handleNavigate = (path: string) => {
    trigger('selection');
    navigate(path);
  };

  const handleLogout = async () => {
    trigger('medium');
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const mainNavItems = [
    { icon: LayoutDashboard, label: "Home", path: "/" },
    { icon: History, label: "History", path: "/trip-history" },
    { icon: FileText, label: "Entry", path: "/daily-entry", isMain: true },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: Truck, label: "Vehicles", path: "/vehicles" },
  ];

  const desktopNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Truck, label: "Vehicles", path: "/vehicles" },
    { icon: FileText, label: "Daily Entry", path: "/daily-entry" },
    { icon: History, label: "Trip History", path: "/trip-history" },
    { icon: BarChart3, label: "Reports", path: "/reports" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  // Calculate swipe indicator position
  const swipeOffset = swipeState.swiping ? swipeState.deltaX * 0.3 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-b border-border/50 z-50 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          TransportPro
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleNavigate("/settings")}
          className={cn(
            "h-9 w-9 rounded-full touch-feedback",
            location.pathname === "/settings" && "bg-primary/10 text-primary"
          )}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-card/95 backdrop-blur-md border-t border-border/50 z-50 flex items-center justify-around px-1 pb-safe">
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isMainAction = item.isMain;
          
          if (isMainAction) {
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center -mt-6 w-14 h-14 rounded-full transition-all duration-200 btn-press",
                  "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30",
                  isActive && "ring-4 ring-primary/20"
                )}
              >
                <Plus className="h-7 w-7" />
              </button>
            );
          }
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] touch-feedback",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground active:bg-muted/50"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 mb-1 transition-transform duration-200", 
                isActive && "scale-110"
              )} />
              <span className={cn(
                "text-[10px] leading-none transition-all duration-200", 
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            TransportPro
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Profit Tracker</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {desktopNavItems.map((item) => (
            <Button
              key={item.path}
              variant={location.pathname === item.path ? "default" : "ghost"}
              className={cn(
                "w-full justify-start text-base h-11 transition-all duration-200",
                location.pathname === item.path 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "hover:bg-muted"
              )}
              onClick={() => handleNavigate(item.path)}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-base h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content with Swipe Gestures */}
      <main 
        className="lg:ml-64 pt-14 pb-24 lg:pt-0 lg:pb-0 min-h-screen"
        {...swipeHandlers}
      >
        <div 
          className="p-4 lg:p-8 transition-transform duration-100 ease-out"
          style={{ 
            transform: `translateX(${swipeOffset}px)`,
            opacity: swipeState.swiping ? 1 - Math.abs(swipeState.deltaX) / 500 : 1
          }}
        >
          {children}
        </div>
        
        {/* Swipe Indicators */}
        {swipeState.swiping && swipeState.deltaX > 30 && currentIndex > 0 && (
          <div className="lg:hidden fixed left-2 top-1/2 -translate-y-1/2 bg-primary/20 rounded-full p-3 animate-pulse">
            <div className="w-1 h-8 bg-primary rounded-full" />
          </div>
        )}
        {swipeState.swiping && swipeState.deltaX < -30 && currentIndex < navOrder.length - 1 && (
          <div className="lg:hidden fixed right-2 top-1/2 -translate-y-1/2 bg-primary/20 rounded-full p-3 animate-pulse">
            <div className="w-1 h-8 bg-primary rounded-full" />
          </div>
        )}
      </main>

      {/* AI Chat Widget */}
      <ChatWidget />
    </div>
  );
};
