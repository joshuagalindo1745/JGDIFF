import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Hexagon } from "lucide-react";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Hexagon className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
