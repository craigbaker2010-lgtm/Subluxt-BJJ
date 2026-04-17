import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import subluxtLogo from "@assets/subluxt-logo.jpg";

export default function LoginPage() {
  const { login, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("demo@subluxt.com");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);

  if (user) { navigate("/"); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left: Logo Hero ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center">
        {/* Full-bleed logo background */}
        <img
          src={subluxtLogo}
          alt="Subluxt Jiu Jitsu"
          className="absolute inset-0 w-full h-full object-cover object-center scale-110"
          style={{ filter: "brightness(0.45)" }}
        />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Centered logo + text on top */}
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <h1 className="text-5xl font-black tracking-widest text-white uppercase mb-3"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.2em" }}>
            SUBLUXT
          </h1>
          <p className="text-lg text-white/70 tracking-widest uppercase font-medium">
            Jiu&#8202;·&#8202;Jitsu
          </p>
          <div className="mt-8 w-16 h-0.5 bg-primary rounded-full" />
          <p className="mt-6 text-white/50 text-sm max-w-xs leading-relaxed">
            Train smart. Roll hard. Track every session.
          </p>
        </div>
      </div>

      {/* ── Right: Sign-in form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo (only shows on small screens) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img
              src={subluxtLogo}
              alt="Subluxt Jiu Jitsu"
              className="w-28 h-28 object-contain mb-4 drop-shadow-xl"
            />
            <h1 className="text-2xl font-black tracking-widest text-foreground uppercase">SUBLUXT</h1>
            <p className="text-muted-foreground text-xs tracking-widest uppercase mt-1">Jiu · Jitsu</p>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to access your training library.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                data-testid="input-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign in
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-border space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              Demo account pre-filled — just click Sign in
            </div>
            <p className="text-sm text-muted-foreground">
              New to Subluxt?{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
