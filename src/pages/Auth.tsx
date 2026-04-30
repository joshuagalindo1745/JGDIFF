import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Hexagon, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(100),
});

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/matchup");
  }, [user, navigate]);

  const handleSubmit = async (mode: "signin" | "signup") => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/matchup` },
        });
        if (error) throw error;
        toast.success("Account summoned! Check your email to verify.");
      } else {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success("Welcome back, summoner.");
        navigate("/matchup");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/matchup",
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="w-full max-w-md hex-border rounded-lg p-8 animate-rise">
        <div className="flex flex-col items-center mb-8">
          <Hexagon className="h-12 w-12 text-primary glow-gold rounded-full mb-3 animate-glow-pulse" />
          <h1 className="font-display text-3xl tracking-widest gold-text">RIFT ORACLE</h1>
          <p className="text-sm text-muted-foreground mt-1 tracking-wide">Predict your fate on the Rift</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin" className="font-display tracking-wider">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="font-display tracking-wider">Sign Up</TabsTrigger>
          </TabsList>

          {(["signin", "signup"] as const).map((mode) => (
            <TabsContent key={mode} value={mode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${mode}-email`} className="font-display tracking-wider text-xs uppercase">Email</Label>
                <Input id={`${mode}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="summoner@rift.gg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${mode}-pass`} className="font-display tracking-wider text-xs uppercase">Password</Label>
                <Input id={`${mode}-pass`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button onClick={() => handleSubmit(mode)} disabled={loading} className="w-full bg-gradient-gold text-primary-foreground hover:opacity-90 font-display tracking-widest shadow-gold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Enter the Rift" : "Begin Journey"}
              </Button>
            </TabsContent>
          ))}
        </Tabs>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground font-display tracking-widest">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" onClick={handleGoogle} disabled={loading} className="w-full border-secondary/40 hover:border-secondary hover:bg-secondary/10 font-display tracking-wider">
          <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z"/></svg>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}
