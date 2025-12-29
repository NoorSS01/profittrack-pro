import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PullToRefresh } from "@/components/PullToRefresh";
import { TripHistorySkeleton } from "@/components/skeletons/TripHistorySkeleton";
import * as XLSX from "xlsx";
import { subDays, format, differenceInDays, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Calendar, TrendingUp, TrendingDown, Filter, X, Download, FileSpreadsheet, FileText, Lock, Crown } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useCurrency } from "@/contexts/CurrencyContext";

interface DailyEntry {
  id: string;
  entry_date: string;
  vehicle_id: string;
  kilometers: number;
  fuel_filled: number;
  fuel_cost: number;
  trip_earnings: number;
  toll_expense: number;
  repair_expense: number;
  food_expense: number;
  misc_expense: number;
  total_expenses: number;
  net_profit: number;
  notes: string | null;
  vehicles: {
    vehicle_name: string;
  };
}

interface EditFormData {
  kilometers: number;
  fuel_filled: number;
  fuel_cost: number;
  trip_earnings: number;
  toll_expense: number;
  repair_expense: number;
  food_expense: number;
  misc_expense: number;
  notes: string;
}

export default function TripHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const { plan, limits } = useSubscription();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DailyEntry[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; vehicle_name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    kilometers: 0,
    fuel_filled: 0,
    fuel_cost: 0,
    trip_earnings: 0,
    toll_expense: 0,
    repair_expense: 0,
    food_expense: 0,
    misc_expense: 0,
    notes: "",
  });

  // Filter states
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [profitStatus, setProfitStatus] = useState<string>("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check if filters are available for this plan (Basic plan cannot use filters)
  const canUseFilters = plan === 'trial' || plan === 'standard' || plan === 'ultra';
  
  // Check if export is available (only Ultra can export)
  const canExport = plan === 'trial' || plan === 'ultra' || limits.reportsExport;

  // Calculate the minimum allowed date based on plan
  const getMinAllowedDate = () => {
    if (plan === 'trial') return null; // No restriction during trial
    const today = new Date();
    return subDays(today, limits.tripHistoryDays);
  };

  const minAllowedDate = getMinAllowedDate();
  const isDateRestricted = plan !== 'trial' && plan !== 'ultra' && limits.tripHistoryDays < 9999;

  useEffect(() => {
    if (user) {
      fetchEntries();
      fetchVehicles();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [entries, selectedVehicle, dateFrom, dateTo, profitStatus]);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, vehicle_name")
        .eq("user_id", user?.id)
        .order("vehicle_name");

      if (error) throw error;
      setVehicles(data || []);
    } catch (error: any) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const fetchEntries = async () => {
    try {
      setLoading(true);
      
      // Build query with date restriction based on plan
      let query = supabase
        .from("daily_entries")
        .select(`
          *,
          vehicles (
            vehicle_name
          )
        `)
        .eq("user_id", user?.id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });

      // Apply date restriction for non-trial, non-ultra plans
      if (minAllowedDate) {
        query = query.gte("entry_date", format(minAllowedDate, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
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

  const applyFilters = () => {
    let filtered = [...entries];

    // Filter by vehicle
    if (selectedVehicle !== "all") {
      filtered = filtered.filter((entry) => entry.vehicle_id === selectedVehicle);
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter((entry) => entry.entry_date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((entry) => entry.entry_date <= dateTo);
    }

    // Filter by profit/loss status
    if (profitStatus === "profit") {
      filtered = filtered.filter((entry) => entry.net_profit >= 0);
    } else if (profitStatus === "loss") {
      filtered = filtered.filter((entry) => entry.net_profit < 0);
    }

    setFilteredEntries(filtered);
  };

  const clearFilters = () => {
    setSelectedVehicle("all");
    setDateFrom("");
    setDateTo("");
    setProfitStatus("all");
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedVehicle, dateFrom, dateTo, profitStatus]);

  // Export to CSV
  const exportToCSV = () => {
    const headers = ["Date", "Vehicle", "Kilometers", "Fuel Filled", "Fuel Cost", "Earnings", "Toll", "Repair", "Food", "Misc", "Total Expenses", "Net Profit", "Notes"];
    const csvData = filteredEntries.map(entry => [
      format(new Date(entry.entry_date), "yyyy-MM-dd"),
      entry.vehicles.vehicle_name,
      entry.kilometers,
      entry.fuel_filled,
      entry.fuel_cost,
      entry.trip_earnings,
      entry.toll_expense || 0,
      entry.repair_expense || 0,
      entry.food_expense || 0,
      entry.misc_expense || 0,
      entry.total_expenses,
      entry.net_profit,
      entry.notes || ""
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trip-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredEntries.length} entries to CSV`,
    });
  };

  // Export to Excel (XLSX)
  const exportToXLSX = () => {
    const headers = ["Date", "Vehicle", "Kilometers", "Fuel Filled", "Fuel Cost", "Earnings", "Toll", "Repair", "Food", "Misc", "Total Expenses", "Net Profit", "Notes"];
    const data = filteredEntries.map(entry => ({
      "Date": format(new Date(entry.entry_date), "yyyy-MM-dd"),
      "Vehicle": entry.vehicles.vehicle_name,
      "Kilometers": entry.kilometers,
      "Fuel Filled": entry.fuel_filled,
      "Fuel Cost": entry.fuel_cost,
      "Earnings": entry.trip_earnings,
      "Toll": entry.toll_expense || 0,
      "Repair": entry.repair_expense || 0,
      "Food": entry.food_expense || 0,
      "Misc": entry.misc_expense || 0,
      "Total Expenses": entry.total_expenses,
      "Net Profit": entry.net_profit,
      "Notes": entry.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Trip History");
    
    // Auto-size columns
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 12) }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `trip-history-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredEntries.length} entries to Excel`,
    });
  };

  const handleEdit = (entry: DailyEntry) => {
    setSelectedEntry(entry);
    setEditFormData({
      kilometers: entry.kilometers,
      fuel_filled: entry.fuel_filled,
      fuel_cost: entry.fuel_cost,
      trip_earnings: entry.trip_earnings,
      toll_expense: entry.toll_expense || 0,
      repair_expense: entry.repair_expense || 0,
      food_expense: entry.food_expense || 0,
      misc_expense: entry.misc_expense || 0,
      notes: entry.notes || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry) return;

    try {
      const totalExpenses =
        editFormData.fuel_cost +
        editFormData.toll_expense +
        editFormData.repair_expense +
        editFormData.food_expense +
        editFormData.misc_expense;

      const netProfit = editFormData.trip_earnings - totalExpenses;

      const { error } = await supabase
        .from("daily_entries")
        .update({
          kilometers: editFormData.kilometers,
          fuel_filled: editFormData.fuel_filled,
          fuel_cost: editFormData.fuel_cost,
          trip_earnings: editFormData.trip_earnings,
          toll_expense: editFormData.toll_expense,
          repair_expense: editFormData.repair_expense,
          food_expense: editFormData.food_expense,
          misc_expense: editFormData.misc_expense,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          notes: editFormData.notes,
        })
        .eq("id", selectedEntry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry updated successfully",
      });

      setEditDialogOpen(false);
      fetchEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = (entry: DailyEntry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedEntry) return;

    try {
      const { error } = await supabase
        .from("daily_entries")
        .delete()
        .eq("id", selectedEntry.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });

      setDeleteDialogOpen(false);
      fetchEntries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    await fetchEntries();
    await fetchVehicles();
  };

  if (loading) {
    return <TripHistorySkeleton />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-8rem)] lg:min-h-0">
      <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <Calendar className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Trip History</h1>
          <p className="text-muted-foreground">View and manage all your daily entries</p>
        </div>
      </div>

      {/* Filters Section - Hidden for Basic plan */}
      {canUseFilters ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {isDateRestricted && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Last {limits.tripHistoryDays} days
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isDateRestricted && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    Your {plan} plan shows last {limits.tripHistoryDays} days of history
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate('/pricing')} className="gap-1">
                  <Crown className="h-3 w-3" />
                  Upgrade
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-filter">Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger id="vehicle-filter">
                    <SelectValue placeholder="All Vehicles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicle_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-from">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date-to">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profit-filter">Status</Label>
                <Select value={profitStatus} onValueChange={setProfitStatus}>
                  <SelectTrigger id="profit-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="profit">Profit Only</SelectItem>
                    <SelectItem value="loss">Loss Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Basic plan - Show locked filters card */
        <Card className="border-dashed">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Filters Locked</p>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Standard or Ultra to filter your trip history
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate('/pricing')} className="gap-1">
                <Crown className="h-3 w-3" />
                Upgrade
              </Button>
            </div>
            {isDateRestricted && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm text-amber-700 dark:text-amber-400">
                    Your {plan} plan shows last {limits.tripHistoryDays} days of history
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">No entries found. Start by adding a daily entry.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {filteredEntries.length === entries.length
                ? `All Entries (${entries.length})`
                : `Filtered Entries (${filteredEntries.length} of ${entries.length})`}
            </CardTitle>
            {canExport ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={filteredEntries.length === 0}
                    title="Export"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToXLSX} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/pricing')}
                title="Export (Ultra only)"
                className="relative"
              >
                <Download className="h-4 w-4 opacity-50" />
                <Lock className="h-3 w-3 absolute -top-1 -right-1 text-muted-foreground" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">KM</TableHead>
                    <TableHead className="text-right">Earnings</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                    <TableHead className="text-right">Profit/Loss</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(new Date(entry.entry_date), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>{entry.vehicles.vehicle_name}</TableCell>
                      <TableCell className="text-right">{entry.kilometers}</TableCell>
                      <TableCell className="text-right text-primary font-semibold">
                        {formatCurrency(entry.trip_earnings)}
                      </TableCell>
                      <TableCell className="text-right text-accent">
                        {formatCurrency(entry.total_expenses)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-bold flex items-center justify-end gap-1 ${
                            entry.net_profit >= 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {entry.net_profit >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatCurrency(Math.abs(entry.net_profit))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(entry)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredEntries.length)} of {filteredEntries.length}
                </p>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setCurrentPage(pageNum)}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
            <DialogDescription>
              {selectedEntry && (
                <>
                  {selectedEntry.vehicles.vehicle_name} -{" "}
                  {format(new Date(selectedEntry.entry_date), "dd MMM yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="kilometers">Kilometers</Label>
                <Input
                  id="kilometers"
                  type="number"
                  value={editFormData.kilometers}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, kilometers: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fuel_filled">Fuel Filled (L)</Label>
                <Input
                  id="fuel_filled"
                  type="number"
                  step="0.01"
                  value={editFormData.fuel_filled}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, fuel_filled: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trip_earnings">Trip Earnings</Label>
                <Input
                  id="trip_earnings"
                  type="number"
                  value={editFormData.trip_earnings}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, trip_earnings: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="fuel_cost">Fuel Cost</Label>
                <Input
                  id="fuel_cost"
                  type="number"
                  value={editFormData.fuel_cost}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, fuel_cost: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="toll_expense">Toll Expense</Label>
                <Input
                  id="toll_expense"
                  type="number"
                  value={editFormData.toll_expense}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, toll_expense: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="repair_expense">Repair Expense</Label>
                <Input
                  id="repair_expense"
                  type="number"
                  value={editFormData.repair_expense}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, repair_expense: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="food_expense">Food Expense</Label>
                <Input
                  id="food_expense"
                  type="number"
                  value={editFormData.food_expense}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, food_expense: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label htmlFor="misc_expense">Misc Expense</Label>
                <Input
                  id="misc_expense"
                  type="number"
                  value={editFormData.misc_expense}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, misc_expense: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Expenses</p>
                  <p className="text-xl font-bold text-accent">
                    {formatCurrency(
                      editFormData.fuel_cost +
                      editFormData.toll_expense +
                      editFormData.repair_expense +
                      editFormData.food_expense +
                      editFormData.misc_expense
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Net Profit/Loss</p>
                  <p
                    className={`text-xl font-bold ${
                      editFormData.trip_earnings -
                        (editFormData.fuel_cost +
                          editFormData.toll_expense +
                          editFormData.repair_expense +
                          editFormData.food_expense +
                          editFormData.misc_expense) >=
                      0
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {formatCurrency(
                      editFormData.trip_earnings -
                      (editFormData.fuel_cost +
                        editFormData.toll_expense +
                        editFormData.repair_expense +
                        editFormData.food_expense +
                        editFormData.misc_expense)
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this entry. This action cannot be undone.
              {selectedEntry && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="font-medium">
                    {selectedEntry.vehicles.vehicle_name} -{" "}
                    {format(new Date(selectedEntry.entry_date), "dd MMM yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedEntry.kilometers} km • {formatCurrency(selectedEntry.trip_earnings)} earnings
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </PullToRefresh>
  );
}
