import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format, subDays, eachDayOfInterval, parseISO, isBefore, startOfDay, isAfter } from "date-fns";
import { AlertTriangle, Calendar, Loader2, ArrowRight, Plus, Trash2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

interface BulkVehicleEntry {
  vehicle_id: string;
  totalKilometers: string;
  fuelPricePerLiter: string;
}

interface MissingEntriesModalProps {
  onComplete: () => void;
}

// Admin emails - admins have no restrictions
const ADMIN_EMAILS = ["mohammednoorsirasgi@gmail.com"];

export const MissingEntriesModal = ({ onComplete }: MissingEntriesModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { limits, plan } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [missingDates, setMissingDates] = useState<string[]>([]);
  const [formEntries, setFormEntries] = useState<MissingEntryForm[]>([]);
  const [autoFilledCount, setAutoFilledCount] = useState(0);
  
  // Entry mode
  const [entryMode, setEntryMode] = useState<"daily" | "bulk">("daily");
  
  // Bulk mode - multiple vehicles support
  const [bulkEntries, setBulkEntries] = useState<BulkVehicleEntry[]>([]);

  // Check if user is admin
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  
  // Get max fillable days based on plan (admin gets unlimited)
  const getMaxFillableDays = () => {
    if (isAdmin) return 365; // Admin can fill up to 1 year back
    return limits.missedEntryDays || 7;
  };

  useEffect(() => {
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

      const { data: entries, error: entriesError } = await supabase
        .from("daily_entries")
        .select("entry_date")
        .eq("user_id", user?.id)
        .gte("entry_date", format(accountCreatedDate, "yyyy-MM-dd"))
        .lte("entry_date", format(yesterday, "yyyy-MM-dd"));

      if (entriesError) throw entriesError;

      const existingDates = new Set((entries || []).map(e => e.entry_date));

      const allDates = eachDayOfInterval({ start: accountCreatedDate, end: yesterday });
      const allMissing = allDates
        .filter(date => !existingDates.has(format(date, "yyyy-MM-dd")))
        .map(date => format(date, "yyyy-MM-dd"));

      if (allMissing.length === 0) {
        setLoading(false);
        onComplete();
        return;
      }

      const maxFillableDays = getMaxFillableDays();
      const fillableCutoff = subDays(today, maxFillableDays);
      const fillableDates = allMissing.filter(date => 
        isAfter(parseISO(date), fillableCutoff) || format(fillableCutoff, "yyyy-MM-dd") === date
      );
      const autoZeroDates = allMissing.filter(date => 
        isBefore(parseISO(date), fillableCutoff)
      );

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
      
      // Initialize bulk entries with first vehicle
      setBulkEntries([{
        vehicle_id: vehiclesData[0]?.id || "",
        totalKilometers: "",
        fuelPricePerLiter: "100",
      }]);
      
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

  const updateBulkEntry = (index: number, field: keyof BulkVehicleEntry, value: string) => {
    setBulkEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addBulkVehicle = () => {
    const usedVehicleIds = bulkEntries.map(e => e.vehicle_id);
    const availableVehicle = vehicles.find(v => !usedVehicleIds.includes(v.id));
    
    if (availableVehicle) {
      setBulkEntries(prev => [...prev, {
        vehicle_id: availableVehicle.id,
        totalKilometers: "",
        fuelPricePerLiter: "100",
      }]);
    }
  };

  const removeBulkVehicle = (index: number) => {
    if (bulkEntries.length > 1) {
      setBulkEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const calculateEntryData = (date: string, vehicleId: string, km: number, fuelPrice: number, vehicle: Vehicle, note: string = "") => {
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
      notes: note,
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
    // Validate all bulk entries
    for (let i = 0; i < bulkEntries.length; i++) {
      const entry = bulkEntries[i];
      if (!entry.vehicle_id) {
        toast({
          title: "Missing Vehicle",
          description: `Please select a vehicle for entry ${i + 1}`,
          variant: "destructive",
        });
        return;
      }
      if (!entry.totalKilometers || parseFloat(entry.totalKilometers) <= 0) {
        toast({
          title: "Missing Kilometers",
          description: `Please enter kilometers for ${vehicles.find(v => v.id === entry.vehicle_id)?.vehicle_name}`,
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const allEntriesToInsert: any[] = [];
      
      // For each vehicle, distribute KM across all missing dates
      for (const bulkEntry of bulkEntries) {
        const totalKm = parseFloat(bulkEntry.totalKilometers);
        const kmPerDay = totalKm / missingDates.length;
        const fuelPrice = parseFloat(bulkEntry.fuelPricePerLiter) || 100;
        const vehicle = vehicles.find(v => v.id === bulkEntry.vehicle_id)!;

        const vehicleEntries = missingDates.map(date => 
          calculateEntryData(
            date, 
            bulkEntry.vehicle_id, 
            kmPerDay, 
            fuelPrice, 
            vehicle,
            `Bulk entry - ${vehicle.vehicle_name}: ${kmPerDay.toFixed(1)} km/day`
          )
        );
        
        allEntriesToInsert.push(...vehicleEntries);
      }

      const { error } = await supabase.from("daily_entries").insert(allEntriesToInsert);
      if (error) throw error;

      const vehicleCount = bulkEntries.length;
      toast({
        title: "Success!",
        description: `Saved entries for ${vehicleCount} vehicle${vehicleCount > 1 ? 's' : ''} across ${missingDates.length} days`,
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

  const canAddMoreVehicles = bulkEntries.length < vehicles.length;

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
            {!isAdmin && (
              <span className="block text-xs">
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  {plan === 'basic' ? 'Basic' : plan === 'standard' ? 'Standard' : plan === 'ultra' ? 'Ultra' : 'Trial'}: Can add entries up to {limits.missedEntryDays} days back
                </Badge>
              </span>
            )}
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
          <ScrollArea className="max-h-[50vh] px-6">
            <div className="py-4 space-y-4">
              {/* Date Range Display */}
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <span className="font-medium text-foreground">{format(parseISO(missingDates[0]), "dd MMM")}</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium text-foreground">{format(parseISO(missingDates[missingDates.length - 1]), "dd MMM yyyy")}</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">({missingDates.length} days)</span>
              </div>

              {/* Vehicle Entries */}
              {bulkEntries.map((entry, index) => (
                <div key={index} className="p-4 border rounded-lg bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Vehicle {index + 1}</span>
                    {bulkEntries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBulkVehicle(index)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Vehicle</Label>
                      <Select
                        value={entry.vehicle_id}
                        onValueChange={(value) => updateBulkEntry(index, "vehicle_id", value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem 
                              key={vehicle.id} 
                              value={vehicle.id}
                              disabled={bulkEntries.some((e, i) => i !== index && e.vehicle_id === vehicle.id)}
                            >
                              {vehicle.vehicle_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Total Kilometers</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 500"
                        value={entry.totalKilometers}
                        onChange={(e) => updateBulkEntry(index, "totalKilometers", e.target.value)}
                        className="h-10"
                      />
                      {entry.totalKilometers && (
                        <p className="text-[10px] text-muted-foreground">
                          ≈ {(parseFloat(entry.totalKilometers) / missingDates.length).toFixed(1)} km/day
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Fuel Price (₹/L)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.fuelPricePerLiter}
                        onChange={(e) => updateBulkEntry(index, "fuelPricePerLiter", e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Vehicle Button */}
              {canAddMoreVehicles && (
                <Button
                  variant="outline"
                  onClick={addBulkVehicle}
                  className="w-full gap-2 border-dashed"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Vehicle
                </Button>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                Total kilometers for each vehicle will be distributed equally across all {missingDates.length} missing days
              </p>
            </div>
          </ScrollArea>
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
              `Save ${entryMode === "bulk" ? `${bulkEntries.length} Vehicle${bulkEntries.length > 1 ? 's' : ''}` : `${missingDates.length} Entries`}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
