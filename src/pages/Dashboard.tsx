import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, Gauge, Calendar, Truck, Lock, Crown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart } from "recharts";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { StatCard } from "@/components/dashboard/StatCard";
import { VehiclePerformanceCard } from "@/components/dashboard/VehiclePerformanceCard";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useHaptic } from "@/hooks/use-haptic";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { cn } from "@/lib/utils";

interface ChartDataPoint {
  date: string;
  profit: number;
  earnings: number;
  expenses: number;
}

interface VehiclePerformance {
  vehicleId: string;
  vehicleName: string;
  km: number;
  earnings: number;
  profit: number;
  fuelUsed: number;
}

type TimePeriod = '1day' | '7days' | '1month' | '6months';

const Dashboard = () => {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { trigger } = useHaptic();
  const { plan, limits } = useSubscription();
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1day');
  const [periodStats, setPeriodStats] = useState({
    profit: 0,
    expense: 0,
    earnings: 0,
    km: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [vehiclePerformance, setVehiclePerformance] = useState<VehiclePerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timePeriod]);

  // Real-time subscription for automatic updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('dashboard-daily-entries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_entries',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      
      let startDate: string;
      let endDate: string = today;
      
      // Calculate date range based on selected period
      if (timePeriod === '1day') {
        startDate = today;
      } else if (timePeriod === '7days') {
        startDate = format(subDays(new Date(), 6), "yyyy-MM-dd");
      } else if (timePeriod === '1month') {
        startDate = format(startOfMonth(new Date()), "yyyy-MM-dd");
        endDate = format(endOfMonth(new Date()), "yyyy-MM-dd");
      } else { // 6months
        startDate = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
      }

      // Fetch period data
      const { data: periodData } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("user_id", user?.id)
        .gte("entry_date", startDate)
        .lte("entry_date", endDate)
        .order("entry_date", { ascending: true });

      // Calculate period totals
      if (periodData && periodData.length > 0) {
        const totals = periodData.reduce(
          (acc, entry) => ({
            profit: acc.profit + Number(entry.net_profit),
            expense: acc.expense + Number(entry.total_expenses),
            earnings: acc.earnings + Number(entry.trip_earnings),
            km: acc.km + Number(entry.kilometers),
          }),
          { profit: 0, expense: 0, earnings: 0, km: 0 }
        );
        setPeriodStats(totals);

        // Prepare chart data based on period
        if (timePeriod === '1day') {
          // For single day, show hourly or single data point
          setChartData([{
            date: format(new Date(), "MMM dd"),
            profit: totals.profit,
            earnings: totals.earnings,
            expenses: totals.expense,
          }]);
        } else if (timePeriod === '7days') {
          const groupedData: { [key: string]: ChartDataPoint } = {};
          
          for (let i = 6; i >= 0; i--) {
            const date = format(subDays(new Date(), i), "yyyy-MM-dd");
            groupedData[date] = {
              date: format(subDays(new Date(), i), "MMM dd"),
              profit: 0,
              earnings: 0,
              expenses: 0,
            };
          }

          periodData.forEach((entry) => {
            const dateKey = entry.entry_date;
            if (groupedData[dateKey]) {
              groupedData[dateKey].profit += Number(entry.net_profit);
              groupedData[dateKey].earnings += Number(entry.trip_earnings);
              groupedData[dateKey].expenses += Number(entry.total_expenses);
            }
          });

          // Sort chart data chronologically
          const sortedData = Object.entries(groupedData)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([_, value]) => value);
          setChartData(sortedData);
        } else if (timePeriod === '1month') {
          // Group by day for 1 month view - only up to today, not future dates
          const dailyData: { [key: string]: ChartDataPoint } = {};
          
          // Initialize days from month start to today only (no future dates)
          const monthStart = startOfMonth(new Date());
          const todayDate = new Date();
          const currentDay = todayDate.getDate();
          
          for (let i = 0; i < currentDay; i++) {
            const date = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1), "yyyy-MM-dd");
            dailyData[date] = {
              date: format(new Date(monthStart.getFullYear(), monthStart.getMonth(), i + 1), "MMM dd"),
              profit: 0,
              earnings: 0,
              expenses: 0,
            };
          }

          periodData.forEach((entry) => {
            const dateKey = entry.entry_date;
            if (dailyData[dateKey]) {
              dailyData[dateKey].profit += Number(entry.net_profit);
              dailyData[dateKey].earnings += Number(entry.trip_earnings);
              dailyData[dateKey].expenses += Number(entry.total_expenses);
            }
          });

          // Sort chart data chronologically
          const sortedData = Object.entries(dailyData)
            .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
            .map(([_, value]) => value);
          setChartData(sortedData);
        } else { // 6months
          const monthlyData: { [key: string]: ChartDataPoint } = {};
          
          for (let i = 5; i >= 0; i--) {
            const monthDate = subMonths(new Date(), i);
            const monthKey = format(monthDate, "yyyy-MM");
            monthlyData[monthKey] = {
              date: format(monthDate, "MMM"),
              profit: 0,
              earnings: 0,
              expenses: 0,
            };
          }

          periodData.forEach((entry) => {
            const monthKey = format(new Date(entry.entry_date), "yyyy-MM");
            if (monthlyData[monthKey]) {
              monthlyData[monthKey].profit += Number(entry.net_profit);
              monthlyData[monthKey].earnings += Number(entry.trip_earnings);
              monthlyData[monthKey].expenses += Number(entry.total_expenses);
            }
          });

          // Sort chart data chronologically
          const sortedData = Object.entries(monthlyData)
            .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
            .map(([_, value]) => value);
          setChartData(sortedData);
        }
      } else {
        setPeriodStats({ profit: 0, expense: 0, earnings: 0, km: 0 });
        setChartData([]);
      }

      // Fetch today's vehicle performance
      const { data: todayData } = await supabase
        .from("daily_entries")
        .select("*")
        .eq("user_id", user?.id)
        .eq("entry_date", today);

      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (vehicles && vehicles.length > 0 && todayData) {
        const performance: VehiclePerformance[] = vehicles.map((vehicle) => {
          const vehicleEntries = todayData.filter(
            (entry) => entry.vehicle_id === vehicle.id
          );

          const totals = vehicleEntries.reduce(
            (acc, entry) => ({
              km: acc.km + Number(entry.kilometers),
              earnings: acc.earnings + Number(entry.trip_earnings),
              profit: acc.profit + Number(entry.net_profit),
              fuelUsed: acc.fuelUsed + Number(entry.fuel_filled),
            }),
            { km: 0, earnings: 0, profit: 0, fuelUsed: 0 }
          );

          return {
            vehicleId: vehicle.id,
            vehicleName: vehicle.vehicle_name,
            ...totals,
          };
        });

        setVehiclePerformance(performance.filter((v) => v.km > 0 || v.earnings > 0));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case '1day':
        return 'Today';
      case '7days':
        return 'Last 7 Days';
      case '1month':
        return 'This Month';
      case '6months':
        return 'Last 6 Months';
    }
  };

  const getHeaderLabel = () => {
    switch (timePeriod) {
      case '1day':
        return "Today's Performance";
      case '7days':
        return 'Last 7 Days Performance';
      case '1month':
        return 'This Month Performance';
      case '6months':
        return 'Last 6 Months Performance';
    }
  };

  const handleTimePeriodChange = (value: string) => {
    // Check if user can access this time period based on plan
    const monthsRequired = value === '6months' ? 6 : value === '1month' ? 1 : 0;
    
    if (monthsRequired > limits.dashboardMonths && plan !== 'trial') {
      // Show upgrade prompt
      trigger('error');
      navigate('/pricing');
      return;
    }
    
    trigger('selection');
    setTimePeriod(value as TimePeriod);
  };

  // Check if a time period is locked based on plan
  // Basic: 1 Day, 7 Days only (dashboardMonths = 0)
  // Standard: 1 Day, 7 Days, 1 Month (dashboardMonths = 1)
  // Ultra: All periods (dashboardMonths = 6)
  const isTimePeriodLocked = (period: TimePeriod): boolean => {
    if (plan === 'trial') return false;
    if (plan === 'ultra') return false;
    if (plan === 'expired') return period !== '1day';
    
    // Basic plan: only 1day and 7days allowed
    if (plan === 'basic') {
      return period === '1month' || period === '6months';
    }
    
    // Standard plan: 1day, 7days, 1month allowed (not 6months)
    if (plan === 'standard') {
      return period === '6months';
    }
    
    return false;
  };

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-[calc(100vh-8rem)] lg:min-h-0">
      <div className="space-y-4 md:space-y-6 pb-8 page-transition">
        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-lg text-muted-foreground">{getHeaderLabel()}</p>
        </div>

        {/* Time Period Selector */}
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <Tabs value={timePeriod} onValueChange={handleTimePeriodChange} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-4 h-11 touch-feedback">
            <TabsTrigger value="1day" className="text-sm font-medium">
              1 Day
            </TabsTrigger>
            <TabsTrigger value="7days" className="text-sm font-medium">
              7 Days
            </TabsTrigger>
            <TabsTrigger 
              value="1month" 
              className={cn("text-sm font-medium", isTimePeriodLocked('1month') && "opacity-60")}
            >
              {isTimePeriodLocked('1month') && <Lock className="h-3 w-3 mr-1" />}
              1 Month
            </TabsTrigger>
            <TabsTrigger 
              value="6months" 
              className={cn("text-sm font-medium", isTimePeriodLocked('6months') && "opacity-60")}
            >
              {isTimePeriodLocked('6months') && <Lock className="h-3 w-3 mr-1" />}
              6 Months
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Period Stats */}
      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title={periodStats.profit >= 0 ? "Profit" : "Loss"}
            value={formatCurrency(Math.abs(periodStats.profit))}
            icon={periodStats.profit >= 0 ? TrendingUp : TrendingDown}
            variant={periodStats.profit >= 0 ? "success" : "destructive"}
            delay={0}
          />
          <StatCard
            title="Earnings"
            value={formatCurrency(periodStats.earnings)}
            icon={DollarSign}
            variant="primary"
            delay={100}
          />
          <StatCard
            title="Expenses"
            value={formatCurrency(periodStats.expense)}
            icon={TrendingDown}
            variant="destructive"
            delay={200}
          />
          <StatCard
            title="Kilometers"
            value={`${periodStats.km.toFixed(1)} km`}
            icon={Gauge}
            variant="default"
            delay={300}
          />
        </div>
      </div>

      {/* Trend Chart - Hidden for 1 day view */}
      {timePeriod !== '1day' && (() => {
        // Calculate gradient stop position based on data range
        const profits = chartData.map(d => d.profit);
        const maxProfit = Math.max(...profits, 0);
        const minProfit = Math.min(...profits, 0);
        const range = maxProfit - minProfit;
        // Calculate where zero line falls in the gradient (0% = top, 100% = bottom)
        const zeroPosition = range > 0 ? (maxProfit / range) * 100 : 50;
        
        return (
          <Card className="animate-fade-in" style={{ animationDelay: "300ms" }}>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Calendar className="h-5 w-5" />
                {getPeriodLabel()} Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220} className="md:h-[300px]">
                <ComposedChart 
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="profitLineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset={`${zeroPosition}%`} stopColor="#22c55e" />
                      <stop offset={`${zeroPosition}%`} stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                    <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset={`${zeroPosition}%`} stopColor="#22c55e" stopOpacity={0.05} />
                      <stop offset={`${zeroPosition}%`} stopColor="#ef4444" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    width={50}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeWidth={1} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    labelStyle={{ 
                      color: 'hsl(var(--foreground))',
                      fontWeight: 600,
                      marginBottom: '8px'
                    }}
                    formatter={(value: number) => [
                      formatCurrency(Math.abs(value)),
                      value >= 0 ? 'Profit' : 'Loss'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    fill="url(#profitAreaGradient)"
                    stroke="none"
                    tooltipType="none"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="url(#profitLineGradient)"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (cx === undefined || cy === undefined) return null;
                      const isNegative = payload.profit < 0;
                      return (
                        <circle
                          key={`dot-${props.index}`}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={isNegative ? '#ef4444' : '#22c55e'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isNegative = payload.profit < 0;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={isNegative ? '#ef4444' : '#22c55e'}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                    name="Profit/Loss"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        );
      })()}

      {/* Vehicles Performance Today */}
      {vehiclePerformance.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2 animate-fade-in" style={{ animationDelay: "400ms" }}>
            <Truck className="h-6 w-6" />
            Vehicles Performance Today
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehiclePerformance.map((vehicle, index) => (
              <VehiclePerformanceCard
                key={vehicle.vehicleId}
                vehicleName={vehicle.vehicleName}
                km={vehicle.km}
                earnings={vehicle.earnings}
                profit={vehicle.profit}
                fuelUsed={vehicle.fuelUsed}
                delay={400 + index * 50}
              />
            ))}
          </div>
        </div>
      )}
      </div>
    </PullToRefresh>
  );
};

export default Dashboard;
