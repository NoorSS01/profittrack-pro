/**
 * Data Aggregator Service
 * Collects and summarizes user statistics from Supabase for AI context
 */

import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';

export interface VehiclePerformance {
  id: string;
  name: string;
  type: string;
  totalKm: number;
  totalEarnings: number;
  totalExpenses: number;
  netProfit: number;
  tripCount: number;
  avgProfitPerTrip: number;
  fuelEfficiency: number;
  mileageKmpl: number;
}

export interface ExpenseBreakdown {
  fuel: number;
  toll: number;
  repair: number;
  food: number;
  misc: number;
  emi: number;
  driverSalary: number;
  maintenance: number;
}

export interface TrendData {
  profitChange: number;
  expenseChange: number;
  earningsChange: number;
  kmChange: number;
}

export interface UserContext {
  period: {
    start: string;
    end: string;
    label: string;
    days: number;
  };
  summary: {
    totalEarnings: number;
    totalExpenses: number;
    netProfit: number;
    totalKilometers: number;
    totalTrips: number;
    avgDailyProfit: number;
    profitMargin: number;
  };
  expenseBreakdown: ExpenseBreakdown;
  vehicles: VehiclePerformance[];
  trends: TrendData;
  topPerformer: string | null;
  worstPerformer: string | null;
  highestExpenseCategory: string;
  hasData: boolean;
}

/**
 * Parse time period from natural language
 */
export function parseTimePeriod(query: string): { start: Date; end: Date; label: string } {
  const today = new Date();
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('today')) {
    return {
      start: today,
      end: today,
      label: 'Today',
    };
  }

  if (lowerQuery.includes('yesterday')) {
    const yesterday = subDays(today, 1);
    return {
      start: yesterday,
      end: yesterday,
      label: 'Yesterday',
    };
  }

  if (lowerQuery.includes('this week') || lowerQuery.includes('last 7 days') || lowerQuery.includes('past week')) {
    return {
      start: subDays(today, 6),
      end: today,
      label: 'Last 7 days',
    };
  }

  if (lowerQuery.includes('last week')) {
    return {
      start: subDays(today, 13),
      end: subDays(today, 7),
      label: 'Last week',
    };
  }

  if (lowerQuery.includes('this month')) {
    return {
      start: startOfMonth(today),
      end: endOfMonth(today),
      label: 'This month',
    };
  }

  if (lowerQuery.includes('last month')) {
    const lastMonth = subMonths(today, 1);
    return {
      start: startOfMonth(lastMonth),
      end: endOfMonth(lastMonth),
      label: 'Last month',
    };
  }

  if (lowerQuery.includes('this year') || lowerQuery.includes('year to date') || lowerQuery.includes('ytd')) {
    return {
      start: startOfYear(today),
      end: today,
      label: 'This year',
    };
  }

  if (lowerQuery.includes('last 3 months') || lowerQuery.includes('past 3 months')) {
    return {
      start: subMonths(today, 3),
      end: today,
      label: 'Last 3 months',
    };
  }

  if (lowerQuery.includes('last 6 months') || lowerQuery.includes('past 6 months')) {
    return {
      start: subMonths(today, 6),
      end: today,
      label: 'Last 6 months',
    };
  }

  // Default: last 30 days
  return {
    start: subDays(today, 29),
    end: today,
    label: 'Last 30 days',
  };
}

/**
 * Get user context data for AI prompts
 */
