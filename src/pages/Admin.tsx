import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { 
  Users, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, 
  Loader2, Search, RefreshCw, Shield, Truck, Calendar, LogOut, Home
} from "lucide-react";

// Admin emails - add your email here
const ADMIN_EMAILS = ["mohammednoorsirasgi@gmail.com"];

interface PaymentRequest {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  phone_number: string | null;
  plan_name: string;
  plan_type: string;
  billing_cycle: string;
  amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Analytics {
  totalUsers: number;
  totalVehicles: number;
  totalEntries: number;
  pendingPayments: number;
  approvedPayments: number;
  totalRevenue: number;
}

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0, totalVehicles: 0, totalEntries: 0,
    pendingPayments: 0, approvedPayments: 0, totalRevenue: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user?.email) {
      setLoading(false);
      navigate("/auth");
      return;
    }
    
    const isUserAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    console.log("Checking admin access for:", user.email, "Is admin:", isUserAdmin);
    
    if (isUserAdmin) {
      setIsAdmin(true);
      await Promise.all([fetchPaymentRequests(), fetchAnalytics()]);
    } else {
      toast({ title: "Access Denied", description: "You don't have admin access.", variant: "destructive" });
      navigate("/");
    }
    setLoading(false);
  };

  const fetchPaymentRequests = async () => {
    try {
      console.log("Fetching payment requests...");
      const { data, error } = await supabase
        .from("payment_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching payments:", error);
        throw error;
      }
      
      console.log("Payment requests fetched:", data?.length || 0);
      setPaymentRequests((data as unknown as PaymentRequest[]) || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      toast({ title: "Error", description: "Failed to fetch payment requests: " + error.message, variant: "destructive" });
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [usersRes, vehiclesRes, entriesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("vehicles").select("id", { count: "exact" }),
        supabase.from("daily_entries").select("id", { count: "exact" }),
      ]);
      
      const { data: paymentsData } = await supabase
        .from("payment_requests" as any)
        .select("*");
      
      const payments = (paymentsData as unknown as PaymentRequest[]) || [];
      const pending = payments.filter(p => p.status === "pending").length;
      const approved = payments.filter(p => p.status === "approved");
      const revenue = approved.reduce((sum, p) => sum + (p.amount || 0), 0);

      setAnalytics({
        totalUsers: usersRes.count || 0,
        totalVehicles: vehiclesRes.count || 0,
        totalEntries: entriesRes.count || 0,
        pendingPayments: pending,
        approvedPayments: approved.length,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const handleApprove = async (request: PaymentRequest) => {
    setProcessingId(request.id);
    try {
      const { error: paymentError } = await supabase
        .from("payment_requests" as any)
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id })
        .eq("id", request.id);
      if (paymentError) throw paymentError;

      const endDate = new Date();
      if (request.billing_cycle === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          subscription_plan: request.plan_type,
          subscription_end_date: endDate.toISOString()
        } as any)
        .eq("id", request.user_id);
      if (profileError) throw profileError;

      toast({ title: "Approved!", description: `${request.user_name}'s ${request.plan_name} plan activated.` });
      await Promise.all([fetchPaymentRequests(), fetchAnalytics()]);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: PaymentRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from("payment_requests" as any)
        .update({ status: "rejected" })
        .eq("id", request.id);
      if (error) throw error;
      toast({ title: "Rejected", description: "Payment request has been rejected." });
      await fetchPaymentRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredRequests = paymentRequests.filter(r => 
    r.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone_number?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <Home className="h-4 w-4 mr-2" />
              User View
            </Button>
            <Button variant="outline" size="sm" onClick={() => Promise.all([fetchPaymentRequests(), fetchAnalytics()])}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-3xl font-bold">{analytics.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Truck className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold">{analytics.totalVehicles}</p>
              <p className="text-xs text-muted-foreground">Vehicles</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-3xl font-bold">{analytics.totalEntries}</p>
              <p className="text-xs text-muted-foreground">Entries</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <p className="text-3xl font-bold text-amber-600">{analytics.pendingPayments}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-3xl font-bold text-green-600">{analytics.approvedPayments}</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow bg-primary/10 border-primary/30">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-primary">₹{analytics.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Requests */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CreditCard className="h-6 w-6" />
                  Payment Requests
                </CardTitle>
                <CardDescription>Manage subscription payment requests from users</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by email, name, phone..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="pl-10" 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4 w-full justify-start">
                <TabsTrigger value="pending" className="gap-2">
                  Pending
                  {analytics.pendingPayments > 0 && (
                    <Badge variant="secondary" className="ml-1">{analytics.pendingPayments}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              {["pending", "approved", "rejected", "all"].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-3">
                  {filteredRequests
                    .filter(r => tab === "all" || r.status === tab)
                    .map(request => (
                      <div key={request.id} className="border rounded-xl p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-lg">{request.user_name || "Unknown User"}</span>
                              <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                                {request.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline" className="text-sm">{request.plan_name}</Badge>
                              <Badge variant="outline" className="text-sm">{request.billing_cycle}</Badge>
                              <span className="text-lg font-bold text-primary">₹{request.amount.toLocaleString()}</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>📧 {request.user_email}</p>
                              <p>📱 {request.phone_number || "No phone provided"}</p>
                              <p>📅 {format(new Date(request.created_at), "dd MMM yyyy, hh:mm a")}</p>
                            </div>
                          </div>
                          {request.status === "pending" && (
                            <div className="flex gap-2 md:flex-col">
                              <Button 
                                size="sm" 
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleApprove(request)} 
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleReject(request)} 
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {filteredRequests.filter(r => tab === "all" || r.status === tab).length === 0 && (
                    <div className="text-center py-12">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No {tab === "all" ? "" : tab} payment requests found</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
