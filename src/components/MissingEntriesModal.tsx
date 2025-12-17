import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, eachDayOfInterval, parseISO, isBefore, startOfDay, isAfter } from "date-fns";
import { AlertTriangle, Calendar, Loader2, ArrowRight } from "lucide-react";
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

const MAX_FILLABLE_DAYS = 7;

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
  
  // Bulk mode state
  const [entryMode, setEntryMode] = useState<"daily" | "bulk">("daily");
  const [bulkForm, setBulkForm] = useState({
    vehicle_id: "",
    totalKilometers: "",
    fuelPricePerLiter: "100",
  });

  useEffect(() => {
    // Load entry mode preference
    const savedMode = localStorage.getItem("missing_entry_mode") as "daily" | "bulk" | null;
    if (savedMode) {
      setEntryMode(savedMode);
    }
    
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
        setLoading(false);
        onComplete();
        return;
      }
      
      setVehicles(vehiclesData);

      // Get user's profile creation date
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", user?.id)
        .single();

      if (profileError || !profile?.created_at) {
        setLoading(false);
        onComplete();
        return;
      }

      const accountCreatedDate = startOfDay(parseISO(profile.created_at));
      const today = startOfDay(new Date());
      const yesterday = subDays(today, 1);

      if (isBefore(yesterday, accountCreatedDate)) {
        setLoading(false);
        onComplete();
        return;
      }

      // Get all entry dates
      const { data: entries, error: entriesError } = await supabase
        .from("daily_entries")
        .select("entry_date")
        .eq("user_id", user?.id)
        .gte("entry_date", format(accountCreatedDate, "yyyy-MM-dd"))
        .lte("entry_date", format(yesterday, "yyyy-MM-dd"));

      if (entriesError) throw entriesError;

      const existingDates = new Set((entries || []).map(e => e.entry_date));

      // Find missing dates
      const allDates = eachDayOfInterval({ start: accountCreatedDate, end: yesterday });
      const allMissing = allDates
        .filter(date => !existingDates.has(format(date, "yyyy-MM-dd")))
        .map(date => format(date, "yyyy-MM-dd"));

      if (allMissing.length === 0) {
        setLoading(false);
        onComplete();
        return;
      }

      // Split into fillable and auto-zero
      const fillableCutoff = subDays(today, MAX_FILLABLE_DAYS);
      const fillableDates = allMissing.filter(date => 
        isAfter(parseISO(date), fillableCutoff) || format(fillableCutoff, "yyyy-MM-dd") === date
      );
      const autoZeroDates = allMissing.filter(date => 
        isBefore(parseISO(date), fillableCutoff)
      );

      // Auto-insert zero entries for older dates
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
          notes: "Auto-filled: No entry provided within time limit",
        }));

        const { error: insertError } = await supabase
          .from("daily_entries")
          .insert(zeroEntries);

        if (!insertError) {
          setAutoFilledCount(autoZeroDates.length);
        }
      }

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
      setBulkForm(prev => ({ ...prev, vehicle_id: vehiclesData[0]?.id || "" }));
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

  const calculateEntryData = (date: string, vehicleId: string, km: number, fuelPrice: number, vehicle: Vehicle) => {
    const fuelFilled = km / vehicle.mileage_kmpl;
    const fuelCost = fuelFilled * fuelPrice;

    let tripEarnings = 0;
    if (vehicle.earning_type === "per_km") {
      tripEarnings = km * vehicle.default_earning_value;
    } else if (vehicle.earning_type === "per_trip" || vehicle.earning_type === "custom") {
      tripEarnings = vehicle.default_earning_value;
    }

    const perDayEMI = (vehicle.monthly_emi || 0) / 30;
    const perDayDriverSalary = (vehicle.driver_monthly_salary || 0) / 30;
    const perDayMaintenance = (vehicle.expected_monthly_maintenance || 0) / 30;

    const totalExpenses = fuelCost + perDayEMI + perDayDriverSalary + perDayMaintenance;
    const netProfit = tripEarnings - totalExpenses;

    return {
      user_id: user?.id,
      vehicle_id: vehicleId,
      entry_date: date,
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
      notes: entryMode === "bulk" ? "Bulk entry - KM distributed across days" : "",
    };
  };

  const handleSaveDaily = async () => {
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
        const km = parseFloat(entry.kilometers) || 0;
        const fuelPrice = parseFloat(entry.fuelPricePerLiter) || 100;
        return calculateEntryData(entry.date, entry.vehicle_id, km, fuelPrice, vehicle);
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

  const handleSaveBulk = async () => {
    if (!bulkForm.vehicle_id) {
      toast({
        title: "Missing Vehicle",
        description: "Please select a vehicle",
        variant: "destructive",
      });
      return;
    }
    if (!bulkForm.totalKilometers || parseFloat(bulkForm.totalKilometers) <= 0) {
      toast({
        title: "Missing Kilometers",
        description: "Please enter total kilometers",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const totalKm = parseFloat(bulkForm.totalKilometers);
      const kmPerDay = totalKm / missingDates.length;
      const fuelPrice = parseFloat(bulkForm.fuelPricePerLiter) || 100;
      const vehicle = vehicles.find(v => v.id === bulkForm.vehicle_id)!;

      const entriesToInsert = missingDates.map(date => 
        calculateEntryData(date, bulkForm.vehicle_id, kmPerDay, fuelPrice, vehicle)
      );

      const { error } = await supabase.from("daily_entries").insert(entriesToInsert);
      if (error) throw error;

      toast({
        title: "Success!",
        description: `Saved ${entriesToInsert.length} entries (${kmPerDay.toFixed(1)} km/day)`,
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

  const handleSkip = () => {
    setIsOpen(false);
    onComplete();
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

  if (!isOpen) return null;

  const dateRange = missingDates.length > 0 
    ? `${format(parseISO(missingDates[0]), "dd MMM")} - ${format(parseISO(missingDates[missingDates.length - 1]), "dd MMM yyyy")}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] p-0"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-warning" />
            Missing Daily Entries
          </DialogTitle>
          <DialogDescription className="text-base space-y-2">
            <span className="block">
              You have {missingDates.length} missing {missingDates.length === 1 ? "entry" : "entries"} ({dateRange})
            </span>
            {autoFilledCount > 0 && (
              <span className="block text-muted-foreground text-sm">
                Note: {autoFilledCount} older entries were auto-filled with zero values.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Mode Toggle */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setEntryMode("daily")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                entryMode === "daily" 
                  ? "bg-background shadow text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Daily Entry
            </button>
            <button
              onClick={() => setEntryMode("bulk")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                entryMode === "bulk" 
                  ? "bg-background shadow text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bulk Entry
            </button>
          </div>
        </div>

        {entryMode === "daily" ? (
          // Daily Entry Mode
          <ScrollArea className="max-h-[50vh] px-6">
            <div className="space-y-4 py-4">
              {formEntries.map((entry, index) => (
                <div key={entry.date} className="p-4 border rounded-lg bg-card space-y-3">
                  <div className="flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4 text-primary" />
                    {format(parseISO(entry.date), "EEE, dd MMM yyyy")}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Vehicle</Label>
                      <Select
                        value={entry.vehicle_id}
                        onValueChange={(value) => updateEntry(index, "vehicle_id", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select" />
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
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Kilometers</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="KM"
                        value={entry.kilometers}
                        onChange={(e) => updateEntry(index, "kilometers", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Fuel ₹/L</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.fuelPricePerLiter}
                        onChange={(e) => updateEntry(index, "fuelPricePerLiter", e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          // Bulk Entry Mode
          <div className="px-6 py-4">
            <div className="p-4 border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{format(parseISO(missingDates[0]), "dd MMM")}</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium text-foreground">{format(parseISO(missingDates[missingDates.length - 1]), "dd MMM yyyy")}</span>
                <span className="text-xs bg-muted px-2 py-1 rounded">({missingDates.length} days)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Select
                    value={bulkForm.vehicle_id}
                    onValueChange={(value) => setBulkForm(prev => ({ ...prev, vehicle_id: value }))}
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
                  <Label>Total Kilometers</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 500"
                    value={bulkForm.totalKilometers}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, totalKilometers: e.target.value }))}
                  />
                  {bulkForm.totalKilometers && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {(parseFloat(bulkForm.totalKilometers) / missingDates.length).toFixed(1)} km/day
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label>Fuel Price (₹/L)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={bulkForm.fuelPricePerLiter}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, fuelPricePerLiter: e.target.value }))}
                  />
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                Total kilometers will be distributed equally across all {missingDates.length} missing days
              </p>
            </div>
          </div>
        )}

        <div className="p-6 pt-4 border-t bg-muted/30 flex gap-3">
          <Button 
            variant="outline"
            onClick={handleSkip}
            className="flex-1"
            disabled={saving}
          >
            Skip for Now
          </Button>
          <Button 
            onClick={entryMode === "daily" ? handleSaveDaily : handleSaveBulk}
            className="flex-1"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              `Save ${missingDates.length} Entries`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