export async function getUserContext(
  userId: string,
  startDate: Date,
  endDate: Date,
  periodLabel: string
): Promise<UserContext> {
  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Fetch daily entries for the period
  const { data: entries, error: entriesError } = await supabase
    .from('daily_entries')
    .select('*, vehicles(id, vehicle_name, vehicle_type, mileage_kmpl, monthly_emi, driver_monthly_salary, expected_monthly_maintenance)')
    .eq('user_id', userId)
    .gte('entry_date', startStr)
    .lte('entry_date', endStr)
    .order('entry_date', { ascending: true });

  if (entriesError) {
    console.error('Error fetching entries:', entriesError);
    throw new Error('Failed to fetch user data');
  }

  // Fetch all vehicles
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (vehiclesError) {
    console.error('Error fetching vehicles:', vehiclesError);
    throw new Error('Failed to fetch vehicle data');
  }

  // Calculate previous period for trends
  const prevStart = subDays(startDate, days);
  const prevEnd = subDays(startDate, 1);
  const prevStartStr = format(prevStart, 'yyyy-MM-dd');
  const prevEndStr = format(prevEnd, 'yyyy-MM-dd');

  const { data: prevEntries } = await supabase
    .from('daily_entries')
    .select('trip_earnings, total_expenses, net_profit, kilometers')
    .eq('user_id', userId)
    .gte('entry_date', prevStartStr)
    .lte('entry_date', prevEndStr);

  // Initialize empty context
  if (!entries || entries.length === 0) {
    return createEmptyContext(startStr, endStr, periodLabel, days, vehicles || []);
  }

  // Calculate summary statistics
  const summary = calculateSummary(entries, days);
  
  // Calculate expense breakdown
  const expenseBreakdown = calculateExpenseBreakdown(entries);
  
  // Calculate vehicle performance
  const vehiclePerformance = calculateVehiclePerformance(entries, vehicles || []);
  
  // Calculate trends
  const trends = calculateTrends(summary, prevEntries || []);
  
  // Find top and worst performers
  const sortedVehicles = [...vehiclePerformance].sort((a, b) => b.netProfit - a.netProfit);
  const topPerformer = sortedVehicles.length > 0 ? sortedVehicles[0].name : null;
  const worstPerformer = sortedVehicles.length > 1 ? sortedVehicles[sortedVehicles.length - 1].name : null;
  
  // Find highest expense category
  const highestExpenseCategory = findHighestExpenseCategory(expenseBreakdown);

  return {
    period: {
      start: startStr,
      end: endStr,
      label: periodLabel,
      days,
    },
    summary,
    expenseBreakdown,
    vehicles: vehiclePerformance,
    trends,
    topPerformer,
    worstPerformer,
    highestExpenseCategory,
    hasData: true,
  };
}

function createEmptyContext(
  start: string,
  end: string,
  label: string,
  days: number,
  vehicles: any[]
): UserContext {
  return {
    period: { start, end, label, days },
    summary: {
      totalEarnings: 0,
      totalExpenses: 0,
      netProfit: 0,
      totalKilometers: 0,
      totalTrips: 0,
      avgDailyProfit: 0,
      profitMargin: 0,
    },
    expenseBreakdown: {
      fuel: 0,
      toll: 0,
      repair: 0,
      food: 0,
      misc: 0,
      emi: 0,
      driverSalary: 0,
      maintenance: 0,
    },
    vehicles: vehicles.map((v) => ({
      id: v.id,
      name: v.vehicle_name,
      type: v.vehicle_type,
      totalKm: 0,
      totalEarnings: 0,
      totalExpenses: 0,
      netProfit: 0,
      tripCount: 0,
      avgProfitPerTrip: 0,
      fuelEfficiency: v.mileage_kmpl || 0,
      mileageKmpl: v.mileage_kmpl || 0,
    })),
    trends: {
      profitChange: 0,
      expenseChange: 0,
      earningsChange: 0,
      kmChange: 0,
    },
    topPerformer: null,
    worstPerformer: null,
    highestExpenseCategory: 'None',
    hasData: false,
  };
}

function calculateSummary(entries: any[], days: number) {
  const totals = entries.reduce(
    (acc, entry) => ({
      earnings: acc.earnings + Number(entry.trip_earnings || 0),
      expenses: acc.expenses + Number(entry.total_expenses || 0),
      profit: acc.profit + Number(entry.net_profit || 0),
      km: acc.km + Number(entry.kilometers || 0),
    }),
    { earnings: 0, expenses: 0, profit: 0, km: 0 }
  );

  const profitMargin = totals.earnings > 0 
    ? (totals.profit / totals.earnings) * 100 
    : 0;

  return {
    totalEarnings: totals.earnings,
    totalExpenses: totals.expenses,
    netProfit: totals.profit,
    totalKilometers: totals.km,
    totalTrips: entries.length,
    avgDailyProfit: days > 0 ? totals.profit / days : 0,
    profitMargin,
  };
}

