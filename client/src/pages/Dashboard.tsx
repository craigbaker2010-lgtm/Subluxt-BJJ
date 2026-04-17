import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  CalendarDays, Clock, Star, Flame, TrendingUp, ChevronRight,
  Dumbbell, Trophy, Shield
} from "lucide-react";

const BELT_COLORS: Record<string, string> = {
  white: "bg-slate-100 text-slate-900",
  blue: "bg-blue-600 text-white",
  purple: "bg-purple-600 text-white",
  brown: "bg-amber-700 text-white",
  black: "bg-slate-900 text-white border border-slate-600",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  class: "Class", open_mat: "Open Mat", solo: "Solo Drilling", competition: "Competition"
};

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (!loading && !user) { navigate("/login"); return null; }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    enabled: !!user,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/sessions"],
    enabled: !!user,
  });

  const { data: trainingDays = [], isLoading: daysLoading } = useQuery({
    queryKey: ["/api/training-days"],
    enabled: !!user,
  });

  // Upcoming training days (from today forward)
  const today = new Date().toISOString().split("T")[0];
  const upcoming = (trainingDays as any[])
    .filter((d: any) => d.date >= today)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(0, 3);

  // Recent sessions
  const recentSessions = (sessions as any[])
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 4);

  const beltClass = BELT_COLORS[user?.belt || "white"];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const CATEGORY_CLASSES: Record<string, string> = {
    takedowns: "category-takedowns",
    guard: "category-guard",
    passing: "category-passing",
    submissions: "category-submissions",
    sweeps: "category-sweeps",
    defense: "category-defense",
    sparring: "category-sparring",
  };

  return (
    <Layout>
      {/* Welcome header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          {loading ? (
            <Skeleton className="h-7 w-40 mb-2" />
          ) : (
            <h1 className="text-xl font-bold text-foreground" data-testid="text-welcome">
              Oss, {user?.name?.split(" ")[0]}
            </h1>
          )}
          <p className="text-muted-foreground text-sm mt-0.5">Ready to roll? Here's your training overview.</p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Badge className={`${beltClass} capitalize text-xs px-2.5 py-1`}>
              {user.belt} belt
              {user.stripes > 0 && ` · ${user.stripes} stripe${user.stripes > 1 ? "s" : ""}`}
            </Badge>
          )}
          {user?.subscriptionStatus === "active" ? (
            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
              <Shield className="w-3 h-3 mr-1" /> {user.subscriptionPlan?.toUpperCase()} Plan
            </Badge>
          ) : (
            <Link href="/subscription">
              <Button size="sm" variant="outline" className="text-xs border-accent/50 text-accent">
                Upgrade Plan
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Sessions", value: statsLoading ? null : (stats as any)?.totalSessions ?? 0, icon: Dumbbell, color: "text-primary" },
          { label: "Mat Hours", value: statsLoading ? null : Math.round(((stats as any)?.totalMinutes ?? 0) / 60), icon: Clock, color: "text-blue-400", suffix: "h" },
          { label: "Avg Rating", value: statsLoading ? null : (stats as any)?.avgRating ?? 0, icon: Star, color: "text-accent", suffix: "/5" },
          { label: "Current Streak", value: statsLoading ? null : (stats as any)?.streak ?? 0, icon: Flame, color: "text-orange-400", suffix: "d" },
        ].map(({ label, value, icon: Icon, color, suffix }) => (
          <Card key={label} data-testid={`stat-${label.toLowerCase().replace(/ /g, "-")}`}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  {value === null ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {value}{suffix && <span className="text-base text-muted-foreground ml-0.5">{suffix}</span>}
                    </p>
                  )}
                </div>
                <Icon className={`w-5 h-5 ${color} mt-0.5`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming classes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Upcoming Classes
              </CardTitle>
              <Link href="/calendar">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  View calendar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {daysLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
            ) : upcoming.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No upcoming classes scheduled
              </div>
            ) : (
              upcoming.map((day: any) => (
                <Link key={day.id} href={`/training/${day.id}`}>
                  <div
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer border border-border hover-elevate"
                    data-testid={`upcoming-day-${day.id}`}
                  >
                    <div className="text-center min-w-10">
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">
                        {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="text-lg font-bold text-primary leading-tight">
                        {new Date(day.date + "T12:00:00").getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{day.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_CLASSES[day.category] || "bg-muted text-muted-foreground"}`}>
                          {day.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">{day.difficultyLevel}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent sessions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Recent Sessions
              </CardTitle>
              <Link href="/progress">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  Full history <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessionsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No sessions logged yet
                <div className="mt-2">
                  <Link href="/calendar">
                    <Button size="sm" className="mt-1">Log first session</Button>
                  </Link>
                </div>
              </div>
            ) : (
              recentSessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border"
                  data-testid={`session-log-${session.id}`}
                >
                  <div className="text-center min-w-10">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div className="text-base font-bold text-foreground leading-tight">
                      {new Date(session.date + "T12:00:00").getDate()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {SESSION_TYPE_LABELS[session.sessionType] || session.sessionType}
                    </p>
                    {session.notes && (
                      <p className="text-xs text-muted-foreground truncate">{session.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                    <div className="flex items-center gap-0.5 justify-end">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-2.5 h-2.5 ${i < (session.rating || 0) ? "text-accent fill-accent" : "text-muted"}`} />
                      ))}
                    </div>
                    <div className="mt-0.5">{session.durationMinutes}min</div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
