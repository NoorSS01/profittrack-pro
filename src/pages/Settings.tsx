import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, DollarSign, CalendarDays, ArrowLeft, Fuel, Truck, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { useUserType } from "@/contexts/UserTypeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency, setCurrency } = useCurrency();
  const { userType, setUserType, canSelectAgentMode } = useUserType();
  const { plan } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [missingEntryMode, setMissingEntryMode] = useState<"daily" | "bulk">("daily");
  const [formData, setFormData] = useState({
    business_name: "",
    contact_email: "",
    billing_cycle_start: "1",
    fuel_price_per_liter: "100",
  });

  // Load missing entry mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("missing_entry_mode") as "daily" | "bulk" | null;
    if (savedMode) {
      setMissingEntryMode(savedMode);
    }
  }, []);

  const handleMissingEntryModeChange = (value: "daily" | "bulk") => {
    setMissingEntryMode(value);
    localStorage.setItem("missing_entry_mode", value);
    toast({
      title: "Setting Updated",
      description: value === "daily"
        ? "Missing entries will be filled day by day"
        : "Missing entries can be filled with total kilometers for date range",
    });
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          business_name: data.business_name || "",
          contact_email: data.contact_email || "",
          billing_cycle_start: data.billing_cycle_start?.toString() || "1",
          fuel_price_per_liter: data.fuel_price_per_liter?.toString() || "100",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          business_name: formData.business_name,
          contact_email: formData.contact_email,
          billing_cycle_start: parseInt(formData.billing_cycle_start),
          fuel_price_per_liter: parseFloat(formData.fuel_price_per_liter) || 100,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => navigate("/account")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your business preferences</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Business Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                placeholder="Your business name"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="business@email.com"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_cycle_start">Billing Cycle Start Day</Label>
              <Input
                id="billing_cycle_start"
                type="number"
                min="1"
                max="31"
                value={formData.billing_cycle_start}
                onChange={(e) => setFormData({ ...formData, billing_cycle_start: e.target.value })}
                className="h-12"
              />
              <p className="text-sm text-muted-foreground">Day of month when your billing cycle starts (1-31)</p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Preference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="currency">Display Currency</Label>
            <Select value={currency} onValueChange={(value) => setCurrency(value as "INR" | "USD")}>
              <SelectTrigger id="currency" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This will update currency display across the entire website
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5" />
            Fuel Price
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fuel_price_per_liter">Default Fuel Price per Liter (₹)</Label>
              <Input
                id="fuel_price_per_liter"
                type="number"
                step="0.01"
                min="0"
                value={formData.fuel_price_per_liter}
                onChange={(e) => setFormData({ ...formData, fuel_price_per_liter: e.target.value })}
                placeholder="e.g., 100"
                className="h-12"
              />
              <p className="text-sm text-muted-foreground">
                This price will be used for fuel cost calculations in Daily Entry
              </p>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Save Fuel Price"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User Type - Only for Standard/Ultra */}
      {canSelectAgentMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Operating Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select how you operate your transport business
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setUserType("owner")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${userType === "owner"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Vehicle Owner</h4>
                    <p className="text-xs text-muted-foreground">I own the vehicles</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setUserType("agent")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${userType === "agent"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Users className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Agent / Broker</h4>
                    <p className="text-xs text-muted-foreground">I manage delivery partners</p>
                  </div>
                </div>
              </button>
            </div>
            {userType === "agent" && (
              <p className="text-xs text-muted-foreground bg-amber-500/10 p-3 rounded-lg">
                💡 In Agent mode, you can add Partner details and Commission when adding vehicles.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Missing Entry Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="missing_entry_mode">How to fill missing entries</Label>
            <Select value={missingEntryMode} onValueChange={(value) => handleMissingEntryModeChange(value as "daily" | "bulk")}>
              <SelectTrigger id="missing_entry_mode" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily Entry - Fill each day separately</SelectItem>
                <SelectItem value="bulk">Bulk Entry - Enter total KM for date range</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {missingEntryMode === "daily"
                ? "You'll enter kilometers for each missing day individually"
                : "You'll enter total kilometers which will be distributed across missing days"
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
