import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Calendar, TrendingUp, Truck, DollarSign, Lock, Crown } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { useCurrency } from "@/contexts/CurrencyContext";
import { ReportsSkeleton } from "@/components/skeletons/ReportsSkeleton";

interface ReportData {
  totalEarnings: number;
  totalExpenses: number;
  netProfit: number;
  totalKm: number;
  avgDailyProfit: number;
}

interface ExpenseBreakdown {
  name: string;
  value: number;
}

const Reports = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { plan, limits } = useSubscription();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [reportData, setReportData] = useState<ReportData>({
    totalEarnings: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalKm: 0,
    avgDailyProfit: 0,
  });
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown[]>([]);
  const [vehicleComparison, setVehicleComparison] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if period is locked based on plan
  // Basic: only week (7 days)
  // Standard: week and month
  // Ultra: all periods including year
  const isPeriodLocked = (p: "week" | "month" | "year"): boolean => {
    if (plan === 'trial') return false;
    if (plan === 'ultra') return false;
    if (plan === 'expired') return p !== 'week';
    
    // Basic: only week allowed
    if (plan === 'basic') return p !== 'week';
    
    // Standard: week and month allowed (not year)
    if (plan === 'standard') return p === 'year';
    
    return false;
  };

  const handlePeriodChange = (value: "week" | "month" | "year") => {
    if (isPeriodLocked(value)) {
      navigate('/pricing');
      return;
    }
    setPeriod(value);
  };

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user, period]);

  // Real-time subscription for automatic updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('reports-daily-entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchReportData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getDateRange = () => {
    const today = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = subDays(today, 7);
        break;
      case "month":
        startDate = startOfMonth(today);
        break;
      case "year":
        startDate = startOfYear(today);
        break;
      default:
        startDate = startOfMonth(today);
    }

    return {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(today, "yyyy-MM-dd"),
    };
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      const { data: entries, error } = await supabase
        .from("daily_entries")
        .select("*, vehicles(vehicle_name, monthly_emi, driver_monthly_salary, expected_monthly_maintenance)")
        .eq("user_id", user?.id)
        .gte("entry_date", start)
        .lte("entry_date", end)
        .order("entry_date", { ascending: true });

      if (error) throw error;

      if (entries && entries.length > 0) {
        // Calculate overall stats
        const stats = entries.reduce(
          (acc, entry) => ({
            totalEarnings: acc.totalEarnings + Number(entry.trip_earnings),
            totalExpenses: acc.totalExpenses + Number(entry.total_expenses),
            netProfit: acc.netProfit + Number(entry.net_profit),
            totalKm: acc.totalKm + Number(entry.kilometers),
            count: acc.count + 1,
          }),
          { totalEarnings: 0, totalExpenses: 0, netProfit: 0, totalKm: 0, count: 0 }
        );

        setReportData({
          ...stats,
          avgDailyProfit: stats.netProfit / stats.count,
        });

        // Calculate expense breakdown with ALL categories including fixed costs
        const expenseData = entries.reduce(
          (acc, entry) => {
            const dailyEMI = Number(entry.vehicles?.monthly_emi || 0) / 30;
            const dailyDriverSalary = Number(entry.vehicles?.driver_monthly_salary || 0) / 30;
            const dailyMaintenance = Number(entry.vehicles?.expected_monthly_maintenance || 0) / 30;
            
            return {
              fuel: acc.fuel + Number(entry.fuel_cost),
              toll: acc.toll + Number(entry.toll_expense),
              repair: acc.repair + Number(entry.repair_expense),
              food: acc.food + Number(entry.food_expense),
              misc: acc.misc + Number(entry.misc_expense),
              emi: acc.emi + dailyEMI,
              driver: acc.driver + dailyDriverSalary,
              maintenance: acc.maintenance + dailyMaintenance,
            };
          },
          { fuel: 0, toll: 0, repair: 0, food: 0, misc: 0, emi: 0, driver: 0, maintenance: 0 }
        );

        const breakdown: ExpenseBreakdown[] = [
          { name: "Fuel", value: expenseData.fuel },
          { name: "EMI", value: expenseData.emi },
          { name: "Driver Salary", value: expenseData.driver },
          { name: "Maintenance", value: expenseData.maintenance },
          { name: "Toll", value: expenseData.toll },
          { name: "Repairs", value: expenseData.repair },
          { name: "Food", value: expenseData.food },
          { name: "Misc", value: expenseData.misc },
        ].filter((item) => item.value > 0);

        setExpenseBreakdown(breakdown);

        // Calculate vehicle-wise total profit/loss for bar chart
        const vehicleTotals: { [key: string]: number } = {};

        entries.forEach((entry: any) => {
          const vehicleName = entry.vehicles?.vehicle_name || "Unknown";
          
          if (!vehicleTotals[vehicleName]) {
            vehicleTotals[vehicleName] = 0;
          }
          vehicleTotals[vehicleName] += Number(entry.net_profit);
        });

        // Transform data for bar chart
        const chartData = Object.entries(vehicleTotals).map(([name, profit]) => ({
          name,
          profit: Number(profit.toFixed(2)),
        }));

        setVehicleComparison(chartData);
      } else {
        // Reset to zero if no data
        setReportData({
          totalEarnings: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalKm: 0,
          avgDailyProfit: 0,
        });
        setExpenseBreakdown([]);
        setVehicleComparison([]);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6B9D", "#C471ED", "#12A594"];
  
  // Get bar color based on profit/loss value with gradient intensity
  const getBarColor = (profit: number) => {
    if (profit === 0) return "hsl(var(--muted))";
    
    // Find max absolute value for scaling
    const maxAbsValue = Math.max(...vehicleComparison.map((v: any) => Math.abs(v.profit)), 1);
    const intensity = Math.min(Math.abs(profit) / maxAbsValue, 1);
    
    if (profit > 0) {
      // Green gradient: light green (small profit) to dark green (high profit)
      const lightness = 65 - (intensity * 30); // 65% to 35%
      return `hsl(142, 76%, ${lightness}%)`;
    } else {
      // Red gradient: light red (small loss) to dark red (large loss)
      const lightness = 65 - (intensity * 30); // 65% to 35%
      return `hsl(0, 84%, ${lightness}%)`;
    }
  };

  // Custom tooltip for bar chart
  const VehicleBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isProfit = data.profit >= 0;
      
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="font-medium text-foreground mb-1">{data.name}</p>
          <p className={`text-lg font-bold ${isProfit ? 'text-success' : 'text-destructive'}`}>
            {isProfit ? 'Profit: ' : 'Loss: '}
            {formatCurrency(Math.abs(data.profit))}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Analyze your business performance</p>
        </div>
        <Select value={period} onValueChange={(value: any) => handlePeriodChange(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month" disabled={isPeriodLocked('month')}>
              <span className="flex items-center gap-2">
                {isPeriodLocked('month') && <Lock className="h-3 w-3" />}
                This Month
              </span>
            </SelectItem>
            <SelectItem value="year" disabled={isPeriodLocked('year')}>
              <span className="flex items-center gap-2">
                {isPeriodLocked('year') && <Lock className="h-3 w-3" />}
                This Year
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(reportData.totalEarnings)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(reportData.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className={reportData.netProfit >= 0 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${reportData.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(reportData.netProfit)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Total Kilometers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {reportData.totalKm.toFixed(1)} km
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        {expenseBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Comparison - Bar Chart */}
        {vehicleComparison.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vehicle-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vehicleComparison} barCategoryGap="15%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    interval={0}
                    angle={vehicleComparison.length > 4 ? -45 : 0}
                    textAnchor={vehicleComparison.length > 4 ? "end" : "middle"}
                    height={vehicleComparison.length > 4 ? 80 : 40}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                    width={80}
                  />
                  <Tooltip content={<VehicleBarTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                  <Bar 
                    dataKey="profit" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  >
                    {vehicleComparison.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.profit)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {expenseBreakdown.length === 0 && vehicleComparison.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No data for this period</h3>
            <p className="text-muted-foreground">Add daily entries to see reports</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
