import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription, PLAN_PRICES } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, differenceInDays } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  User,
  Mail,
  Crown,
  Calendar,
  Truck,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  Shield,
  CreditCard,
  TrendingUp,
  Clock,
  Edit2,
  Check,
  X,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Admin emails
const ADMIN_EMAILS = ["mohammednoorsirasgi@gmail.com"];

interface AccountStats {
  totalVehicles: number;
  totalEntries: number;
  totalKilometers: number;
  totalEarnings: number;
  memberSince: string;
}

const Account = () => {
  const { user } = useAuth();
  const { plan, trialDaysLeft, isTrialActive, subscriptionEndDate, limits } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AccountStats>({
    totalVehicles: 0,
    totalEntries: 0,
    totalKilometers: 0,
    totalEarnings: 0,
    memberSince: "",
  });
  const [profile, setProfile] = useState({
    full_name: "",
    business_name: "",
    contact_email: "",
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (user) {
      fetchAccountData();
    }
  }, [user]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          business_name: profileData.business_name || "",
          contact_email: profileData.contact_email || user?.email || "",
        });
        setEditName(profileData.full_name || "");
      }

      // Fetch stats
      const [vehiclesRes, entriesRes] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }).eq("user_id", user?.id),
        supabase.from("daily_entries").select("kilometers, trip_earnings").eq("user_id", user?.id),
      ]);

      const entries = entriesRes.data || [];
      const totalKm = entries.reduce((sum, e) => sum + Number(e.kilometers || 0), 0);
      const totalEarnings = entries.reduce((sum, e) => sum + Number(e.trip_earnings || 0), 0);

      setStats({
        totalVehicles: vehiclesRes.count || 0,
        totalEntries: entries.length,
        totalKilometers: totalKm,
        totalEarnings: totalEarnings,
        memberSince: profileData?.created_at || "",
      });
    } catch (error) {
      console.error("Error fetching account data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editName.trim() } as any)
        .eq("id", user?.id);

      if (error) throw error;

      setProfile(prev => ({ ...prev, full_name: editName.trim() }));
      setIsEditingName(false);
      toast({ title: "Name updated", description: "Your name has been saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
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

  const getPlanName = () => {
    switch (plan) {
      case "ultra": return "Ultra";
      case "standard": return "Standard";
      case "basic": return "Basic";
      case "trial": return "Free Trial";
      default: return "Expired";
    }
  };

  const getDaysRemaining = () => {
    if (plan === "trial") return trialDaysLeft;
    if (subscriptionEndDate) {
      return Math.max(0, differenceInDays(parseISO(subscriptionEndDate), new Date()));
    }
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchAccountData} className="min-h-[calc(100vh-8rem)] lg:min-h-0">
      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold">Account</h1>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarFallback className={cn("text-xl font-bold text-white", getPlanColor())}>
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your name"
                      className="h-9"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" onClick={handleSaveName} disabled={savingName}>
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setIsEditingName(false); setEditName(profile.full_name); }}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold truncate">
                      {profile.full_name || "Add your name"}
                    </h2>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsEditingName(true)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-1">
                  <Mail className="h-3.5 w-3.5" />
                  {user?.email}
                </p>
                
                {profile.business_name && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {profile.business_name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Card */}
        <Card className={cn("overflow-hidden", plan === "ultra" && "ring-2 ring-amber-500/50")}>
          <div className={cn("h-1.5", getPlanColor())} />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className={cn("h-5 w-5", plan === "ultra" ? "text-amber-500" : "text-primary")} />
                Subscription
              </CardTitle>
              <Badge className={cn("text-white", getPlanColor())}>
                {getPlanName()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-semibold text-sm">
                  {plan === "expired" ? "Expired" : "Active"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {plan === "trial" ? "Trial ends in" : plan === "expired" ? "Expired" : "Renews in"}
                </p>
                <p className="font-semibold text-sm">
                  {plan === "expired" ? "—" : `${getDaysRemaining()} days`}
                </p>
              </div>
            </div>

            {/* Plan Features */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Your Plan Includes</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <span>{limits.maxVehicles === 999 ? "Unlimited" : limits.maxVehicles} Vehicles</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{limits.tripHistoryDays === 9999 ? "Unlimited" : `${limits.tripHistoryDays}d`} History</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className={cn("h-4 w-4", limits.aiChatEnabled ? "text-primary" : "text-muted-foreground")} />
                  <span className={!limits.aiChatEnabled ? "text-muted-foreground" : ""}>
                    {limits.aiChatEnabled ? (limits.aiChatDailyLimit === 999 ? "Unlimited AI" : `${limits.aiChatDailyLimit}/day AI`) : "No AI"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className={cn("h-4 w-4", limits.reportsExport ? "text-primary" : "text-muted-foreground")} />
                  <span className={!limits.reportsExport ? "text-muted-foreground" : ""}>
                    {limits.reportsExport ? "Export Reports" : "No Export"}
                  </span>
                </div>
              </div>
            </div>

            {/* Upgrade Button */}
            {plan !== "ultra" && (
              <Button className="w-full" onClick={() => navigate("/pricing")}>
                <Crown className="h-4 w-4 mr-2" />
                {plan === "expired" ? "Choose a Plan" : "Upgrade Plan"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Your Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <Truck className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                <p className="text-xl font-bold">{stats.totalVehicles}</p>
                <p className="text-xs text-muted-foreground">Vehicles</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <FileText className="h-6 w-6 mx-auto mb-1 text-green-500" />
                <p className="text-xl font-bold">{stats.totalEntries}</p>
                <p className="text-xs text-muted-foreground">Entries</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                <p className="text-xl font-bold">{(stats.totalKilometers / 1000).toFixed(1)}k</p>
                <p className="text-xs text-muted-foreground">Kilometers</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <Calendar className="h-6 w-6 mx-auto mb-1 text-amber-500" />
                <p className="text-xl font-bold">
                  {stats.memberSince ? format(parseISO(stats.memberSince), "MMM yy") : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Member Since</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-between h-12 px-3"
              onClick={() => navigate("/settings")}
            >
              <span className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Settings
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-between h-12 px-3"
              onClick={() => navigate("/pricing")}
            >
              <span className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Billing & Plans
              </span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Button>

            <Separator className="my-2" />
            
            <Button
              variant="ghost"
              className="w-full justify-between h-12 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowLogoutDialog(true)}
            >
              <span className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                Log Out
              </span>
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-xs text-muted-foreground space-y-1 pt-4">
          <p>TransportPro v1.0.0</p>
          <p>© 2025 TransportPro. All rights reserved.</p>
        </div>

        {/* Logout Confirmation Dialog */}
        <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to log out of your account?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Log Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PullToRefresh>
  );
};

export default Account;