function calculateExpenseBreakdown(entries: any[]): ExpenseBreakdown {
  return entries.reduce(
    (acc, entry) => {
      const dailyEMI = Number(entry.vehicles?.monthly_emi || 0) / 30;
      const dailyDriverSalary = Number(entry.vehicles?.driver_monthly_salary || 0) / 30;
      const dailyMaintenance = Number(entry.vehicles?.expected_monthly_maintenance || 0) / 30;

      return {
        fuel: acc.fuel + Number(entry.fuel_cost || 0),
        toll: acc.toll + Number(entry.toll_expense || 0),
        repair: acc.repair + Number(entry.repair_expense || 0),
        food: acc.food + Number(entry.food_expense || 0),
        misc: acc.misc + Number(entry.misc_expense || 0),
        emi: acc.emi + dailyEMI,
        driverSalary: acc.driverSalary + dailyDriverSalary,
        maintenance: acc.maintenance + dailyMaintenance,
      };
    },
    { fuel: 0, toll: 0, repair: 0, food: 0, misc: 0, emi: 0, driverSalary: 0, maintenance: 0 }
  );
}

function calculateVehiclePerformance(entries: any[], vehicles: any[]): VehiclePerformance[] {
  const vehicleMap = new Map<string, any>();

  // Initialize with all vehicles
  vehicles.forEach((v) => {
    vehicleMap.set(v.id, {
      id: v.id,
      name: v.vehicle_name,
      type: v.vehicle_type,
      totalKm: 0,
      totalEarnings: 0,
      totalExpenses: 0,
      netProfit: 0,
      tripCount: 0,
      fuelUsed: 0,
      mileageKmpl: v.mileage_kmpl || 0,
    });
  });

  // Aggregate entries by vehicle
  entries.forEach((entry) => {
    const vehicleId = entry.vehicle_id;
    if (vehicleMap.has(vehicleId)) {
      const v = vehicleMap.get(vehicleId);
      v.totalKm += Number(entry.kilometers || 0);
      v.totalEarnings += Number(entry.trip_earnings || 0);
      v.totalExpenses += Number(entry.total_expenses || 0);
      v.netProfit += Number(entry.net_profit || 0);
      v.tripCount += 1;
      v.fuelUsed += Number(entry.fuel_filled || 0);
    }
  });

  // Calculate derived metrics
  return Array.from(vehicleMap.values()).map((v) => ({
    id: v.id,
    name: v.name,
    type: v.type,
    totalKm: v.totalKm,
    totalEarnings: v.totalEarnings,
    totalExpenses: v.totalExpenses,
    netProfit: v.netProfit,
    tripCount: v.tripCount,
    avgProfitPerTrip: v.tripCount > 0 ? v.netProfit / v.tripCount : 0,
    fuelEfficiency: v.fuelUsed > 0 ? v.totalKm / v.fuelUsed : v.mileageKmpl,
    mileageKmpl: v.mileageKmpl,
  }));
}

function calculateTrends(currentSummary: any, prevEntries: any[]): TrendData {
  if (!prevEntries || prevEntries.length === 0) {
    return {
      profitChange: 0,
      expenseChange: 0,
      earningsChange: 0,
      kmChange: 0,
    };
  }

  const prevTotals = prevEntries.reduce(
    (acc, entry) => ({
      earnings: acc.earnings + Number(entry.trip_earnings || 0),
      expenses: acc.expenses + Number(entry.total_expenses || 0),
      profit: acc.profit + Number(entry.net_profit || 0),
      km: acc.km + Number(entry.kilometers || 0),
    }),
    { earnings: 0, expenses: 0, profit: 0, km: 0 }
  );

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    profitChange: calcChange(currentSummary.netProfit, prevTotals.profit),
    expenseChange: calcChange(currentSummary.totalExpenses, prevTotals.expenses),
    earningsChange: calcChange(currentSummary.totalEarnings, prevTotals.earnings),
    kmChange: calcChange(currentSummary.totalKilometers, prevTotals.km),
  };
}

function findHighestExpenseCategory(breakdown: ExpenseBreakdown): string {
  const categories = [
    { name: 'Fuel', value: breakdown.fuel },
    { name: 'Toll', value: breakdown.toll },
    { name: 'Repairs', value: breakdown.repair },
    { name: 'Food', value: breakdown.food },
    { name: 'Miscellaneous', value: breakdown.misc },
    { name: 'EMI', value: breakdown.emi },
    { name: 'Driver Salary', value: breakdown.driverSalary },
    { name: 'Maintenance', value: breakdown.maintenance },
  ];

  const sorted = categories.sort((a, b) => b.value - a.value);
  return sorted[0].value > 0 ? sorted[0].name : 'None';
}
