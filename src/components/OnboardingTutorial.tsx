import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, Truck, Plus, CheckCircle2, Sparkles, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

// Tutorial step types
type TutorialStepId =
    | "welcome"
    | "go-to-vehicles"
    | "click-add-vehicle"
    | "fill-vehicle-form"
    | "vehicle-saved"
    | "go-to-entry"
    | "fill-entry-form"
    | "complete";

interface TutorialStep {
    id: TutorialStepId;
    title: string;
    description: string;
    mobileDescription?: string;
    position: "center" | "bottom" | "top";
    targetPath?: string;
    waitForAction?: string;
}

const STEPS: TutorialStep[] = [
    {
        id: "welcome",
        title: "Welcome to TransportPro! 🚀",
        description: "Let's set up your account in 2 simple steps. We'll guide you through adding your first vehicle and making your first trip entry.",
        position: "center",
    },
    {
        id: "go-to-vehicles",
        title: "Step 1: Go to Vehicles",
        description: "Click on 'Vehicles' in the sidebar to add your first vehicle.",
        mobileDescription: "Tap on 'Vehicles' in the bottom navigation bar.",
        position: "bottom",
        targetPath: "/vehicles",
    },
    {
        id: "click-add-vehicle",
        title: "Add Your Vehicle",
        description: "Click the 'Add Vehicle' button to create your first vehicle.",
        mobileDescription: "Tap 'Add Vehicle' to create your first vehicle.",
        position: "top",
        waitForAction: "add-vehicle-clicked",
    },
    {
        id: "fill-vehicle-form",
        title: "Enter Vehicle Details",
        description: "Fill in your vehicle name, type, mileage, and earning details. Then click 'Save Vehicle'!",
        mobileDescription: "Fill in your vehicle details and tap 'Save Vehicle'!",
        position: "top",
        waitForAction: "vehicle-saved",
    },
    {
        id: "vehicle-saved",
        title: "Vehicle Added! ✅",
        description: "Excellent! Your vehicle is ready. Now let's record your first trip.",
        position: "center",
    },
    {
        id: "go-to-entry",
        title: "Step 2: Add Daily Entry",
        description: "Click on 'Daily Entry' in the sidebar to record your first trip.",
        mobileDescription: "Tap the '+' button to add your first trip entry.",
        position: "bottom",
        targetPath: "/daily-entry",
    },
    {
        id: "fill-entry-form",
        title: "Record Your Trip",
        description: "Select your vehicle, enter the kilometers traveled, and click 'Save Trip Entry'!",
        mobileDescription: "Select your vehicle, enter KM, and tap 'Save Trip Entry'!",
        position: "top",
        waitForAction: "entry-saved",
    },
    {
        id: "complete",
        title: "You're All Set! 🎉",
        description: "Congratulations! Your dashboard will now track your trips and calculate profits automatically.",
        position: "center",
    },
];

// Context for tutorial state
interface TutorialContextType {
    currentStep: TutorialStepId;
    isActive: boolean;
    nextStep: () => void;
    skipTutorial: () => void;
    notifyAction: (action: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const useTutorial = () => useContext(TutorialContext);

// Provider props
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
    onComplete,
}: TutorialProviderProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showTutorial, setShowTutorial] = useState(isActive);

    const currentStep = STEPS[currentStepIndex];

    // Set initial step based on progress
    useEffect(() => {
        if (hasEntries) {
            completeTutorial();
        } else if (hasVehicles) {
            // Skip to entry step
            const entryStepIndex = STEPS.findIndex(s => s.id === "go-to-entry");
            setCurrentStepIndex(entryStepIndex);
        }
    }, [hasVehicles, hasEntries]);

    // Auto-advance when reaching target path
    useEffect(() => {
        if (currentStep.targetPath && location.pathname === currentStep.targetPath) {
            // User navigated to target, advance to next step
            setTimeout(() => {
                setCurrentStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
            }, 500);
        }
    }, [location.pathname, currentStep]);

    const nextStep = () => {
        if (currentStep.targetPath) {
            navigate(currentStep.targetPath);
        }

        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            completeTutorial();
        }
    };

    const skipTutorial = () => {
        localStorage.setItem("onboarding_completed", "true");
        setShowTutorial(false);
        onComplete();
    };

    const completeTutorial = () => {
        localStorage.setItem("onboarding_completed", "true");
        setShowTutorial(false);
        onComplete();
        navigate("/");
    };

    const notifyAction = (action: string) => {
        if (currentStep.waitForAction === action) {
            if (action === "vehicle-saved") {
                // Show success, then auto-advance
                setCurrentStepIndex(STEPS.findIndex(s => s.id === "vehicle-saved"));
                setTimeout(() => {
                    setCurrentStepIndex(STEPS.findIndex(s => s.id === "go-to-entry"));
                }, 2000);
            } else if (action === "entry-saved") {
                setCurrentStepIndex(STEPS.findIndex(s => s.id === "complete"));
            } else if (action === "add-vehicle-clicked") {
                setCurrentStepIndex(STEPS.findIndex(s => s.id === "fill-vehicle-form"));
            }
        }
    };

    return (
        <TutorialContext.Provider
            value={{
                currentStep: currentStep.id,
                isActive: showTutorial,
                nextStep,
                skipTutorial,
                notifyAction,
            }}
        >
            {children}
            <AnimatePresence>
                {showTutorial && (
                    <TutorialOverlay
                        step={currentStep}
                        stepIndex={currentStepIndex}
                        totalSteps={STEPS.length}
                        onNext={nextStep}
                        onSkip={skipTutorial}
                        onComplete={completeTutorial}
                    />
                )}
            </AnimatePresence>
        </TutorialContext.Provider>
    );
};

