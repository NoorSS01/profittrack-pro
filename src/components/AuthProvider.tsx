import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmount
    let mounted = true;

    // Check for existing session FIRST before setting up listener
    // This ensures we recover session state on app load
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.error("Error recovering session:", error);
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up auth state listener for subsequent auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Only update state if there's an actual change
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Only navigate on explicit sign out, not on token refresh
        if (event === "SIGNED_OUT") {
          navigate("/auth");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove navigate dependency to prevent re-renders causing session loss

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
