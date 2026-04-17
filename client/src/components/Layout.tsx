import { Link, useLocation } from "wouter";
import subluxtLogo from "@assets/subluxt-logo.jpg";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarDays, BarChart3, CreditCard, LogOut, LayoutDashboard, Menu, X, ShoppingBag } from "lucide-react";
import { useState } from "react";

const BELT_COLORS: Record<string, string> = {
  white: "bg-slate-100 text-slate-900",
  blue: "bg-blue-500 text-white",
  purple: "bg-purple-500 text-white",
  brown: "bg-amber-700 text-white",
  black: "bg-slate-900 text-white border border-slate-600",
};

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/progress", label: "Progress", Icon: BarChart3 },
  { href: "/shop", label: "Shop", Icon: ShoppingBag },
  { href: "/subscription", label: "Subscription", Icon: CreditCard },
];

// Belt stripe dots for banner
function BeltStripes({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-6 rounded-sm"
          style={{ background: "hsl(var(--accent))", opacity: 0.9 }}
        />
      ))}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const beltClass = BELT_COLORS[user?.belt || "white"];

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── Compact Top Nav: links only ─────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-sidebar-background/98 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 h-11 max-w-7xl mx-auto">

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link key={href} href={href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid={`nav-${label.toLowerCase()}`}
                    className={`gap-1.5 h-8 text-xs font-medium tracking-wide ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Mobile: site name only */}
          <div className="md:hidden text-xs font-bold tracking-widest uppercase text-foreground/60"
            style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            SUBLUXT
          </div>

          <div className="flex items-center gap-2">
            {/* User avatar/menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8 pr-2" data-testid="user-menu">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-bold">
                      {user?.avatarInitials || user?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-[11px] font-semibold text-foreground leading-tight">{user?.name}</div>
                    <Badge variant="secondary" className={`text-[9px] h-3.5 px-1 ${beltClass} capitalize`}>
                      {user?.belt}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge className={`text-[10px] h-4 px-1.5 ${beltClass} capitalize`}>{user?.belt} belt</Badge>
                    {Array.from({ length: user?.stripes || 0 }).map((_, i) => (
                      <div key={i} className="belt-stripe scale-75" />
                    ))}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/subscription">
                    <CreditCard className="w-4 h-4 mr-2" /> Subscription
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive" data-testid="btn-logout">
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile hamburger */}
            <Button
              variant="ghost" size="icon" className="md:hidden w-8 h-8"
              onClick={() => setMobileOpen(o => !o)}
              data-testid="btn-mobile-menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-sidebar-background px-4 py-3 flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const isActive = href === "/" ? location === "/" : location.startsWith(href);
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start gap-2 ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground"}`}
                    data-testid={`mobile-nav-${label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* ── Full-Width Hero Banner ────────────────────────────────── */}
      <div
        className="w-full relative overflow-hidden flex-shrink-0"
        style={{
          height: "132px",
          background: "linear-gradient(135deg, hsl(214 52% 18%) 0%, hsl(216 18% 10%) 60%, hsl(216 18% 9%) 100%)",
          borderBottom: "1px solid hsl(214 52% 28% / 0.5)",
        }}
      >
        {/* Red gradient wash from left */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to right, hsl(5 72% 20% / 0.45) 0%, hsl(5 72% 10% / 0.1) 45%, transparent 70%)",
          }}
        />

        {/* Subtle diagonal texture lines */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(135deg, hsl(var(--accent)) 0px, hsl(var(--accent)) 1px, transparent 1px, transparent 24px)",
          }}
        />

        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-center gap-5">
          {/* Logo — left anchor, full banner height with generous padding */}
          <Link href="/" className="flex-shrink-0 block" style={{ height: "100px" }}>
            <img
              src={subluxtLogo}
              alt="Subluxt Jiu Jitsu"
              style={{
                height: "100px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 16px rgba(192,40,26,0.55)) drop-shadow(0 0 32px rgba(192,40,26,0.2))",
              }}
            />
          </Link>

          {/* Crimson vertical divider */}
          <div
            className="flex-shrink-0 self-stretch my-4 w-px"
            style={{ background: "linear-gradient(to bottom, transparent, hsl(5 72% 44% / 0.7) 30%, hsl(5 72% 44% / 0.7) 70%, transparent)" }}
          />

          {/* Brand wordmark */}
          <div className="flex flex-col justify-center min-w-0">
            <div
              className="font-black uppercase leading-none"
              style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                letterSpacing: "0.08em",
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              }}
            >
              <span style={{ color: "#ffffff" }}>SUBLUXT </span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>JIU-JITSU</span>
            </div>
            <div
              className="uppercase mt-1.5"
              style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: "clamp(0.55rem, 1vw, 0.7rem)",
                letterSpacing: "0.22em",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 500,
              }}
            >
              Track &middot; Train &middot; Improve
            </div>
          </div>

          {/* Right: belt info */}
          <div className="ml-auto flex-shrink-0 flex flex-col items-end gap-1.5">
            <div className="text-right">
              <div
                className="text-xs font-semibold text-foreground/80 uppercase tracking-wide"
                style={{ fontFamily: "'Cabinet Grotesk', sans-serif", letterSpacing: "0.1em" }}
              >
                {user?.name}
              </div>
              <Badge className={`text-[10px] h-4 px-2 mt-0.5 capitalize ${beltClass}`}>
                {user?.belt} Belt
              </Badge>
            </div>
            {(user?.stripes ?? 0) > 0 && (
              <BeltStripes count={user?.stripes ?? 0} />
            )}
          </div>
        </div>
      </div>

      {/* ── Page content ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground">
        © 2026 Subluxt Jiu Jitsu · Train smart, roll hard
      </footer>
    </div>
  );
}
