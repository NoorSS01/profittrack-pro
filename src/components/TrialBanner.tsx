import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Clock, Crown } from "lucide-react";

export const TrialBanner = () => {
  const { plan, trialDaysLeft, isTrialActive } = useSubscription();
  const navigate = useNavigate();

  // Don't show banner for paid plans
  if (plan !== "trial" || !isTrialActive) return null;

  const urgencyColor = trialDaysLeft <= 3 
    ? "bg-destructive/10 border-destructive/30 text-destructive" 
    : trialDaysLeft <= 7 
      ? "bg-warning/10 border-warning/30 text-warning"
      : "bg-primary/10 border-primary/30 text-primary";

  return (
    <div className={`mx-4 mb-4 p-3 rounded-lg border ${urgencyColor} flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">
          {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left in trial
        </span>
      </div>
      <Button 
        size="sm" 
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => navigate("/pricing")}
      >
        <Crown className="h-3 w-3" />
        Upgrade
      </Button>
    </div>
  );
};
