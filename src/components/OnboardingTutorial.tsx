import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, ClipboardList, CheckCircle2, ArrowRight, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingTutorialProps {
    hasVehicles: boolean;
    hasEntries: boolean;
    onComplete: () => void;
}

const steps = [
    {
        id: "welcome",
        title: "Welcome to ProfitTrack Pro! 🚀",
        description: "Let's get you set up in just 2 simple steps. We'll guide you through adding your first vehicle and making your first trip entry.",
        icon: Sparkles,
        action: null,
    },
    {
        id: "add-vehicle",
        title: "Step 1: Add Your Vehicle",
        description: "Start by adding your vehicle details. This helps us calculate fuel costs, earnings, and track your profits accurately.",
        icon: Truck,
        action: "vehicles",
        buttonText: "Add Vehicle",
    },
    {
        id: "first-entry",
        title: "Step 2: Record Your First Trip",
        description: "Great! Now let's record your first trip. Just enter the kilometers traveled and we'll calculate everything else.",
        icon: ClipboardList,
        action: "daily-entry",
        buttonText: "Add Entry",
    },
    {
        id: "complete",
        title: "You're All Set! 🎉",
        description: "Congratulations! You've completed the setup. Your dashboard will now show your trip data and profit analytics.",
        icon: CheckCircle2,
        action: null,
        buttonText: "Go to Dashboard",
    },
];

export const OnboardingTutorial = ({ hasVehicles, hasEntries, onComplete }: OnboardingTutorialProps) => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    // Determine which step to show based on user progress
    useEffect(() => {
        if (hasEntries) {
            // User has completed everything
            setCurrentStep(3);
        } else if (hasVehicles) {
            // User has vehicle but no entries
            setCurrentStep(2);
        } else {
            // New user - start from beginning
            setCurrentStep(0);
        }
    }, [hasVehicles, hasEntries]);

    const handleNext = () => {
        const step = steps[currentStep];

        if (step.action) {
            navigate(`/${step.action}`);
        } else if (currentStep === 0) {
            setCurrentStep(1);
        } else if (currentStep === 3) {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        localStorage.setItem("onboarding_completed", "true");
        onComplete();
        navigate("/");
    };

    const handleSkip = () => {
        setIsVisible(false);
        localStorage.setItem("onboarding_completed", "true");
        onComplete();
    };

    if (!isVisible) return null;

    const step = steps[currentStep];
    const Icon = step.icon;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
                {/* Background pattern */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.5 }}
                    className="relative w-full max-w-lg mx-4"
                >
                    <Card className="border-2 shadow-2xl overflow-hidden">
                        {/* Progress bar */}
                        <div className="h-1 bg-muted">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: "0%" }}
                                animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        <CardContent className="p-8">
                            {/* Skip button */}
                            {currentStep < 3 && (
                                <button
                                    onClick={handleSkip}
                                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted transition-colors"
                                >
                                    <X className="h-5 w-5 text-muted-foreground" />
                                </button>
                            )}

                            {/* Icon */}
                            <motion.div
                                key={step.id}
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", duration: 0.5 }}
                                className={cn(
                                    "mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
                                    currentStep === 3 ? "bg-success/20" : "bg-primary/20"
                                )}
                            >
                                <Icon className={cn(
                                    "h-10 w-10",
                                    currentStep === 3 ? "text-success" : "text-primary"
                                )} />
                            </motion.div>

                            {/* Step indicator */}
                            <div className="flex justify-center gap-2 mb-6">
                                {steps.map((_, index) => (
                                    <div
                                        key={index}
                                        className={cn(
                                            "w-2 h-2 rounded-full transition-all duration-300",
                                            index === currentStep ? "w-6 bg-primary" : "bg-muted"
                                        )}
                                    />
                                ))}
                            </div>

                            {/* Content */}
                            <motion.div
                                key={`content-${step.id}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-center"
                            >
                                <h2 className="text-2xl font-bold mb-3">{step.title}</h2>
                                <p className="text-muted-foreground mb-8 leading-relaxed">
                                    {step.description}
                                </p>
                            </motion.div>

                            {/* Action button */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <Button
                                    onClick={handleNext}
                                    size="lg"
                                    className="w-full h-14 text-lg font-semibold gap-2"
                                >
                                    {step.buttonText || "Get Started"}
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </motion.div>

                            {/* Help text */}
                            {currentStep === 0 && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="text-center text-sm text-muted-foreground mt-4"
                                >
                                    Takes less than 2 minutes to complete
                                </motion.p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OnboardingTutorial;
