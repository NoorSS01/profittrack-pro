import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { MissingEntriesModal } from "./MissingEntriesModal";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [missingEntriesChecked, setMissingEntriesChecked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Reset check when user changes
  useEffect(() => {
    if (user) {
      setMissingEntriesChecked(false);
    }
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show missing entries modal and block access until complete
  if (!missingEntriesChecked) {
    return (
      <MissingEntriesModal onComplete={() => setMissingEntriesChecked(true)} />
    );
  }

  return <>{children}</>;
};
