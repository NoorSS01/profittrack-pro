import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, eachDayOfInterval, parseISO, isBefore, startOfDay, isAfter } from "date-fns";
import { AlertTriangle, Calendar, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface MissingEntryForm {
  date: string;
  vehicle_id: string;
  kilometers: string;
  fuelPricePerLiter: string;
}

interface MissingEntriesModalProps {
  onComplete: () => void;
}

const MAX_FILLABLE_DAYS = 4;

export const MissingEntriesModal = ({ onComplete }: MissingEntriesModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [missingDates, setMissingDates] = useState<string[]>([]);
  const [formEntries, setFormEntries] = useState<MissingEntryForm[]>([]);
  const [autoFilledCount, setAutoFilledCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkMissingEntries();
    }
  }, [user]);

  const checkMissingEntries = async () => {
    setLoading(true);
    try {
      // Fetch user's vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (vehiclesError) throw vehiclesError;
      
      if (!vehiclesData || vehiclesData.length === 0) {
        // No vehicles, no need to show modal
        setLoading(false);
        onComplete();
        return;
      }
      
      setVehicles(vehiclesData);

      // Get user's profile creation date (account creation reference)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", user?.id)
        .single();

      if (profileError || !profile?.created_at) {
        // No profile found, skip missing entries check
        setLoading(false);
        onComplete();
        return;
      }

      const accountCreatedDate = startOfDay(parseISO(profile.created_at));
      const today = startOfDay(new Date());
      const yesterday = subDays(today, 1);

      // Don't check if account was created today
      if (isBefore(yesterday, accountCreatedDate)) {
        setLoading(false);
        onComplete();
        return;
      }

      // Get all entry dates from account creation to yesterday
      const { data: entries, error: entriesError } = await supabase
        .from("daily_entries")
        .select("entry_date")
        .eq("user_id", user?.id)
        .gte("entry_date", format(accountCreatedDate, "yyyy-MM-dd"))
        .lte("entry_date", format(yesterday, "yyyy-MM-dd"));

      if (entriesError) throw entriesError;

      const existingDates = new Set((entries || []).map(e => e.entry_date));

      // Find missing dates (from account creation to yesterday)
      const allDates = eachDayOfInterval({ start: accountCreatedDate, end: yesterday });
      const allMissing = allDates
        .filter(date => !existingDates.has(format(date, "yyyy-MM-dd")))
        .map(date => format(date, "yyyy-MM-dd"));

      if (allMissing.length === 0) {
        setLoading(false);
        onComplete();
        return;
      }

      // Split into fillable (last 4 days) and auto-zero (older)
      const fourDaysAgo = subDays(today, MAX_FILLABLE_DAYS);
      const fillableDates = allMissing.filter(date => 
        isAfter(parseISO(date), fourDaysAgo) || format(fourDaysAgo, "yyyy-MM-dd") === date
      );
      const autoZeroDates = allMissing.filter(date => 
        isBefore(parseISO(date), fourDaysAgo)
      );

      // Auto-insert zero entries for dates older than 4 days
      if (autoZeroDates.length > 0 && vehiclesData.length > 0) {
        const defaultVehicle = vehiclesData[0];
        const zeroEntries = autoZeroDates.map(date => ({
          user_id: user?.id,
          vehicle_id: defaultVehicle.id,
          entry_date: date,
          kilometers: 0,
          fuel_filled: 0,
          fuel_cost: 0,
          trip_earnings: 0,
          toll_expense: 0,
          repair_expense: 0,
          food_expense: 0,
          misc_expense: 0,
          total_expenses: 0,
          net_profit: 0,
          notes: "Auto-filled: No entry provided within 4 days",
        }));

        const { error: insertError } = await supabase
          .from("daily_entries")
          .insert(zeroEntries);

        if (insertError) {
          console.error("Error auto-filling entries:", insertError);
        } else {
          setAutoFilledCount(autoZeroDates.length);
        }
      }

      // If no fillable dates remain, complete
      if (fillableDates.length === 0) {
        if (autoZeroDates.length > 0) {
          toast({
            title: "Entries Auto-Filled",
            description: `${autoZeroDates.length} older entries were automatically filled with zero values.`,
          });
        }
        setLoading(false);
        onComplete();
        return;
      }

      setMissingDates(fillableDates);
      setFormEntries(
        fillableDates.map(date => ({
          date,
          vehicle_id: vehiclesData[0]?.id || "",
          kilometers: "",
          fuelPricePerLiter: "100",
        }))
      );
      setIsOpen(true);
    } catch (error: any) {
      toast({
        title: "Error checking entries",
        description: error.message,
        variant: "destructive",
      });
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const updateEntry = (index: number, field: keyof MissingEntryForm, value: string) => {
    setFormEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const calculateEntryData = (entry: MissingEntryForm, vehicle: Vehicle) => {
    const km = parseFloat(entry.kilometers) || 0;
    const fuelPrice = parseFloat(entry.fuelPricePerLiter) || 100;

    // Calculate fuel filled based on mileage
    const fuelFilled = km / vehicle.mileage_kmpl;
    const fuelCost = fuelFilled * fuelPrice;

    // Calculate trip earnings
    let tripEarnings = 0;
    if (vehicle.earning_type === "per_km") {
      tripEarnings = km * vehicle.default_earning_value;
    } else if (vehicle.earning_type === "per_trip" || vehicle.earning_type === "custom") {
      tripEarnings = vehicle.default_earning_value;
    }

    // Calculate per-day costs
    const perDayEMI = (vehicle.monthly_emi || 0) / 30;
    const perDayDriverSalary = (vehicle.driver_monthly_salary || 0) / 30;
    const perDayMaintenance = (vehicle.expected_monthly_maintenance || 0) / 30;

    const totalExpenses = fuelCost + perDayEMI + perDayDriverSalary + perDayMaintenance;
    const netProfit = tripEarnings - totalExpenses;

    return {
      user_id: user?.id,
      vehicle_id: entry.vehicle_id,
      entry_date: entry.date,
      kilometers: km,
      fuel_filled: fuelFilled,
      fuel_cost: fuelCost,
      trip_earnings: tripEarnings,
      toll_expense: 0,
      repair_expense: 0,
      food_expense: 0,
      misc_expense: 0,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      notes: "",
    };
  };

  const handleSaveAll = async () => {
    // Validate all entries
    for (let i = 0; i < formEntries.length; i++) {
      const entry = formEntries[i];
      if (!entry.vehicle_id) {
        toast({
          title: "Missing Vehicle",
          description: `Please select a vehicle for ${format(parseISO(entry.date), "dd MMM yyyy")}`,
          variant: "destructive",
        });
        return;
      }
      if (!entry.kilometers || parseFloat(entry.kilometers) <= 0) {
        toast({
          title: "Missing Kilometers",
          description: `Please enter kilometers for ${format(parseISO(entry.date), "dd MMM yyyy")}`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const entriesToInsert = formEntries.map(entry => {
        const vehicle = vehicles.find(v => v.id === entry.vehicle_id)!;
        return calculateEntryData(entry, vehicle);
      });

      const { error } = await supabase.from("daily_entries").insert(entriesToInsert);

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Saved ${entriesToInsert.length} missing entries`,
      });

      setIsOpen(false);
      onComplete();
    } catch (error: any) {
      toast({
        title: "Error saving entries",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking for missing entries...</p>
        </div>
      </div>
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Missing Daily Entries
          </DialogTitle>
          <DialogDescription className="text-base space-y-2">
            <span className="block">
              You have {missingDates.length} missing {missingDates.length === 1 ? "entry" : "entries"} from the last 4 days.
              Please fill in the details to continue.
            </span>
            {autoFilledCount > 0 && (
              <span className="block text-muted-foreground text-sm">
                Note: {autoFilledCount} older {autoFilledCount === 1 ? "entry was" : "entries were"} automatically filled with zero values.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-6 py-4">
            {formEntries.map((entry, index) => (
              <div key={entry.date} className="p-4 border rounded-lg bg-card space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="h-5 w-5 text-primary" />
                  {format(parseISO(entry.date), "EEEE, dd MMMM yyyy")}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Vehicle *</Label>
                    <Select
                      value={entry.vehicle_id}
                      onValueChange={(value) => updateEntry(index, "vehicle_id", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id}>
                            {vehicle.vehicle_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Kilometers *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 120"
                      value={entry.kilometers}
                      onChange={(e) => updateEntry(index, "kilometers", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fuel Price (₹/L)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="100"
                      value={entry.fuelPricePerLiter}
                      onChange={(e) => updateEntry(index, "fuelPricePerLiter", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t bg-muted/30">
          <Button 
            onClick={handleSaveAll} 
            className="w-full h-12 text-lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Saving Entries...
              </>
            ) : (
              `Save ${formEntries.length} ${formEntries.length === 1 ? "Entry" : "Entries"}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
