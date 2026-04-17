import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import subluxtLogo from "@assets/subluxt-logo.jpg";

export default function RegisterPage() {
  const { register, user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) { navigate("/"); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await register(email, name, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left: Logo Hero ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col items-center justify-center">
        <img
          src={subluxtLogo}
          alt="Subluxt Jiu Jitsu"
          className="absolute inset-0 w-full h-full object-cover object-center scale-110"
          style={{ filter: "brightness(0.45)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

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

      {/* ── Right: Register form ── */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img
              src={subluxtLogo}
              alt="Subluxt Jiu Jitsu"
              className="w-28 h-28 object-contain mb-4 drop-shadow-xl"
            />
            <h1 className="text-2xl font-black tracking-widest text-foreground uppercase">SUBLUXT</h1>
            <p className="text-muted-foreground text-xs tracking-widest uppercase mt-1">Jiu · Jitsu</p>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-1">Create your account</h2>
          <p className="text-muted-foreground text-sm mb-6">Start your 7-day free trial. No credit card needed.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="John Silva"
                required
                data-testid="input-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
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
                placeholder="Min 6 characters"
                required
                data-testid="input-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Start free trial
            </Button>
          </form>

          <p className="text-sm text-muted-foreground mt-5 pt-5 border-t border-border">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
