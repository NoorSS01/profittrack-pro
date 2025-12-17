import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PLAN_PRICES } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Crown, Zap, Star, Truck, Clock, MessageSquare, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const Pricing = () => {
  const { plan, trialDaysLeft, isTrialActive } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeCard, setActiveCard] = useState(1); // Start with Standard (middle)
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSelectPlan = (selectedPlan: string) => {
    toast({
      title: "Coming Soon",
      description: `Payment integration for ${selectedPlan} plan will be available soon. Contact support for manual activation.`,
    });
  };

  const scrollToCard = (index: number) => {
    setActiveCard(index);
    if (scrollRef.current) {
      const cardWidth = scrollRef.current.offsetWidth * 0.85;
      scrollRef.current.scrollTo({
        left: index * cardWidth - (scrollRef.current.offsetWidth - cardWidth) / 2,
        behavior: 'smooth'
      });
    }
  };

  const plans = [
    {
      name: "Basic",
      id: "basic",
      price: billingCycle === "monthly" ? PLAN_PRICES.basic.monthly : PLAN_PRICES.basic.yearly,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      description: "For individual owners",
      icon: Truck,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      popular: false,
      features: [
        { text: "1 Vehicle", included: true },
        { text: "10 Days History", included: true },
        { text: "1 Month View", included: true },
        { text: "Basic Reports", included: true },
        { text: "AI Assistant", included: false },
        { text: "Export Reports", included: false },
      ],
    },
    {
      name: "Standard",
      id: "standard",
      price: billingCycle === "monthly" ? PLAN_PRICES.standard.monthly : PLAN_PRICES.standard.yearly,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      description: "For growing businesses",
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      popular: true,
      features: [
        { text: "5 Vehicles", included: true },
        { text: "90 Days History", included: true },
        { text: "6 Month View", included: true },
        { text: "Full Reports", included: true },
        { text: "AI Chat (30/day)", included: true },
        { text: "Export Reports", included: false },
      ],
    },
    {
      name: "Ultra",
      id: "ultra",
      price: billingCycle === "monthly" ? PLAN_PRICES.ultra.monthly : PLAN_PRICES.ultra.yearly,
      period: billingCycle === "monthly" ? "/mo" : "/yr",
      description: "For fleet owners",
      icon: Crown,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      popular: false,
      features: [
        { text: "Unlimited Vehicles", included: true },
        { text: "Unlimited History", included: true },
        { text: "6 Month View", included: true },
        { text: "Full Reports", included: true },
        { text: "Unlimited AI Chat", included: true },
        { text: "Export (PDF/Excel)", included: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            {isTrialActive 
              ? `${trialDaysLeft} days left in free trial`
              : "Select a plan to continue"
            }
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <span className={cn("text-sm", billingCycle === "monthly" ? "text-foreground font-medium" : "text-muted-foreground")}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                billingCycle === "yearly" ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                  billingCycle === "yearly" ? "translate-x-7" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn("text-sm flex items-center gap-1", billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground")}>
              Yearly
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">-17%</Badge>
            </span>
          </div>
        </div>

        {/* Mobile Card Indicators */}
        <div className="flex justify-center gap-2 mb-4 md:hidden">
          {plans.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                activeCard === index ? "bg-primary w-6" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Mobile Horizontal Scroll */}
        <div 
          ref={scrollRef}
          className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            const cardWidth = target.offsetWidth * 0.85;
            const newIndex = Math.round(target.scrollLeft / cardWidth);
            if (newIndex !== activeCard && newIndex >= 0 && newIndex < plans.length) {
              setActiveCard(newIndex);
            }
          }}
        >
          {plans.map((planItem, index) => {
            const Icon = planItem.icon;
            const isCurrentPlan = plan === planItem.id;
            
            return (
              <Card 
                key={planItem.id}
                className={cn(
                  "flex-shrink-0 w-[85vw] max-w-[320px] snap-center transition-all",
                  planItem.popular && "ring-2 ring-primary shadow-lg",
                  planItem.borderColor
                )}
              >
                {planItem.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-3 pt-6">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3", planItem.bgColor)}>
                    <Icon className={cn("h-6 w-6", planItem.color)} />
                  </div>
                  <CardTitle className="text-xl">{planItem.name}</CardTitle>
                  <CardDescription className="text-xs">{planItem.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-3xl font-bold">₹{planItem.price}</span>
                    <span className="text-muted-foreground text-sm">{planItem.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3 pb-6">
                  <ul className="space-y-2">
                    {planItem.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        {feature.included ? (
                          <div className="w-4 h-4 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                            <Check className="h-2.5 w-2.5 text-success" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <X className="h-2.5 w-2.5 text-muted-foreground" />
                          </div>
                        )}
                        <span className={cn("text-sm", !feature.included && "text-muted-foreground")}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full mt-4"
                    variant={planItem.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(planItem.name)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? "Current Plan" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-10">
          {plans.map((planItem) => {
            const Icon = planItem.icon;
            const isCurrentPlan = plan === planItem.id;
            
            return (
              <Card 
                key={planItem.id}
                className={cn(
                  "relative transition-all duration-300 hover:shadow-xl",
                  planItem.popular && "ring-2 ring-primary shadow-lg scale-[1.02]",
                  planItem.borderColor
                )}
              >
                {planItem.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4 py-1">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4", planItem.bgColor)}>
                    <Icon className={cn("h-7 w-7", planItem.color)} />
                  </div>
                  <CardTitle className="text-2xl">{planItem.name}</CardTitle>
                  <CardDescription>{planItem.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹{planItem.price}</span>
                    <span className="text-muted-foreground">{planItem.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {planItem.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3">
                        {feature.included ? (
                          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                            <Check className="h-3 w-3 text-success" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                            <X className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className={cn("text-sm", !feature.included && "text-muted-foreground")}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    className="w-full mt-6"
                    variant={planItem.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(planItem.name)}
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan ? "Current Plan" : "Get Started"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="p-3 bg-card rounded-lg border text-center">
            <Truck className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Multi-Vehicle</p>
          </div>
          <div className="p-3 bg-card rounded-lg border text-center">
            <Clock className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Full History</p>
          </div>
          <div className="p-3 bg-card rounded-lg border text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">AI Assistant</p>
          </div>
          <div className="p-3 bg-card rounded-lg border text-center">
            <FileText className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-xs font-medium">Export Reports</p>
          </div>
        </div>

        {/* Back Button */}
        {plan !== "expired" && (
          <div className="text-center mt-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
