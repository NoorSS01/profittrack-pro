import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { Layout } from "./components/Layout";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { ChatProvider } from "./contexts/ChatContext";
import { ScrollToTop } from "./components/ScrollToTop";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Vehicles from "./pages/Vehicles";
import DailyEntry from "./pages/DailyEntry";
import Reports from "./pages/Reports";
import TripHistory from "./pages/TripHistory";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import Account from "./pages/Account";
import Legal from "./pages/Legal";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <ChatProvider>
              <ScrollToTop />
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/pricing" element={
                  <ProtectedRoute>
                    <Pricing />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/vehicles"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <Vehicles />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/daily-entry"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <DailyEntry />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <Reports />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/trip-history"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <TripHistory />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <Settings />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <Account />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/legal/:page"
                  element={
                    <ProtectedRoute>
                      <SubscriptionGuard>
                        <Layout>
                          <Legal />
                        </Layout>
                      </SubscriptionGuard>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </ChatProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