// Overlay component
interface TutorialOverlayProps {
    step: TutorialStep;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onSkip: () => void;
    onComplete: () => void;
}

const TutorialOverlay = ({
    step,
    stepIndex,
    totalSteps,
    onNext,
    onSkip,
    onComplete,
}: TutorialOverlayProps) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 1024);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const description = isMobile && step.mobileDescription ? step.mobileDescription : step.description;
    const isComplete = step.id === "complete";
    const isVehicleSaved = step.id === "vehicle-saved";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] pointer-events-none"
        >
            {/* Dark overlay with cutouts */}
            <div className="absolute inset-0 bg-black/70 pointer-events-auto" />

            {/* Skip button */}
            {step.position !== "center" && (
                <button
                    onClick={onSkip}
                    className="absolute top-4 right-4 z-[10001] p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors pointer-events-auto"
                >
                    <X className="h-5 w-5 text-white" />
                </button>
            )}

            {/* Center modal for welcome/success steps */}
            {step.position === "center" && (
                <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-auto">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                    >
                        {/* Progress bar */}
                        <div className="h-1.5 bg-muted">
                            <motion.div
                                className="h-full bg-primary"
                                initial={{ width: "0%" }}
                                animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                            />
                        </div>

                        {/* Icon */}
                        <div className="pt-8 pb-4 flex justify-center">
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className={cn(
                                    "w-20 h-20 rounded-2xl flex items-center justify-center",
                                    isComplete || isVehicleSaved ? "bg-success/20" : "bg-primary/20"
                                )}
                            >
                                {isComplete || isVehicleSaved ? (
                                    <CheckCircle2 className="h-10 w-10 text-success" />
                                ) : (
                                    <Sparkles className="h-10 w-10 text-primary" />
                                )}
                            </motion.div>
                        </div>

                        {/* Step dots */}
                        <div className="flex justify-center gap-1.5 mb-4">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all",
                                        i === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                                    )}
                                />
                            ))}
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6 text-center">
                            <h2 className="text-xl font-bold mb-2">{step.title}</h2>
                            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                {description}
                            </p>

                            <Button
                                onClick={isComplete ? onComplete : onNext}
                                size="lg"
                                className="w-full h-12 text-base font-semibold gap-2"
                            >
                                {isComplete ? "Go to Dashboard" : isVehicleSaved ? "Continue" : "Let's Start"}
                                <ChevronRight className="h-5 w-5" />
                            </Button>

                            {stepIndex === 0 && (
                                <button
                                    onClick={onSkip}
                                    className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Skip tutorial
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Bottom tooltip for navigation steps */}
            {step.position === "bottom" && (
                <>
                    {/* Highlight for mobile Vehicles button */}
                    {step.id === "go-to-vehicles" && isMobile && (
                        <div className="absolute bottom-0 right-0 w-[70px] h-[72px] z-[10000] pointer-events-auto">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <div className="w-14 h-14 rounded-full border-4 border-primary bg-primary/20" />
                            </motion.div>
                        </div>
                    )}

                    {/* Highlight for mobile + (Entry) button */}
                    {step.id === "go-to-entry" && isMobile && (
                        <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-[10000] pointer-events-auto">
                            <motion.div
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-20 h-20 rounded-full border-4 border-primary bg-primary/10"
                            />
                        </div>
                    )}

                    {/* Highlight for desktop sidebar */}
                    {step.id === "go-to-vehicles" && !isMobile && (
                        <div className="absolute left-[16px] top-[264px] w-[232px] h-[44px] z-[10000] pointer-events-auto">
                            <motion.div
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-full h-full rounded-lg border-4 border-primary bg-primary/10"
                            />
                        </div>
                    )}

                    {step.id === "go-to-entry" && !isMobile && (
                        <div className="absolute left-[16px] top-[220px] w-[232px] h-[44px] z-[10000] pointer-events-auto">
                            <motion.div
                                animate={{ scale: [1, 1.02, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="w-full h-full rounded-lg border-4 border-primary bg-primary/10"
                            />
                        </div>
                    )}

                    {/* Tooltip card */}
                    <div className={cn(
                        "absolute left-4 right-4 z-[10001] pointer-events-auto",
                        isMobile ? "bottom-24" : "bottom-8"
                    )}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card rounded-xl shadow-2xl p-4 max-w-sm mx-auto"
                        >
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                    step.id === "go-to-vehicles" ? "bg-primary/20" : "bg-primary"
                                )}>
                                    {step.id === "go-to-vehicles" ? (
                                        <Truck className="h-5 w-5 text-primary" />
                                    ) : (
                                        <Plus className="h-5 w-5 text-primary-foreground" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm">{step.title}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                        {description}
                                    </p>
                                </div>
                            </div>

                            {/* Arrow pointing down */}
                            <div className="flex justify-center mt-3">
                                <motion.div
                                    animate={{ y: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 1 }}
                                    className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-primary"
                                />
                            </div>
                        </motion.div>
                    </div>
                </>
            )}

            {/* Top tooltip for form steps */}
            {step.position === "top" && (
                <div className="absolute top-16 lg:top-20 left-4 right-4 z-[10001] pointer-events-auto">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary text-primary-foreground rounded-xl shadow-2xl p-4 max-w-md mx-auto"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-sm">{step.title}</h3>
                                <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default TutorialProvider;
