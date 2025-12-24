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
  Loader2, Search, RefreshCw, Shield, Truck, Calendar
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
      navigate("/");
      return;
    }
    if (ADMIN_EMAILS.includes(user.email)) {
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
      // Use raw SQL query via rpc or direct fetch since table isn't in types
      const { data, error } = await supabase
        .from("payment_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPaymentRequests((data as unknown as PaymentRequest[]) || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const [usersRes, vehiclesRes, entriesRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("vehicles").select("id", { count: "exact" }),
        supabase.from("daily_entries").select("id", { count: "exact" }),
      ]);
      
      // Fetch payments separately
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
      // Update payment request status
      const { error: paymentError } = await supabase
        .from("payment_requests" as any)
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id })
        .eq("id", request.id);
      if (paymentError) throw paymentError;

      // Calculate subscription end date
      const endDate = new Date();
      if (request.billing_cycle === "yearly") {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Update user's subscription using raw update
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

  const filteredRequests = paymentRequests.filter(r => 
    r.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone_number?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">Manage payments and view analytics</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => Promise.all([fetchPaymentRequests(), fetchAnalytics()])}>
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card><CardContent className="p-4 text-center">
            <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{analytics.totalUsers}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Truck className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{analytics.totalVehicles}</p>
            <p className="text-xs text-muted-foreground">Vehicles</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Calendar className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{analytics.totalEntries}</p>
            <p className="text-xs text-muted-foreground">Entries</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{analytics.pendingPayments}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{analytics.approvedPayments}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">₹{analytics.totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent></Card>
        </div>

        {/* Payment Requests */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Requests
                </CardTitle>
                <CardDescription>Manage subscription payment requests</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by email, name, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="mb-4">
                <TabsTrigger value="pending">Pending ({paymentRequests.filter(r => r.status === "pending").length})</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              {["pending", "approved", "rejected", "all"].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-3">
                  {filteredRequests
                    .filter(r => tab === "all" || r.status === tab)
                    .map(request => (
                      <div key={request.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{request.user_name || "Unknown"}</span>
                              <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                                {request.status}
                              </Badge>
                              <Badge variant="outline">{request.plan_name}</Badge>
                              <Badge variant="outline" className="text-xs">{request.billing_cycle}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{request.user_email}</p>
                            <p className="text-sm text-muted-foreground">📱 {request.phone_number || "No phone"}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>💰 ₹{request.amount.toLocaleString()}</span>
                              <span>📅 {format(new Date(request.created_at), "dd MMM yyyy, hh:mm a")}</span>
                            </div>
                          </div>
                          {request.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleReject(request)} disabled={processingId === request.id}>
                                {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="h-4 w-4 mr-1" />Reject</>}
                              </Button>
                              <Button size="sm" onClick={() => handleApprove(request)} disabled={processingId === request.id}>
                                {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" />Approve</>}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {filteredRequests.filter(r => tab === "all" || r.status === tab).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No {tab} payment requests</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate("/")}>← Back to Dashboard</Button>
        </div>
      </div>
    </div>
  );
};

export default Admin;
