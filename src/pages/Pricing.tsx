import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription, PLAN_PRICES } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Crown, Zap, Star, Truck, Clock, MessageSquare, FileText, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

const Pricing = () => {
  const { plan, trialDaysLeft, isTrialActive } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleSelectPlan = (selectedPlan: string) => {
    // For now, show a toast - you'll integrate payment gateway later
    toast({
      title: "Coming Soon",
      description: `Payment integration for ${selectedPlan} plan will be available soon. Contact support for manual activation.`,
    });
  };

  const plans = [
    {
      name: "Basic",
      id: "basic",
      price: billingCycle === "monthly" ? PLAN_PRICES.basic.monthly : PLAN_PRICES.basic.yearly,
      period: billingCycle === "monthly" ? "/month" : "/year",
      description: "Perfect for individual truck owners",
      icon: Truck,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      popular: false,
      features: [
        { text: "1 Vehicle", included: true },
        { text: "10 Days Trip History", included: true },
        { text: "1 Month Dashboard View", included: true },
        { text: "Basic Reports", included: true },
        { text: "AI Chat Assistant", included: false },
        { text: "6 Month Analytics", included: false },
        { text: "Export Reports", included: false },
        { text: "Priority Support", included: false },
      ],
    },
    {
      name: "Standard",
      id: "standard",
      price: billingCycle === "monthly" ? PLAN_PRICES.standard.monthly : PLAN_PRICES.standard.yearly,
      period: billingCycle === "monthly" ? "/month" : "/year",
      description: "Best for growing transport businesses",
      icon: Zap,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
      popular: true,
      features: [
        { text: "5 Vehicles", included: true },
        { text: "90 Days Trip History", included: true },
        { text: "6 Month Dashboard View", included: true },
        { text: "Full Reports", included: true },
        { text: "AI Chat (30 msgs/day)", included: true },
        { text: "6 Month Analytics", included: true },
        { text: "Export Reports", included: false },
        { text: "Priority Support", included: false },
      ],
    },
    {
      name: "Ultra",
      id: "ultra",
      price: billingCycle === "monthly" ? PLAN_PRICES.ultra.monthly : PLAN_PRICES.ultra.yearly,
      period: billingCycle === "monthly" ? "/month" : "/year",
      description: "For fleet owners & enterprises",
      icon: Crown,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      popular: false,
      features: [
        { text: "Unlimited Vehicles", included: true },
        { text: "Unlimited Trip History", included: true },
        { text: "6 Month Dashboard View", included: true },
        { text: "Full Reports + Export", included: true },
        { text: "Unlimited AI Chat", included: true },
        { text: "6 Month Analytics", included: true },
        { text: "Export Reports (PDF/Excel)", included: true },
        { text: "Priority Support", included: true },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {isTrialActive 
              ? `You have ${trialDaysLeft} days left in your free trial. Upgrade anytime!`
              : "Select a plan to continue using TransportPro"
            }
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className={cn("text-sm", billingCycle === "monthly" ? "text-foreground font-medium" : "text-muted-foreground")}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
              className={cn(
                "relative w-14 h-7 rounded-full transition-colors",
                billingCycle === "yearly" ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 w-5 h-5 rounded-full bg-white transition-transform",
                  billingCycle === "yearly" ? "translate-x-8" : "translate-x-1"
                )}
              />
            </button>
            <span className={cn("text-sm", billingCycle === "yearly" ? "text-foreground font-medium" : "text-muted-foreground")}>
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">Save 17%</Badge>
            </span>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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
                    className={cn(
                      "w-full mt-6",
                      planItem.popular ? "" : "variant-outline"
                    )}
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

        {/* Features Comparison */}
        <Card className="mt-10">
          <CardHeader>
            <CardTitle className="text-center">Why Upgrade?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-4">
                <Truck className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold">Multi-Vehicle</h4>
                <p className="text-sm text-muted-foreground">Track all your vehicles</p>
              </div>
              <div className="p-4">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold">Full History</h4>
                <p className="text-sm text-muted-foreground">Access complete records</p>
              </div>
              <div className="p-4">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold">AI Assistant</h4>
                <p className="text-sm text-muted-foreground">Get instant insights</p>
              </div>
              <div className="p-4">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h4 className="font-semibold">Export Reports</h4>
                <p className="text-sm text-muted-foreground">Download for accounting</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        {plan !== "expired" && (
          <div className="text-center mt-8">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              ← Back to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
