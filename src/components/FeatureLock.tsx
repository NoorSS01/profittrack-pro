import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription, PlanType } from "@/contexts/SubscriptionContext";
import { Lock, Crown, Zap, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface FeatureLockProps {
  children: ReactNode;
  feature: string;
  requiredPlan: PlanType;
  currentValue?: number;
  maxValue?: number;
  showLockOverlay?: boolean;
}

// Map plan to display name and icon
const PLAN_INFO: Record<PlanType, { name: string; icon: typeof Crown; color: string }> = {
  trial: { name: "Trial", icon: Truck, color: "text-blue-500" },
  basic: { name: "Basic", icon: Truck, color: "text-blue-500" },
  standard: { name: "Standard", icon: Zap, color: "text-primary" },
  ultra: { name: "Ultra", icon: Crown, color: "text-amber-500" },
  expired: { name: "Expired", icon: Lock, color: "text-muted-foreground" },
};

// Feature descriptions for upgrade dialog
const FEATURE_DESCRIPTIONS: Record<string, string> = {
  aiChat: "AI Assistant helps analyze your data and provides personalized insights for your transport business.",
  vehicles: "Add more vehicles to track your entire fleet's performance.",
  tripHistory: "Access more days of trip history to analyze long-term trends.",
  dashboardView: "View extended dashboard analytics for better business insights.",
  reportsExport: "Export your reports to PDF and Excel for record keeping.",
  prioritySupport: "Get faster response times and dedicated support channels.",
};

export function FeatureLock({
  children,
  feature,
  requiredPlan,
  currentValue,
  maxValue,
  showLockOverlay = false,
}: FeatureLockProps) {
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

  // Check if feature is locked
  const isLocked = () => {
    if (plan === "expired") return true;
    
    const planOrder: PlanType[] = ["expired", "basic", "standard", "ultra", "trial"];
    const currentPlanIndex = planOrder.indexOf(plan);
    const requiredPlanIndex = planOrder.indexOf(requiredPlan);
    
    // Trial has access to most features
    if (plan === "trial") return false;
    
    return currentPlanIndex < requiredPlanIndex;
  };

  // Check if limit is exceeded
  const isLimitExceeded = () => {
    if (currentValue !== undefined && maxValue !== undefined) {
      return currentValue >= maxValue;
    }
    return false;
  };

  const locked = isLocked() || isLimitExceeded();

  const handleClick = (e: React.MouseEvent) => {
    if (locked) {
      e.preventDefault();
      e.stopPropagation();
      setShowDialog(true);
    }
  };

  const PlanIcon = PLAN_INFO[requiredPlan].icon;

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <>
      <div 
        className="relative cursor-pointer" 
        onClick={handleClick}
      >
        {showLockOverlay ? (
          <div className="relative">
            <div className="opacity-50 pointer-events-none blur-[1px]">
              {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
              <div className="flex flex-col items-center gap-2 p-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-center">
                  Upgrade to {PLAN_INFO[requiredPlan].name}
                </p>
                <Button size="sm" variant="default" onClick={() => setShowDialog(true)}>
                  Unlock Feature
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="opacity-60 pointer-events-none">
            {children}
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              Feature Locked
            </DialogTitle>
            <DialogDescription>
              This feature requires a higher subscription plan.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center`}>
                  <PlanIcon className={`h-5 w-5 ${PLAN_INFO[requiredPlan].color}`} />
                </div>
                <div>
                  <p className="font-semibold">{PLAN_INFO[requiredPlan].name} Plan Required</p>
                  <p className="text-sm text-muted-foreground">Unlock this feature</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                {FEATURE_DESCRIPTIONS[feature] || "Upgrade your plan to access this feature."}
              </p>
            </div>

            {currentValue !== undefined && maxValue !== undefined && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  You've reached your limit: {currentValue}/{maxValue}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDialog(false)}>
                Maybe Later
              </Button>
              <Button className="flex-1" onClick={() => { setShowDialog(false); navigate("/pricing"); }}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Hook to check feature access
export function useFeatureAccess() {
  const { plan, limits } = useSubscription();

  const canAccessAIChat = () => {
    if (plan === "expired") return false;
    return limits.aiChatEnabled;
  };

  const canAddVehicle = (currentCount: number) => {
    if (plan === "expired") return false;
    return currentCount < limits.maxVehicles;
  };

  const getMaxTripHistoryDays = () => {
    return limits.tripHistoryDays;
  };

  const getMaxDashboardMonths = () => {
    return limits.dashboardMonths;
  };

  const canExportReports = () => {
    if (plan === "expired") return false;
    return limits.reportsExport;
  };

  const getRequiredPlanForFeature = (feature: string): PlanType => {
    switch (feature) {
      case "aiChat":
        return "standard";
      case "vehicles5":
        return "standard";
      case "vehiclesUnlimited":
        return "ultra";
      case "tripHistory90":
        return "standard";
      case "tripHistoryUnlimited":
        return "ultra";
      case "dashboard6months":
        return "standard";
      case "dashboardAllTime":
        return "ultra";
      case "reportsExport":
        return "ultra";
      default:
        return "basic";
    }
  };

  return {
    plan,
    limits,
    canAccessAIChat,
    canAddVehicle,
    getMaxTripHistoryDays,
    getMaxDashboardMonths,
    canExportReports,
    getRequiredPlanForFeature,
  };
}
