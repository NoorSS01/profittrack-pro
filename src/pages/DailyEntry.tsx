import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Calendar, TrendingUp, TrendingDown, DollarSign, Lock, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, isBefore, parseISO, startOfDay } from "date-fns";
import { useCurrency } from "@/contexts/CurrencyContext";
import { DailyEntrySkeleton } from "@/components/skeletons/DailyEntrySkeleton";
import { Badge } from "@/components/ui/badge";

// Admin emails - admins have no restrictions
const ADMIN_EMAILS = ["mohammednoorsirasgi@gmail.com"];

interface Vehicle {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  mileage_kmpl: number;
  earning_type: string;
  default_earning_value: number;
  monthly_emi: number;
  driver_monthly_salary: number;
  expected_monthly_maintenance: number;
}

const DailyEntry = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const { limits, plan } = useSubscription();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState("100");
  
  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  
  // Calculate min date based on plan (admin gets unlimited)
  const getMinDate = () => {
    if (isAdmin) return format(subDays(new Date(), 365), "yyyy-MM-dd"); // Admin: 1 year back
    const maxDaysBack = limits.missedEntryDays || 7;
    return format(subDays(new Date(), maxDaysBack), "yyyy-MM-dd");
  };
  
  const minDate = getMinDate();
  const maxDate = format(new Date(), "yyyy-MM-dd");
  
  const [formData, setFormData] = useState({
    vehicle_id: "",
    entry_date: format(new Date(), "yyyy-MM-dd"),
    kilometers: "",
    notes: "",
  });

  const [autoCalculated, setAutoCalculated] = useState({
    fuel_filled: 0,
    fuel_cost: 0,
    trip_earnings: 0,
    total_expenses: 0,
    net_profit: 0,
  });

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  // Auto-calculate based on kilometers and vehicle
  useEffect(() => {
    if (selectedVehicle && formData.kilometers) {
      const km = parseFloat(formData.kilometers);
      if (km > 0) {
        // Calculate fuel filled based on mileage
        const fuelFilled = km / selectedVehicle.mileage_kmpl;
        
        // Calculate fuel cost
        const fuelPrice = parseFloat(fuelPricePerLiter) || 0;
        const fuelCost = fuelFilled * fuelPrice;
        
        // Calculate trip earnings based on earning type
        let tripEarnings = 0;
        if (selectedVehicle.earning_type === "per_km") {
          tripEarnings = km * selectedVehicle.default_earning_value;
        } else if (selectedVehicle.earning_type === "per_trip") {
          tripEarnings = selectedVehicle.default_earning_value;
        } else if (selectedVehicle.earning_type === "custom") {
          tripEarnings = selectedVehicle.default_earning_value;
        }
        
        // Calculate per-day costs from monthly costs
        const perDayEMI = (selectedVehicle.monthly_emi || 0) / 30;
        const perDayDriverSalary = (selectedVehicle.driver_monthly_salary || 0) / 30;
        const perDayMaintenance = (selectedVehicle.expected_monthly_maintenance || 0) / 30;
        
        const totalExpenses = fuelCost + perDayEMI + perDayDriverSalary + perDayMaintenance;
        const netProfit = tripEarnings - totalExpenses;
        
        setAutoCalculated({
          fuel_filled: fuelFilled,
          fuel_cost: fuelCost,
          trip_earnings: tripEarnings,
          total_expenses: totalExpenses,
          net_profit: netProfit,
        });
      }
    } else {
      setAutoCalculated({
        fuel_filled: 0,
        fuel_cost: 0,
        trip_earnings: 0,
        total_expenses: 0,
        net_profit: 0,
      });
    }
  }, [formData.kilometers, selectedVehicle, fuelPricePerLiter]);

  const fetchVehicles = async () => {
    try {
      setInitialLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setSelectedVehicle(vehicle || null);
    setFormData({ ...formData, vehicle_id: vehicleId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vehicle_id) {
      toast({
        title: "Error",
        description: "Please select a vehicle",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const entryData = {
        user_id: user?.id,
        vehicle_id: formData.vehicle_id,
        entry_date: formData.entry_date,
        kilometers: parseFloat(formData.kilometers),
        fuel_filled: autoCalculated.fuel_filled,
        fuel_cost: autoCalculated.fuel_cost,
        trip_earnings: autoCalculated.trip_earnings,
        toll_expense: 0,
        repair_expense: 0,
        food_expense: 0,
        misc_expense: 0,
        total_expenses: autoCalculated.total_expenses,
        net_profit: autoCalculated.net_profit,
        notes: formData.notes,
      };

      const { error } = await supabase.from("daily_entries").insert([entryData]);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Trip saved! ${autoCalculated.net_profit >= 0 ? "Profit" : "Loss"}: ₹${Math.abs(autoCalculated.net_profit).toFixed(2)}`,
      });

      // Redirect to Dashboard
      navigate("/");
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
    return <DailyEntrySkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Daily Entry</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle & Date Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_id">Select Vehicle *</Label>
              <Select
                value={formData.vehicle_id}
                onValueChange={handleVehicleChange}
                required
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_name} ({vehicle.vehicle_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVehicle && (
                <p className="text-xs text-muted-foreground mt-1">
                  Mileage: {selectedVehicle.mileage_kmpl} km/L | Earning: {selectedVehicle.earning_type}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_date">Date *</Label>
              <Input
                id="entry_date"
                type="date"
                value={formData.entry_date}
                min={minDate}
                max={maxDate}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  // Validate date is within allowed range
                  if (isBefore(parseISO(selectedDate), parseISO(minDate))) {
                    toast({
                      title: "Date Restricted",
                      description: `Your ${plan} plan allows entries up to ${limits.missedEntryDays} days back. Upgrade for more.`,
                      variant: "destructive",
                    });
                    return;
                  }
                  setFormData({ ...formData, entry_date: selectedDate });
                }}
                required
                className="h-12"
              />
              {!isAdmin && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {plan === 'basic' ? 'Basic' : plan === 'standard' ? 'Standard' : plan === 'ultra' ? 'Ultra' : 'Trial'} plan: Can add entries up to {limits.missedEntryDays} days back
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="kilometers">Kilometers *</Label>
              <Input
                id="kilometers"
                type="number"
                step="0.01"
                value={formData.kilometers}
                onChange={(e) => setFormData({ ...formData, kilometers: e.target.value })}
                required
                placeholder="e.g., 120"
                className="h-12 text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground">
                Enter kilometers traveled - everything else auto-calculates
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_price">Fuel Price per Liter (₹)</Label>
              <Input
                id="fuel_price"
                type="number"
                step="0.01"
                value={fuelPricePerLiter}
                onChange={(e) => setFuelPricePerLiter(e.target.value)}
                placeholder="e.g., 100"
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Current market fuel price
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Calculation Summary */}
        <Card className={autoCalculated.net_profit >= 0 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-background rounded-lg">
              <span className="text-lg font-medium">Total Expenses:</span>
              <span className="text-2xl font-bold text-destructive">
                {formatCurrency(autoCalculated.total_expenses)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-background rounded-lg">
              <span className="text-lg font-medium">Net Profit/Loss:</span>
              <span
                className={`text-2xl font-bold ${
                  autoCalculated.net_profit >= 0 ? "text-success" : "text-destructive"
                }`}
              >
                {formatCurrency(autoCalculated.net_profit)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={loading}>
          {loading ? "Saving..." : "Save Trip Entry"}
        </Button>

      </form>
    </div>
  );
};

export default DailyEntry;
