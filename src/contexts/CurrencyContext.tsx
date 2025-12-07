import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

type Currency = "INR" | "USD";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>("INR");

  useEffect(() => {
    if (user) {
      fetchCurrencyPreference();
    }
  }, [user]);

  const fetchCurrencyPreference = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      if (data?.currency) {
        setCurrencyState(data.currency as Currency);
      }
    } catch (error) {
      console.error("Error fetching currency preference:", error);
    }
  };

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (user) {
      try {
        await supabase
          .from("profiles")
          .update({ currency: newCurrency })
          .eq("id", user.id);
      } catch (error) {
        console.error("Error updating currency:", error);
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    const symbol = currency === "INR" ? "₹" : "$";
    const formatted = amount.toFixed(0);
    return `${symbol}${formatted}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
