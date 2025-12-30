import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";

export type UserType = "owner" | "agent";

interface UserTypeContextType {
    userType: UserType;
    setUserType: (type: UserType) => Promise<void>;
    isAgent: boolean;
    isLoading: boolean;
    canSelectAgentMode: boolean;
}

const UserTypeContext = createContext<UserTypeContextType | undefined>(undefined);

export const useUserType = () => {
    const context = useContext(UserTypeContext);
    if (!context) {
        throw new Error("useUserType must be used within UserTypeProvider");
    }
    return context;
};

interface UserTypeProviderProps {
    children: ReactNode;
}

export const UserTypeProvider = ({ children }: UserTypeProviderProps) => {
    const { user } = useAuth();
    const { plan } = useSubscription();
    const [userType, setUserTypeState] = useState<UserType>("owner");
    const [isLoading, setIsLoading] = useState(true);

    // Only Standard and Ultra can use Agent mode
    const canSelectAgentMode = plan === "standard" || plan === "ultra" || plan === "trial";

    useEffect(() => {
        if (user) {
            fetchUserType();
        } else {
            setIsLoading(false);
        }
    }, [user]);

    const fetchUserType = async () => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("user_type")
                .eq("id", user?.id)
                .single();

            if (!error && data?.user_type) {
                setUserTypeState(data.user_type as UserType);
            }
        } catch (error) {
            console.error("Error fetching user type:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const setUserType = async (type: UserType) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ user_type: type })
                .eq("id", user.id);

            if (error) throw error;

            setUserTypeState(type);
        } catch (error) {
            console.error("Error updating user type:", error);
            throw error;
        }
    };

    return (
        <UserTypeContext.Provider
            value={{
                userType,
                setUserType,
                isAgent: userType === "agent",
                isLoading,
                canSelectAgentMode,
            }}
        >
            {children}
        </UserTypeContext.Provider>
    );
};

export default UserTypeProvider;
