import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Mail, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";

// Google Icon Component
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  // Handle OAuth callback and check for existing session
  useEffect(() => {
    const handleAuthCallback = async () => {
      console.log("Auth callback - checking session...");
      console.log("Current URL:", window.location.href);
      console.log("Hash:", window.location.hash);
      console.log("Search:", window.location.search);
      
      // Check if we have hash params (OAuth callback) - handle both # and #/ formats
      const hash = window.location.hash;
      let hashParams: URLSearchParams;
      
      if (hash.startsWith('#/')) {
        // Handle hash router format: #/access_token=...
        hashParams = new URLSearchParams(hash.substring(2));
      } else if (hash.startsWith('#')) {
        // Handle standard format: #access_token=...
        hashParams = new URLSearchParams(hash.substring(1));
      } else {
        hashParams = new URLSearchParams('');
      }
      
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const errorFromHash = hashParams.get('error');
      const errorDescFromHash = hashParams.get('error_description');
      
      // Also check URL params for error (query string)
      const error = searchParams.get('error') || errorFromHash;
      const errorDescription = searchParams.get('error_description') || errorDescFromHash;
      
      console.log("Access token found:", !!accessToken);
      console.log("Refresh token found:", !!refreshToken);
      
      if (error) {
        console.error("OAuth Error:", error, errorDescription);
        toast({
          title: "Authentication Failed",
          description: errorDescription || "Failed to sign in with Google. Please try again.",
          variant: "destructive",
        });
        // Clear the URL
        window.history.replaceState(null, '', window.location.pathname);
        setCheckingSession(false);
        return;
      }

      if (accessToken && refreshToken) {
        // We have tokens from OAuth callback, set the session
        console.log("Setting session with tokens...");
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            console.error("Session Error:", sessionError);
            toast({
              title: "Session Error",
              description: sessionError.message || "Failed to establish session. Please try again.",
              variant: "destructive",
            });
          } else if (data.session) {
            console.log("Session established successfully!");
            // Clear the hash from URL
            window.history.replaceState(null, '', window.location.pathname);
            navigate("/");
            return;
          }
        } catch (err) {
          console.error("Auth callback error:", err);
          toast({
            title: "Error",
            description: "An unexpected error occurred. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        // No tokens in URL, check if there's an existing session
        console.log("No tokens in URL, checking existing session...");
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("Existing session found, redirecting...");
            navigate("/");
            return;
          }
        } catch (err) {
          console.error("Error checking session:", err);
        }
      }
      
      setCheckingSession(false);
    };

    handleAuthCallback();
  }, [searchParams, navigate, toast]);

  useEffect(() => {
    if (user && !checkingSession) {
      navigate("/");
    }
  }, [user, navigate, checkingSession]);

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      // Build the redirect URL carefully for both desktop and mobile
      const origin = window.location.origin;
      const pathname = window.location.pathname;
      
      // Determine the correct redirect URL
      let redirectUrl = origin;
      
      // If deployed to a subdirectory (like /dist/), include it
      if (pathname.includes('/dist')) {
        redirectUrl = `${origin}/dist/`;
      } else {
        redirectUrl = `${origin}/`;
      }
      
      console.log("Google Auth - Starting OAuth flow");
      console.log("Origin:", origin);
      console.log("Pathname:", pathname);
      console.log("Redirect URL:", redirectUrl);
      console.log("User Agent:", navigator.userAgent);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error("Google OAuth Error:", error);
        throw error;
      }
      
      console.log("OAuth initiated, URL:", data?.url);
      
      // The browser should redirect, but if it doesn't after a few seconds, show error
      setTimeout(() => {
        if (googleLoading) {
          setGoogleLoading(false);
          toast({
            title: "Redirect Issue",
            description: "Please try again or use email/password to sign in.",
            variant: "destructive",
          });
        }
      }, 10000);
      
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        toast({
          title: "Account created!",
          description: "You can now log in with your credentials.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during authentication.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session from OAuth callback
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-4 rounded-full">
              <Truck className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold">TransportPro</CardTitle>
            <CardDescription className="text-base mt-2">
              {isLogin ? "Welcome back! Sign in to continue" : "Create your account to get started"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : isLogin ? "Sign In" : "Create Account"}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-medium gap-3"
              onClick={handleGoogleAuth}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  Continue with Google
                </>
              )}
            </Button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:underline text-sm font-medium"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
