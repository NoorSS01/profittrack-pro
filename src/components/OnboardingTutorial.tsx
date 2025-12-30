import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Truck, Plus, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// Tutorial steps configuration
const TUTORIAL_STEPS = [
    {
        id: "welcome",
        title: "Welcome to TransportPro! 🚀",
        description: "Let's set up your account in 2 simple steps. We'll guide you through adding your first vehicle and making your first trip entry.",
        targetId: null,
        position: "center",
        action: null,
    },
    {
        id: "click-vehicles",
        title: "Step 1: Go to Vehicles",
        description: "First, let's add your vehicle. Tap on the 'Vehicles' button below.",
        targetId: "nav-vehicles",
        position: "top",
        action: "/vehicles",
        highlightNav: true,
    },
    {
        id: "click-add-vehicle",
        title: "Add Your First Vehicle",
        description: "Great! Now tap 'Add Vehicle' to create your first vehicle.",
        targetId: "add-vehicle-btn",
        position: "bottom",
        action: null,
        waitForElement: true,
    },
    {
        id: "fill-vehicle-form",
        title: "Fill In Vehicle Details",
        description: "Enter your vehicle name, type, mileage, and earning details. Then tap 'Save Vehicle' when done!",
        targetId: "vehicle-form",
        position: "top",
        action: null,
        waitForSave: true,
    },
    {
        id: "vehicle-saved",
        title: "Vehicle Added! ✅",
        description: "Excellent! Your vehicle is ready. Now let's record your first trip.",
        targetId: null,
        position: "center",
        action: null,
        autoProgress: true,
    },
    {
        id: "click-entry",
        title: "Step 2: Add Daily Entry",
        description: "Tap the '+' button to add your first trip entry.",
        targetId: "nav-entry",
        position: "top",
        action: "/daily-entry",
        highlightNav: true,
    },
    {
        id: "fill-entry",
        title: "Record Your Trip",
        description: "Select your vehicle, enter the kilometers traveled, and tap 'Save Trip Entry'!",
        targetId: "entry-form",
        position: "top",
        action: null,
        waitForSave: true,
    },
    {
        id: "complete",
        title: "You're All Set! 🎉",
        description: "Congratulations! Your dashboard will now track your trips and calculate profits automatically.",
        targetId: null,
        position: "center",
        action: null,
        final: true,
    },
];

