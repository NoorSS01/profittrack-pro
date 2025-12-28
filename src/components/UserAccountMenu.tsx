import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const UserAccountMenu = () => {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const navigate = useNavigate();

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const getPlanColor = () => {
    switch (plan) {
      case "ultra": return "bg-gradient-to-r from-amber-500 to-orange-500";
      case "standard": return "bg-primary";
      case "basic": return "bg-blue-500";
      case "trial": return "bg-green-500";
      default: return "bg-destructive";
    }
  };

  return (
    <Button 
      variant="ghost" 
      className="relative h-9 w-9 rounded-full p-0"
      onClick={() => navigate("/account")}
    >
      <Avatar className="h-9 w-9 border-2 border-primary/20">
        <AvatarFallback className={cn("text-sm font-bold text-white", getPlanColor())}>
          {getInitials()}
        </AvatarFallback>
      </Avatar>
    </Button>
  );
};
