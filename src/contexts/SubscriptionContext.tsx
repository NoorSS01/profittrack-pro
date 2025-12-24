import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { differenceInDays, parseISO } from "date-fns";

export type PlanType = "trial" | "basic" | "standard" | "ultra" | "expired";

export interface PlanLimits {
  maxVehicles: number;
  tripHistoryDays: number;
  dashboardMonths: number;
  aiChatEnabled: boolean;
  aiChatDailyLimit: number;
  reportsExport: boolean;
  prioritySupport: boolean;
}

export interface SubscriptionState {
  plan: PlanType;
  isTrialActive: boolean;
  trialDaysLeft: number;
  limits: PlanLimits;
  isLoading: boolean;
  subscriptionEndDate: string | null;
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  trial: {
    maxVehicles: 10,
    tripHistoryDays: 365,
    dashboardMonths: 6,
    aiChatEnabled: true,
    aiChatDailyLimit: 50,
    reportsExport: true,
    prioritySupport: false,
  },
  basic: {
    maxVehicles: 1,
    tripHistoryDays: 10,
    dashboardMonths: 1,
    aiChatEnabled: false,
    aiChatDailyLimit: 0,
    reportsExport: false,
    prioritySupport: false,
  },
  standard: {
    maxVehicles: 5,
    tripHistoryDays: 90,
    dashboardMonths: 6,
    aiChatEnabled: true,
    aiChatDailyLimit: 30,
    reportsExport: false,
    prioritySupport: false,
  },
  ultra: {
    maxVehicles: 999,
    tripHistoryDays: 9999,
    dashboardMonths: 60,
    aiChatEnabled: true,
    aiChatDailyLimit: 999,
    reportsExport: true,
    prioritySupport: true,
  },
  expired: {
    maxVehicles: 0,
    tripHistoryDays: 0,
    dashboardMonths: 0,
    aiChatEnabled: false,
    aiChatDailyLimit: 0,
    reportsExport: false,
    prioritySupport: false,
  },
};

// Yearly = 20% discount (monthly * 12 * 0.8)
export const PLAN_PRICES = {
  basic: { monthly: 299, yearly: Math.round(299 * 12 * 0.8) }, // 2870
  standard: { monthly: 599, yearly: Math.round(599 * 12 * 0.8) }, // 5750
  ultra: { monthly: 4999, yearly: Math.round(4999 * 12 * 0.8) }, // 47990
};

const FREE_TRIAL_DAYS = 15;

interface SubscriptionContextType extends SubscriptionState {
  checkFeatureAccess: (feature: keyof PlanLimits) => boolean;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: "trial",
    isTrialActive: true,
    trialDaysLeft: FREE_TRIAL_DAYS,
    limits: PLAN_LIMITS.trial,
    isLoading: true,
    subscriptionEndDate: null,
  });

  const fetchSubscription = async () => {
    if (!user) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Get user profile with subscription info
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("created_at, subscription_plan, subscription_end_date")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      const createdAt = parseISO(profile.created_at);
      const daysSinceCreation = differenceInDays(new Date(), createdAt);
      const trialDaysLeft = Math.max(0, FREE_TRIAL_DAYS - daysSinceCreation);
      const isTrialActive = trialDaysLeft > 0;

      // Check if user has an active subscription
      const subscriptionPlan = profile.subscription_plan as PlanType | null;
      const subscriptionEndDate = profile.subscription_end_date;
      
      let currentPlan: PlanType;
      
      if (subscriptionPlan && subscriptionEndDate) {
        const endDate = parseISO(subscriptionEndDate);
        if (endDate > new Date()) {
          currentPlan = subscriptionPlan;
        } else if (isTrialActive) {
          currentPlan = "trial";
        } else {
          currentPlan = "expired";
        }
      } else if (isTrialActive) {
        currentPlan = "trial";
      } else {
        currentPlan = "expired";
      }

      setState({
        plan: currentPlan,
        isTrialActive: currentPlan === "trial",
        trialDaysLeft,
        limits: PLAN_LIMITS[currentPlan],
        isLoading: false,
        subscriptionEndDate,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      setState(prev => ({ ...prev, isLoading: false, plan: "expired" }));
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const checkFeatureAccess = (feature: keyof PlanLimits): boolean => {
    if (state.plan === "expired") return false;
    const value = state.limits[feature];
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value > 0;
    return false;
  };

  const refreshSubscription = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    await fetchSubscription();
  };

  return (
    <SubscriptionContext.Provider value={{ ...state, checkFeatureAccess, refreshSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
};