interface TutorialContextType {
    currentStep: number;
    isActive: boolean;
    nextStep: () => void;
    skipTutorial: () => void;
    completeTutorial: () => void;
    notifyAction: (action: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => {
    const context = useContext(TutorialContext);
    return context;
};

interface TutorialProviderProps {
    children: ReactNode;
    isActive: boolean;
    hasVehicles: boolean;
    hasEntries: boolean;
    onComplete: () => void;
}

export const TutorialProvider = ({
    children,
    isActive,
    hasVehicles,
    hasEntries,
    onComplete
}: TutorialProviderProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStep, setCurrentStep] = useState(0);
    const [showOverlay, setShowOverlay] = useState(isActive);

    // Determine starting step based on user progress
    useEffect(() => {
        if (hasEntries) {
            // User completed everything
            completeTutorial();
        } else if (hasVehicles) {
            // User has vehicle, go to entry step
            setCurrentStep(5); // click-entry step
        } else {
            setCurrentStep(0);
        }
    }, [hasVehicles, hasEntries]);

    useEffect(() => {
        setShowOverlay(isActive);
    }, [isActive]);

    const nextStep = () => {
        const step = TUTORIAL_STEPS[currentStep];

        if (step.action) {
            navigate(step.action);
        }

        if (currentStep < TUTORIAL_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            completeTutorial();
        }
    };

    const skipTutorial = () => {
        localStorage.setItem("onboarding_completed", "true");
        setShowOverlay(false);
        onComplete();
    };

    const completeTutorial = () => {
        localStorage.setItem("onboarding_completed", "true");
        setShowOverlay(false);
        onComplete();
        navigate("/");
    };

    // Called when user performs expected action
    const notifyAction = (action: string) => {
        const step = TUTORIAL_STEPS[currentStep];

        if (action === "vehicle-saved" && step.id === "fill-vehicle-form") {
            setCurrentStep(4); // Move to vehicle-saved step
            setTimeout(() => setCurrentStep(5), 2000); // Auto-progress to entry step
        } else if (action === "entry-saved" && step.id === "fill-entry") {
            setCurrentStep(7); // Move to complete step
        } else if (action === "add-vehicle-clicked" && step.id === "click-add-vehicle") {
            setCurrentStep(3); // Move to fill-vehicle-form step
        }
    };

    return (
        <TutorialContext.Provider value={{
            currentStep,
            isActive: showOverlay,
            nextStep,
            skipTutorial,
            completeTutorial,
            notifyAction
        }}>
            {children}
            <AnimatePresence>
                {showOverlay && <TutorialOverlay />}
            </AnimatePresence>
        </TutorialContext.Provider>
    );
};

const TutorialOverlay = () => {
    const tutorial = useTutorial();
    const location = useLocation();

    if (!tutorial) return null;

    const { currentStep, nextStep, skipTutorial, completeTutorial } = tutorial;
    const step = TUTORIAL_STEPS[currentStep];

    // Check if we're on the right page for certain steps
    const isOnVehiclesPage = location.pathname === "/vehicles";
    const isOnEntryPage = location.pathname === "/daily-entry";

    // Adjust step display based on current location
    const shouldShowNavHighlight = step.highlightNav && (
        (step.id === "click-vehicles" && !isOnVehiclesPage) ||
        (step.id === "click-entry" && !isOnEntryPage)
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Skip button */}
            {!step.final && (
                <button
                    onClick={skipTutorial}
                    className="absolute top-4 right-4 z-[110] p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                    <X className="h-5 w-5 text-white" />
                </button>
            )}

            {/* Center modal for welcome/completion steps */}
            {step.position === "center" && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                    >
                        {/* Icon */}
                        <div className="pt-8 pb-4 flex justify-center">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", delay: 0.2 }}
                                className={cn(
                                    "w-20 h-20 rounded-2xl flex items-center justify-center",
                                    step.final ? "bg-success/20" : "bg-primary/20"
                                )}
                            >
                                {step.final ? (
                                    <CheckCircle2 className="h-10 w-10 text-success" />
                                ) : (
                                    <Sparkles className="h-10 w-10 text-primary" />
                                )}
                            </motion.div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6 text-center">
                            <h2 className="text-xl font-bold mb-2">{step.title}</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                {step.description}
                            </p>

                            <Button
                                onClick={step.final ? completeTutorial : nextStep}
                                size="lg"
                                className="w-full h-12 text-base font-semibold gap-2"
                            >
                                {step.final ? "Go to Dashboard" : "Let's Start"}
                                <ChevronRight className="h-5 w-5" />
                            </Button>

                            {!step.final && (
                                <p className="text-xs text-muted-foreground mt-3">
                                    Takes less than 2 minutes
                                </p>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Bottom tooltip for navigation highlights */}
            {shouldShowNavHighlight && (
                <div className="absolute bottom-20 left-0 right-0 flex justify-center px-4 z-[110]">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card rounded-xl shadow-2xl p-4 max-w-xs w-full"
                    >
                        <div className="flex items-start gap-3">
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                step.id === "click-vehicles" ? "bg-primary/20" : "bg-primary"
                            )}>
                                {step.id === "click-vehicles" ? (
                                    <Truck className="h-5 w-5 text-primary" />
                                ) : (
                                    <Plus className="h-5 w-5 text-primary-foreground" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm">{step.title}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {step.description}
                                </p>
                            </div>
                        </div>

                        {/* Arrow pointing to nav */}
                        <div className="flex justify-center mt-3">
                            <motion.div
                                animate={{ y: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-primary"
                            />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Highlight ring for nav items */}
            {step.id === "click-vehicles" && !isOnVehiclesPage && (
                <div className="lg:hidden absolute bottom-[72px] right-[12px] z-[105]">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-16 h-16 rounded-full border-4 border-primary bg-primary/20"
                    />
                </div>
            )}

            {step.id === "click-entry" && !isOnEntryPage && (
                <div className="lg:hidden absolute bottom-[72px] left-1/2 -translate-x-1/2 z-[105]">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-20 h-20 rounded-full border-4 border-primary"
                    />
                </div>
            )}

            {/* Form guidance tooltip */}
            {(step.id === "fill-vehicle-form" || step.id === "fill-entry" || step.id === "click-add-vehicle") && (
                <div className="absolute top-16 left-0 right-0 flex justify-center px-4 z-[110]">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 max-w-sm w-full"
                    >
                        <h3 className="font-semibold text-sm">{step.title}</h3>
                        <p className="text-xs opacity-90 mt-1">{step.description}</p>
                    </motion.div>
                </div>
            )}

            {/* Success animation for vehicle-saved step */}
            {step.id === "vehicle-saved" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                        className="bg-success/20 rounded-full p-8"
                    >
                        <CheckCircle2 className="h-16 w-16 text-success" />
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default TutorialProvider;
