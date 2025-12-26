import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Truck, Plus, Edit, Trash2, User, DollarSign, Gauge, Lock, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { VehiclesSkeleton } from "@/components/skeletons/VehiclesSkeleton";

interface Vehicle {
  id: string;
  vehicle_name: string;
  vehicle_type: string;
  mileage_kmpl: number;
  earning_type: string;
  default_earning_value: number;
  driver_name: string;
  driver_monthly_salary: number;
  monthly_emi: number;
  expected_monthly_maintenance: number;
  notes: string;
  is_active: boolean;
}

const Vehicles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { plan, limits } = useSubscription();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Check if user can add more vehicles
  const canAddVehicle = plan === 'trial' || vehicles.filter(v => v.is_active).length < limits.maxVehicles;
  const vehicleCount = vehicles.filter(v => v.is_active).length;

  const [formData, setFormData] = useState({
    vehicle_name: "",
    vehicle_type: "",
    mileage_kmpl: "",
    earning_type: "per_km",
    default_earning_value: "",
    driver_name: "",
    driver_monthly_salary: "",
    monthly_emi: "",
    expected_monthly_maintenance: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchVehicles();
    }
  }, [user]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const vehicleData = {
        user_id: user?.id,
        vehicle_name: formData.vehicle_name,
        vehicle_type: formData.vehicle_type,
        mileage_kmpl: parseFloat(formData.mileage_kmpl),
        earning_type: formData.earning_type,
        default_earning_value: parseFloat(formData.default_earning_value),
        driver_name: formData.driver_name,
        driver_monthly_salary: parseFloat(formData.driver_monthly_salary) || 0,
        monthly_emi: parseFloat(formData.monthly_emi) || 0,
        expected_monthly_maintenance: parseFloat(formData.expected_monthly_maintenance) || 0,
        notes: formData.notes,
      };

      if (editingVehicle) {
        const { error } = await supabase
          .from("vehicles")
          .update(vehicleData)
          .eq("id", editingVehicle.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vehicle updated successfully!",
        });
      } else {
        const { error } = await supabase.from("vehicles").insert([vehicleData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vehicle added successfully!",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_name: vehicle.vehicle_name,
      vehicle_type: vehicle.vehicle_type,
      mileage_kmpl: vehicle.mileage_kmpl.toString(),
      earning_type: vehicle.earning_type,
      default_earning_value: vehicle.default_earning_value.toString(),
      driver_name: vehicle.driver_name || "",
      driver_monthly_salary: vehicle.driver_monthly_salary?.toString() || "",
      monthly_emi: vehicle.monthly_emi?.toString() || "",
      expected_monthly_maintenance: vehicle.expected_monthly_maintenance?.toString() || "",
      notes: vehicle.notes || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      const { error } = await supabase.from("vehicles").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Vehicle deleted successfully!",
      });
      fetchVehicles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setFormData({
      vehicle_name: "",
      vehicle_type: "",
      mileage_kmpl: "",
      earning_type: "per_km",
      default_earning_value: "",
      driver_name: "",
      driver_monthly_salary: "",
      monthly_emi: "",
      expected_monthly_maintenance: "",
      notes: "",
    });
  };

  const handleAddVehicleClick = () => {
    if (!canAddVehicle) {
      toast({
        title: "Vehicle Limit Reached",
        description: `Your ${plan} plan allows ${limits.maxVehicles} vehicle(s). Upgrade to add more.`,
        variant: "destructive",
      });
      navigate('/pricing');
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  if (loading) {
    return <VehiclesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground mt-1">
            Manage your transport fleet
            {plan !== 'trial' && plan !== 'ultra' && (
              <span className="ml-2 text-sm">
                ({vehicleCount}/{limits.maxVehicles} vehicles)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canAddVehicle && (
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3 w-3" />
              Limit Reached
            </Badge>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                onClick={handleAddVehicleClick}
                variant={canAddVehicle ? "default" : "outline"}
                className={!canAddVehicle ? "opacity-60" : ""}
              >
                {canAddVehicle ? (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Add Vehicle
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5 mr-2" />
                    Upgrade to Add
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_name">Vehicle Name *</Label>
                  <Input
                    id="vehicle_name"
                    value={formData.vehicle_name}
                    onChange={(e) => setFormData({ ...formData, vehicle_name: e.target.value })}
                    required
                    placeholder="e.g., Truck 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                  <Input
                    id="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    required
                    placeholder="e.g., Lorry, Tempo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mileage_kmpl">Mileage (km/l) *</Label>
                  <Input
                    id="mileage_kmpl"
                    type="number"
                    step="0.01"
                    value={formData.mileage_kmpl}
                    onChange={(e) => setFormData({ ...formData, mileage_kmpl: e.target.value })}
                    required
                    placeholder="e.g., 8.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="earning_type">Earning Type *</Label>
                  <Select
                    value={formData.earning_type}
                    onValueChange={(value) => setFormData({ ...formData, earning_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_km">Per Kilometer</SelectItem>
                      <SelectItem value="per_trip">Per Trip (Fixed)</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="default_earning_value">Default Earning Value (₹) *</Label>
                  <Input
                    id="default_earning_value"
                    type="number"
                    step="0.01"
                    value={formData.default_earning_value}
                    onChange={(e) => setFormData({ ...formData, default_earning_value: e.target.value })}
                    required
                    placeholder="e.g., 15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver_name">Driver Name</Label>
                  <Input
                    id="driver_name"
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                    placeholder="Driver's name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driver_monthly_salary">Driver Monthly Salary (₹)</Label>
                  <Input
                    id="driver_monthly_salary"
                    type="number"
                    step="0.01"
                    value={formData.driver_monthly_salary}
                    onChange={(e) => setFormData({ ...formData, driver_monthly_salary: e.target.value })}
                    placeholder="e.g., 25000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_emi">Monthly EMI (₹)</Label>
                  <Input
                    id="monthly_emi"
                    type="number"
                    step="0.01"
                    value={formData.monthly_emi}
                    onChange={(e) => setFormData({ ...formData, monthly_emi: e.target.value })}
                    placeholder="e.g., 15000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_monthly_maintenance">Expected Monthly Maintenance (₹)</Label>
                  <Input
                    id="expected_monthly_maintenance"
                    type="number"
                    step="0.01"
                    value={formData.expected_monthly_maintenance}
                    onChange={(e) => setFormData({ ...formData, expected_monthly_maintenance: e.target.value })}
                    placeholder="e.g., 5000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                {editingVehicle ? "Update Vehicle" : "Add Vehicle"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No vehicles yet</h3>
            <p className="text-muted-foreground mb-4">Add your first vehicle to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{vehicle.vehicle_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{vehicle.vehicle_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Mileage:</span>
                  <span className="font-semibold">{vehicle.mileage_kmpl} km/l</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {vehicle.earning_type === "per_km"
                      ? "Per KM:"
                      : vehicle.earning_type === "per_trip"
                      ? "Per Trip:"
                      : "Earning:"}
                  </span>
                  <span className="font-semibold">{formatCurrency(vehicle.default_earning_value)}</span>
                </div>
                {vehicle.driver_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-semibold">{vehicle.driver_name}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vehicles;
