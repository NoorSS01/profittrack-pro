import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Users, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserType, UserType } from "@/contexts/UserTypeContext";
import { useToast } from "@/hooks/use-toast";

interface UserTypeSelectorProps {
    onComplete: () => void;
    showAsModal?: boolean;
}

export const UserTypeSelector = ({ onComplete, showAsModal = true }: UserTypeSelectorProps) => {
    const { setUserType, canSelectAgentMode } = useUserType();
    const { toast } = useToast();
    const [selected, setSelected] = useState<UserType>("owner");
    const [saving, setSaving] = useState(false);

    const handleContinue = async () => {
        setSaving(true);
        try {
            await setUserType(selected);
            toast({
                title: "Mode Selected",
                description: selected === "owner"
                    ? "You're set up as a Vehicle Owner"
                    : "You're set up as an Agent/Broker",
            });
            onComplete();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save selection. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const options = [
        {
            type: "owner" as UserType,
            title: "Vehicle Owner",
            subtitle: "I own the vehicles",
            description: "Track profit from your own vehicles. Manage fuel costs, earnings, and expenses.",
            icon: Truck,
            color: "text-primary",
            bgColor: "bg-primary/10",
        },
        {
            type: "agent" as UserType,
            title: "Agent / Broker",
            subtitle: "I manage delivery partners",
            description: "Manage multiple vehicle owners. Track commission from each partner's trips.",
            icon: Users,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            disabled: !canSelectAgentMode,
        },
    ];

    const content = (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">How do you operate?</h2>
                <p className="text-muted-foreground text-sm">
                    This helps us customize the app for your needs
                </p>
            </div>

            <div className="space-y-3">
                {options.map((option) => (
                    <button
                        key={option.type}
                        onClick={() => !option.disabled && setSelected(option.type)}
                        disabled={option.disabled}
                        className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                            selected === option.type
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50",
                            option.disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn("p-3 rounded-xl", option.bgColor)}>
                                <option.icon className={cn("h-6 w-6", option.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold">{option.title}</h3>
                                        <p className="text-xs text-muted-foreground">{option.subtitle}</p>
                                    </div>
                                    {selected === option.type && (
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <Check className="h-4 w-4 text-primary-foreground" />
                                        </div>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                    {option.description}
                                </p>
                                {option.disabled && (
                                    <p className="text-xs text-amber-500 mt-2">
                                        Requires Standard or Ultra plan
                                    </p>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <Button
                onClick={handleContinue}
                size="lg"
                className="w-full h-12 text-base font-semibold gap-2"
                disabled={saving}
            >
                {saving ? "Saving..." : "Continue"}
                <ChevronRight className="h-5 w-5" />
            </Button>
        </div>
    );

    if (!showAsModal) {
        return <Card><CardContent className="p-6">{content}</CardContent></Card>;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
                {content}
            </motion.div>
        </motion.div>
    );
};

export default UserTypeSelector;
