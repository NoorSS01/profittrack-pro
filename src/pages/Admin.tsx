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
import { format, addMonths, addYears } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";
import { 
  Users, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle, 
  Loader2, Search, RefreshCw, Shield, Truck, Calendar, LogOut, 
  Mail, Home
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

// Admin emails
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


type AdminTab = 'dashboard' | 'payments' | 'users';

const Admin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsers: 0, totalVehicles: 0, totalEntries: 0,
    pendingPayments: 0, approvedPayments: 0, totalRevenue: 0
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; request: PaymentRequest | null; action: 'approve' | 'reject' }>({
    open: false, request: null, action: 'approve'
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);

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
    
    if (isUserAdmin) {
      setIsAdmin(true);
      await refreshAllData();
    } else {
      toast({ title: "Access Denied", description: "You don't have admin access.", variant: "destructive" });
      navigate("/");
    }
    setLoading(false);
  };

  const refreshAllData = async () => {
    setRefreshing(true);
    await Promise.all([fetchPaymentRequests(), fetchAnalytics(), fetchAllUsers()]);
    setRefreshing(false);
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, created_at, subscription_plan, subscription_end_date")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchPaymentRequests = async () => {
    try {
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
      const startDate = new Date();
      let endDate: Date;
      
      if (request.billing_cycle === "yearly") {
        endDate = addYears(startDate, 1);
      } else {
        endDate = addMonths(startDate, 1);
      }

      const { error: paymentError } = await supabase
        .from("payment_requests" as any)
        .update({ 
          status: "approved", 
          approved_at: new Date().toISOString(), 
          approved_by: user?.id 
        })
        .eq("id", request.id);
      
      if (paymentError) throw new Error(`Failed to update payment: ${paymentError.message}`);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          subscription_plan: request.plan_type,
          subscription_end_date: endDate.toISOString()
        } as any)
        .eq("id", request.user_id);
      
      if (profileError) {
        await supabase
          .from("payment_requests" as any)
          .update({ status: "pending", approved_at: null, approved_by: null })
          .eq("id", request.id);
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }

      toast({ 
        title: "✅ Approved!", 
        description: `${request.user_name || request.user_email}'s ${request.plan_name} plan activated until ${format(endDate, "dd MMM yyyy")}.` 
      });
      
      await refreshAllData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
      setConfirmDialog({ open: false, request: null, action: 'approve' });
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
      setConfirmDialog({ open: false, request: null, action: 'reject' });
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


  // Bottom navigation items for mobile
  const navItems = [
    { id: 'dashboard' as AdminTab, icon: Home, label: 'Home' },
    { id: 'payments' as AdminTab, icon: CreditCard, label: 'Pay' },
    { id: 'users' as AdminTab, icon: Users, label: 'Users' },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-card/95 backdrop-blur-md border-b border-border/50 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-bold">Admin Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={refreshAllData} disabled={refreshing}>
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-destructive">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="hidden lg:flex sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refreshAllData} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-card/95 backdrop-blur-md border-t border-border/50 z-50 flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-1", isActive && "scale-110")} />
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
                {item.label}
              </span>
              {item.id === 'payments' && analytics.pendingPayments > 0 && (
                <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                  {analytics.pendingPayments}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <PullToRefresh onRefresh={refreshAllData} className="pt-14 lg:pt-0">
        <main className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          {/* Desktop Tabs */}
          <div className="hidden lg:block">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTab)}>
              <TabsList className="mb-6">
                <TabsTrigger value="dashboard" className="gap-2">
                  <Home className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="payments" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payments
                  {analytics.pendingPayments > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">{analytics.pendingPayments}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2">
                  <Users className="h-4 w-4" />
                  Users ({allUsers.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>


          {/* Dashboard Tab Content */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              {/* Analytics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Users className="h-7 w-7 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl lg:text-3xl font-bold">{analytics.totalUsers}</p>
                    <p className="text-xs text-muted-foreground">Total Users</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Truck className="h-7 w-7 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl lg:text-3xl font-bold">{analytics.totalVehicles}</p>
                    <p className="text-xs text-muted-foreground">Vehicles</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <Calendar className="h-7 w-7 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl lg:text-3xl font-bold">{analytics.totalEntries}</p>
                    <p className="text-xs text-muted-foreground">Entries</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow bg-amber-500/10 border-amber-500/30">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-7 w-7 mx-auto mb-2 text-amber-500" />
                    <p className="text-2xl lg:text-3xl font-bold text-amber-600">{analytics.pendingPayments}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow bg-green-500/10 border-green-500/30">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="h-7 w-7 mx-auto mb-2 text-green-500" />
                    <p className="text-2xl lg:text-3xl font-bold text-green-600">{analytics.approvedPayments}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow bg-primary/10 border-primary/30">
                  <CardContent className="p-4 text-center">
                    <TrendingUp className="h-7 w-7 mx-auto mb-2 text-primary" />
                    <p className="text-2xl lg:text-3xl font-bold text-primary">₹{analytics.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => setActiveTab('payments')}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Payments
                    {analytics.pendingPayments > 0 && (
                      <Badge variant="destructive" className="ml-2">{analytics.pendingPayments}</Badge>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('users')}>
                    <Users className="h-4 w-4 mr-2" />
                    View Users
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Payments Tab Content */}
          {activeTab === 'payments' && (
            <div className="space-y-4 animate-fade-in">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Requests
                      </CardTitle>
                      <CardDescription className="hidden sm:block">Manage subscription payments</CardDescription>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="pl-9 h-9" 
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="pending">
                    <TabsList className="mb-4 w-full justify-start overflow-x-auto">
                      <TabsTrigger value="pending" className="text-xs sm:text-sm">
                        Pending {analytics.pendingPayments > 0 && `(${analytics.pendingPayments})`}
                      </TabsTrigger>
                      <TabsTrigger value="approved" className="text-xs sm:text-sm">Approved</TabsTrigger>
                      <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejected</TabsTrigger>
                      <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
                    </TabsList>

                    {["pending", "approved", "rejected", "all"].map(tab => (
                      <TabsContent key={tab} value={tab} className="space-y-3 mt-0">
                        {filteredRequests
                          .filter(r => tab === "all" || r.status === tab)
                          .map(request => (
                            <div key={request.id} className="border rounded-xl p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold">{request.user_name || "Unknown"}</span>
                                    <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"} className="text-[10px]">
                                      {request.status.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className="text-xs">{request.plan_name}</Badge>
                                    <span className="text-sm font-bold text-primary">₹{request.amount.toLocaleString()}</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {request.user_email}</p>
                                    <p className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {format(new Date(request.created_at), "dd MMM yyyy")}</p>
                                  </div>
                                </div>
                                {request.status === "pending" && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 h-8"
                                      onClick={() => setConfirmDialog({ open: true, request, action: 'approve' })} 
                                      disabled={processingId === request.id}
                                    >
                                      {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4 mr-1" />Approve</>}
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="flex-1 sm:flex-none border-destructive text-destructive h-8"
                                      onClick={() => setConfirmDialog({ open: true, request, action: 'reject' })} 
                                      disabled={processingId === request.id}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" />Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        {filteredRequests.filter(r => tab === "all" || r.status === tab).length === 0 && (
                          <div className="text-center py-8">
                            <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">No {tab === "all" ? "" : tab} requests</p>
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          )}


          {/* Users Tab Content */}
          {activeTab === 'users' && (
            <div className="space-y-4 animate-fade-in">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        All Users ({allUsers.length})
                      </CardTitle>
                      <CardDescription className="hidden sm:block">View registered users and subscriptions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {allUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No users found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {allUsers.map(userItem => (
                        <div key={userItem.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate text-sm sm:text-base">
                                {userItem.full_name || 'No Name'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{userItem.email}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Joined: {format(new Date(userItem.created_at), "dd MMM yyyy")}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {userItem.subscription_plan ? (
                                <div className="space-y-1">
                                  <Badge className="capitalize text-xs">{userItem.subscription_plan}</Badge>
                                  {userItem.subscription_end_date && (
                                    <p className={cn(
                                      "text-[10px]",
                                      new Date(userItem.subscription_end_date) < new Date() 
                                        ? "text-destructive" 
                                        : "text-muted-foreground"
                                    )}>
                                      {new Date(userItem.subscription_end_date) < new Date() 
                                        ? 'Expired' 
                                        : `Exp: ${format(new Date(userItem.subscription_end_date), "dd MMM")}`}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Trial</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </PullToRefresh>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmDialog.action === 'approve' ? (
                <><CheckCircle2 className="h-5 w-5 text-green-500" /> Confirm Approval</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> Confirm Rejection</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'approve' ? (
                <>
                  Approve payment for <span className="font-semibold">{confirmDialog.request?.user_name || confirmDialog.request?.user_email}</span>?
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    <p>{confirmDialog.request?.plan_name} • ₹{confirmDialog.request?.amount.toLocaleString()}</p>
                  </div>
                </>
              ) : (
                <>Reject payment request from <span className="font-semibold">{confirmDialog.request?.user_name || confirmDialog.request?.user_email}</span>?</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmDialog.action === 'approve' ? "bg-green-600 hover:bg-green-700" : "bg-destructive"}
              onClick={() => {
                if (confirmDialog.request) {
                  confirmDialog.action === 'approve' ? handleApprove(confirmDialog.request) : handleReject(confirmDialog.request);
                }
              }}
            >
              {confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;