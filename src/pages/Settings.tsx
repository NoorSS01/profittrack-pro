import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currency, setCurrency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    business_name: "",
    contact_email: "",
    billing_cycle_start: "1",
  });

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
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your business preferences</p>
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
    </div>
  );
};

export default Settings;
