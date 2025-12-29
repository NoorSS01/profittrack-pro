import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSubscription, PLAN_PRICES } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Crown, Zap, Star, Truck, Clock, FileText, Bot, ChevronLeft, ChevronRight, Loader2, CheckCircle2, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const UPI_ID = "8310807978@ybl";

const Pricing = () => {
  const { user } = useAuth();
  const { plan, trialDaysLeft, isTrialActive } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [activeCard, setActiveCard] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; id: string; price: number } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userName, setUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const waitingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const timer = setTimeout(() => { scrollToCard(1); }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelectPlan = (planName: string, planId: string, price: number) => {
    setSelectedPlan({ name: planName, id: planId, price });
    setShowPaymentDialog(true);
    setPaymentSubmitted(false);
    setIsWaitingForPayment(true);
    
    // Open UPI payment link
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=TransportPro&am=${price}&cu=INR&tn=${planName}%20Plan`;
    window.open(upiLink, '_blank');
    
    // Clear any existing timer
    if (waitingTimerRef.current) {
      clearTimeout(waitingTimerRef.current);
    }
    
    // After 13 seconds, show the "I've Paid" form
    waitingTimerRef.current = setTimeout(() => {
      setIsWaitingForPayment(false);
    }, 13000);
  };

  // Cleanup timer on unmount or dialog close
  useEffect(() => {
    return () => {
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current);
      }
    };
  }, []);

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Clear timer when dialog is closed
      if (waitingTimerRef.current) {
        clearTimeout(waitingTimerRef.current);
      }
      setIsWaitingForPayment(false);
    }
    setShowPaymentDialog(open);
  };

  const handlePaymentConfirmation = async () => {
    if (!user || !selectedPlan) return;
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      toast({ title: "Phone Required", description: "Enter valid phone number", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("payment_requests" as any).insert({
        user_id: user.id, user_email: user.email, user_name: userName || user.email?.split('@')[0],
        phone_number: phoneNumber, plan_name: selectedPlan.name, plan_type: selectedPlan.id,
        billing_cycle: billingCycle, amount: selectedPlan.price, status: "pending",
      });
      if (error) throw error;
      setPaymentSubmitted(true);
      toast({ title: "Submitted!", description: "Plan will be activated within 24 hours." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  const scrollToCard = (index: number) => {
    setActiveCard(index);
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = container.offsetWidth * 0.82;
      const scrollPosition = index * (cardWidth + 16) - (container.offsetWidth - cardWidth) / 2;
      container.scrollTo({ left: Math.max(0, scrollPosition), behavior: 'smooth' });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const cardWidth = container.offsetWidth * 0.82;
      const newIndex = Math.round(container.scrollLeft / (cardWidth + 16));
      if (newIndex !== activeCard && newIndex >= 0 && newIndex < 3) setActiveCard(newIndex);
    }
  };

  const plans = [
    { name: "Basic", id: "basic", price: billingCycle === "monthly" ? PLAN_PRICES.basic.monthly : PLAN_PRICES.basic.yearly,
      period: billingCycle === "monthly" ? "/month" : "/year", description: "For individual owners",
      icon: Truck, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30",
      gradientFrom: "from-blue-500/5", popular: false, buttonText: "Get Basic",
      features: [{ text: "1 Vehicle", included: true }, { text: "10 Days Trip History", included: true },
        { text: "1 Month Dashboard View", included: true }, { text: "Add Entries (3 days back)", included: true },
        { text: "Basic Reports", included: true },
        { text: "AI Assistant", included: false }, { text: "Export Reports", included: false },
        { text: "Priority Support", included: false }] },
    { name: "Standard", id: "standard", price: billingCycle === "monthly" ? PLAN_PRICES.standard.monthly : PLAN_PRICES.standard.yearly,
      period: billingCycle === "monthly" ? "/month" : "/year", description: "For growing businesses",
      icon: Zap, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/40",
      gradientFrom: "from-primary/5", popular: true, buttonText: "Get Standard",
      features: [{ text: "5 Vehicles", included: true }, { text: "90 Days Trip History", included: true },
        { text: "6 Month Dashboard View", included: true }, { text: "Add Entries (7 days back)", included: true },
        { text: "Full Reports", included: true },
        { text: "AI Assistant (30/day)", included: true }, { text: "Export Reports", included: false },
        { text: "Priority Support", included: false }] },
    { name: "Ultra", id: "ultra", price: billingCycle === "monthly" ? PLAN_PRICES.ultra.monthly : PLAN_PRICES.ultra.yearly,
      period: billingCycle === "monthly" ? "/month" : "/year", description: "For fleet owners",
      icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/40",
      gradientFrom: "from-amber-500/5", popular: false, buttonText: "Get Ultra",
      features: [{ text: "Unlimited Vehicles", included: true }, { text: "Unlimited Trip History", included: true },
        { text: "1yr, 5yr & All-time View", included: true }, { text: "Add Entries (30 days back)", included: true },
        { text: "Full Reports", included: true },
        { text: "AI Assistant (Higher limits)", included: true }, { text: "Export (PDF/Excel)", included: true },
        { text: "Priority Support", included: true }] },
  ];

  const faqs = [
    { question: "What happens after my 15-day free trial ends?", answer: "After your free trial ends, you'll need to choose a subscription plan to continue using TransportPro. Your data will be safely stored." },
    { question: "Can I change my plan later?", answer: "Yes! You can upgrade your plan at any time with immediate access to new features." },
    { question: "What is the AI Assistant?", answer: "The AI Assistant helps analyze your data, provides insights on fuel efficiency, and suggests cost-saving tips. Standard: 30 chats/day, Ultra: 100 chats/day (higher limits)." },
    { question: "How does the vehicle limit work?", answer: "Basic: 1 vehicle, Standard: 5 vehicles, Ultra: unlimited vehicles." },
    { question: "What payment methods do you accept?", answer: "We accept UPI payments (Google Pay, PhonePe, Paytm, BHIM, etc.)." },
    { question: "What is your refund policy?", answer: "Due to the digital nature of our services, all payments are final and non-refundable. Please use the 15-day free trial to explore all features before purchasing." },
    { question: "How do I activate my plan after payment?", answer: "Click 'I've Paid' button and enter your details. Our team will verify and activate within 24 hours." },
    { question: "What's included in Priority Support?", answer: "Faster response times, dedicated support channels, and direct access to our technical team (Ultra plan only)." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pt-6 pb-8 px-3 md:py-8 md:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back to Dashboard - Top */}
        {plan !== "expired" && (
          <div className="mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Back to Dashboard
            </Button>
          </div>
        )}
        
        <div className="text-center mb-5 mt-2">
          <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
            {isTrialActive ? `🎉 ${trialDaysLeft} days left in your free trial` : "Select a plan to continue"}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 mb-6">
          <button onClick={() => setBillingCycle("monthly")} className={cn("px-5 py-2.5 rounded-full text-sm font-medium transition-all", billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted/60 text-muted-foreground hover:bg-muted")}>Monthly</button>
          <button onClick={() => setBillingCycle("yearly")} className={cn("px-5 py-2.5 rounded-full text-sm font-medium transition-all flex items-center gap-2", billingCycle === "yearly" ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted/60 text-muted-foreground hover:bg-muted")}>
            Yearly<span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500 text-white font-bold">20% OFF</span>
          </button>
        </div>
        <div className="flex justify-center gap-2 mb-4 md:hidden">
          {plans.map((_, i) => (<button key={i} onClick={() => scrollToCard(i)} className={cn("h-2 rounded-full transition-all", activeCard === i ? "bg-primary w-8" : "bg-muted w-2")} />))}
        </div>
        <div ref={scrollRef} className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-3 px-3 pt-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} onScroll={handleScroll}>
          {plans.map((p) => {
            const Icon = p.icon; const isCurrent = plan === p.id;
            return (
              <Card key={p.id} className={cn("flex-shrink-0 w-[82vw] max-w-[320px] snap-center relative overflow-visible", `bg-gradient-to-b ${p.gradientFrom} to-card`, p.popular ? "ring-2 ring-primary shadow-xl" : "shadow-lg", p.borderColor)}>
                {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 text-xs shadow-lg z-20"><Star className="h-3 w-3 mr-1 fill-current" />Most Popular</Badge>}
                <CardHeader className="text-center pb-2 pt-8">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg", p.bgColor)}><Icon className={cn("h-7 w-7", p.color)} /></div>
                  <CardTitle className="text-xl">{p.name}</CardTitle>
                  <CardDescription className="text-xs">{p.description}</CardDescription>
                  <div className="mt-3"><span className="text-4xl font-bold">₹{p.price.toLocaleString()}</span><span className="text-muted-foreground text-sm">{p.period}</span></div>
                  {billingCycle === "yearly" && <p className="text-xs text-green-600 font-medium mt-1">Save 20% with yearly billing</p>}
                </CardHeader>
                <CardContent className="space-y-3 pb-6">
                  <ul className="space-y-2">{p.features.map((f, i) => (<li key={i} className="flex items-start gap-2">{f.included ? <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="h-3 w-3 text-green-600" /></div> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5"><X className="h-3 w-3 text-muted-foreground" /></div>}<span className={cn("text-sm", !f.included && "text-muted-foreground line-through")}>{f.text}</span></li>))}</ul>
                  <Button className={cn("w-full mt-4 h-12 font-semibold text-base", p.popular && "shadow-lg")} variant={p.popular ? "default" : "outline"} onClick={() => handleSelectPlan(p.name, p.id, p.price)} disabled={isCurrent}>{isCurrent ? "Current Plan" : p.buttonText}</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mb-6 md:hidden flex items-center justify-center gap-1"><ChevronLeft className="h-3 w-3" />Swipe to see all plans<ChevronRight className="h-3 w-3" /></p>
        <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 pt-4">
          {plans.map((p) => {
            const Icon = p.icon; const isCurrent = plan === p.id;
            return (
              <Card key={p.id} className={cn("relative overflow-visible hover:shadow-2xl", `bg-gradient-to-b ${p.gradientFrom} to-card`, p.popular && "ring-2 ring-primary shadow-xl scale-[1.03]", p.borderColor)}>
                {p.popular && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 shadow-lg z-20"><Star className="h-3 w-3 mr-1 fill-current" />Most Popular</Badge>}
                <CardHeader className="text-center pb-4 pt-8">
                  <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg", p.bgColor)}><Icon className={cn("h-8 w-8", p.color)} /></div>
                  <CardTitle className="text-2xl">{p.name}</CardTitle>
                  <CardDescription>{p.description}</CardDescription>
                  <div className="mt-4"><span className="text-5xl font-bold">₹{p.price.toLocaleString()}</span><span className="text-muted-foreground">{p.period}</span></div>
                  {billingCycle === "yearly" && <p className="text-sm text-green-600 font-medium mt-2">🎉 Save 20% with yearly billing</p>}
                </CardHeader>
                <CardContent className="space-y-4 pb-8">
                  <ul className="space-y-3">{p.features.map((f, i) => (<li key={i} className="flex items-start gap-3">{f.included ? <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5"><Check className="h-3 w-3 text-green-600" /></div> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5"><X className="h-3 w-3 text-muted-foreground" /></div>}<span className={cn("text-sm", !f.included && "text-muted-foreground line-through")}>{f.text}</span></li>))}</ul>
                  <Button className={cn("w-full mt-6 h-12 font-semibold text-base", p.popular && "shadow-lg")} variant={p.popular ? "default" : "outline"} onClick={() => handleSelectPlan(p.name, p.id, p.price)} disabled={isCurrent}>{isCurrent ? "Current Plan" : p.buttonText}</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="p-4 bg-card rounded-xl border text-center hover:shadow-md"><Truck className="h-7 w-7 mx-auto mb-2 text-primary" /><p className="text-sm font-medium">Multi-Vehicle</p><p className="text-xs text-muted-foreground">Track your fleet</p></div>
          <div className="p-4 bg-card rounded-xl border text-center hover:shadow-md"><Clock className="h-7 w-7 mx-auto mb-2 text-primary" /><p className="text-sm font-medium">Full History</p><p className="text-xs text-muted-foreground">All your data</p></div>
          <div className="p-4 bg-card rounded-xl border text-center hover:shadow-md"><Bot className="h-7 w-7 mx-auto mb-2 text-primary" /><p className="text-sm font-medium">AI Assistant</p><p className="text-xs text-muted-foreground">Smart insights</p></div>
          <div className="p-4 bg-card rounded-xl border text-center hover:shadow-md"><FileText className="h-7 w-7 mx-auto mb-2 text-primary" /><p className="text-sm font-medium">Export Reports</p><p className="text-xs text-muted-foreground">PDF & Excel</p></div>
        </div>
        <div className="bg-card rounded-2xl border p-4 md:p-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (<AccordionItem key={i} value={`item-${i}`}><AccordionTrigger className="text-left text-sm md:text-base hover:no-underline">{f.question}</AccordionTrigger><AccordionContent className="text-muted-foreground text-sm">{f.answer}</AccordionContent></AccordionItem>))}
          </Accordion>
        </div>
        <div className="text-center text-xs text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg"><p>💳 Secure UPI Payment • Instant Processing • 24hr Activation</p></div>
      </div>
      <Dialog open={showPaymentDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentSubmitted ? (
                <><CheckCircle2 className="h-6 w-6 text-green-500" />Payment Request Submitted</>
              ) : isWaitingForPayment ? (
                <>💳 Complete Payment in UPI App</>
              ) : (
                <>💳 Complete Your Payment</>
              )}
            </DialogTitle>
            <DialogDescription>
              {paymentSubmitted 
                ? "Our team will verify and activate your plan within 24 hours." 
                : isWaitingForPayment 
                  ? `Pay ₹${selectedPlan?.price.toLocaleString()} for ${selectedPlan?.name} plan`
                  : `Pay ₹${selectedPlan?.price.toLocaleString()} for ${selectedPlan?.name} plan (${billingCycle})`
              }
            </DialogDescription>
          </DialogHeader>
          
          {/* Payment Submitted Success State */}
          {paymentSubmitted ? (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">Thank you for your payment!</p>
                <p className="text-xs text-muted-foreground mt-1">You'll receive confirmation once activated.</p>
              </div>
              <Button className="w-full" onClick={() => setShowPaymentDialog(false)}>Done</Button>
            </div>
          ) : isWaitingForPayment ? (
            /* Waiting for Payment Animation */
            <div className="space-y-6 py-6">
              <div className="flex flex-col items-center justify-center">
                {/* Animated Phone with UPI */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
                    <Smartphone className="h-10 w-10 text-primary" />
                  </div>
                  {/* Pulsing ring animation */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                </div>
                
                <div className="mt-6 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-base font-medium">Waiting for Payment...</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Complete the payment in your UPI app</p>
                </div>
                
                {/* UPI ID Display */}
                <div className="mt-4 bg-muted/50 px-4 py-2 rounded-lg">
                  <p className="text-xs text-muted-foreground">Pay to UPI ID:</p>
                  <p className="font-mono text-sm font-medium">{UPI_ID}</p>
                </div>
                
                {/* Amount Display */}
                <div className="mt-3 text-center">
                  <p className="text-2xl font-bold text-primary">₹{selectedPlan?.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{selectedPlan?.name} Plan • {billingCycle}</p>
                </div>
              </div>
              
              {/* Skip waiting button */}
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground" 
                onClick={() => setIsWaitingForPayment(false)}
              >
                Already paid? Click here
              </Button>
            </div>
          ) : (
            /* I've Paid Form */
            <div className="space-y-4 py-2">
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Payment Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-xs">
                  <li>UPI app opened with amount pre-filled</li>
                  <li>Pay to: <span className="font-mono text-foreground">{UPI_ID}</span></li>
                  <li>Fill details below and click "I've Paid"</li>
                </ol>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-sm">Your Name</Label>
                  <Input id="name" placeholder="Enter your name" value={userName} onChange={(e) => setUserName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="Enter phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} maxLength={10} />
                  <p className="text-xs text-muted-foreground">For payment verification</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handlePaymentConfirmation} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "I've Paid"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
