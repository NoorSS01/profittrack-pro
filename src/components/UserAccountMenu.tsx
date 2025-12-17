import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Settings, Crown, LogOut, CreditCard, HelpCircle } from "lucide-react";

export const UserAccountMenu = () => {
  const { user } = useAuth();
  const { plan, trialDaysLeft, isTrialActive } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const getInitials = () => {
    if (!user?.email) return "U";
    return user.email.charAt(0).toUpperCase();
  };

  const getPlanBadge = () => {
    switch (plan) {
      case "trial":
        return <Badge variant="secondary" className="text-xs">{trialDaysLeft}d left</Badge>;
      case "basic":
        return <Badge variant="outline" className="text-xs">Basic</Badge>;
      case "standard":
        return <Badge className="text-xs bg-primary">Standard</Badge>;
      case "ultra":
        return <Badge className="text-xs bg-amber-500">Ultra</Badge>;
      default:
        return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium leading-none truncate max-w-[180px]">
                {user?.email}
              </p>
              {getPlanBadge()}
            </div>
            {isTrialActive && (
              <p className="text-xs text-muted-foreground">
                Free trial • {trialDaysLeft} days remaining
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => { setOpen(false); navigate("/settings"); }}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => { setOpen(false); navigate("/pricing"); }}>
          <Crown className="mr-2 h-4 w-4" />
          <span>Upgrade Plan</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => { setOpen(false); navigate("/pricing"); }}>
          <CreditCard className="mr-2 h-4 w-4" />
          <span>Billing</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
