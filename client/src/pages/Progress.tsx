import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, TrendingUp, Clock, Flame, Dumbbell, Star,
  Plus, Trophy, CalendarDays
} from "lucide-react";

const SESSION_TYPES = [
  { value: "class", label: "Class" },
  { value: "open_mat", label: "Open Mat" },
  { value: "solo", label: "Solo Drilling" },
  { value: "competition", label: "Competition" },
];

const TYPE_COLORS: Record<string, string> = {
  class: "bg-primary/20 text-primary",
  open_mat: "bg-blue-500/20 text-blue-300",
  solo: "bg-purple-500/20 text-purple-300",
  competition: "bg-accent/20 text-accent",
};

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [logOpen, setLogOpen] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split("T")[0]);
  const [logType, setLogType] = useState("class");
  const [logDuration, setLogDuration] = useState(60);
  const [logNotes, setLogNotes] = useState("");
  const [logRating, setLogRating] = useState(3);
  const [filterType, setFilterType] = useState("all");

  if (!loading && !user) { navigate("/login"); return null; }

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    enabled: !!user,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/sessions"],
    enabled: !!user,
  });

  const addSession = useMutation({
    mutationFn: () => apiRequest("POST", "/api/sessions", {
      date: logDate,
      sessionType: logType,
      durationMinutes: logDuration,
      notes: logNotes,
      rating: logRating,
      completedDrills: [],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Session logged!" });
      setLogOpen(false);
      setLogNotes("");
    },
    onError: (e: any) => {
      toast({ title: "Failed to log session", description: e.message, variant: "destructive" });
    },
  });

  const allSessions = (sessions as any[]).sort((a: any, b: any) => b.date.localeCompare(a.date));
  const filtered = filterType === "all" ? allSessions : allSessions.filter((s: any) => s.sessionType === filterType);

  // Monthly breakdown
  const monthlyMap: Record<string, { sessions: number; minutes: number }> = {};
  allSessions.forEach((s: any) => {
    const key = s.date.slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { sessions: 0, minutes: 0 };
    monthlyMap[key].sessions++;
    monthlyMap[key].minutes += s.durationMinutes || 0;
  });
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .reverse();
  const maxSessions = Math.max(...monthlyData.map(([, d]) => d.sessions), 1);

  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Progress Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your training history and statistics.</p>
          </div>
          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5" data-testid="btn-add-session">
                <Plus className="w-4 h-4" /> Log Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Log a Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs mb-1.5 block">Date</Label>
                  <Input
                    type="date"
                    value={logDate}
                    onChange={e => setLogDate(e.target.value)}
                    data-testid="input-log-date"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Session type</Label>
                  <Select value={logType} onValueChange={setLogType}>
                    <SelectTrigger data-testid="select-log-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SESSION_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Duration (minutes)</Label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 75, 90].map(d => (
                      <Button
                        key={d}
                        variant={logDuration === d ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => setLogDuration(d)}
                        data-testid={`btn-log-duration-${d}`}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Rating</Label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(r => (
                      <button key={r} onClick={() => setLogRating(r)} className="p-0.5" data-testid={`btn-log-rating-${r}`}>
                        <Star className={`w-5 h-5 ${r <= logRating ? "text-accent fill-accent" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Notes</Label>
                  <Textarea
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    placeholder="What did you work on?"
                    className="resize-none h-16 text-sm"
                    data-testid="input-log-notes"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => addSession.mutate()}
                  disabled={addSession.isPending}
                  data-testid="btn-submit-log"
                >
                  {addSession.isPending ? "Logging..." : "Log Session"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Sessions", value: (stats as any)?.totalSessions, icon: Dumbbell, color: "text-primary" },
            { label: "Mat Hours", value: Math.round(((stats as any)?.totalMinutes ?? 0) / 60), icon: Clock, color: "text-blue-400", suffix: "h" },
            { label: "Avg Rating", value: (stats as any)?.avgRating, icon: Star, color: "text-accent", suffix: "/5" },
            { label: "Day Streak", value: (stats as any)?.streak, icon: Flame, color: "text-orange-400", suffix: "d" },
          ].map(({ label, value, icon: Icon, color, suffix }) => (
            <Card key={label} data-testid={`progress-stat-${label.toLowerCase().replace(/ /g, "-")}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    {statsLoading ? <Skeleton className="h-7 w-10" /> : (
                      <p className="text-2xl font-bold text-foreground">
                        {value ?? 0}{suffix && <span className="text-base text-muted-foreground ml-0.5">{suffix}</span>}
                      </p>
                    )}
                  </div>
                  <Icon className={`w-5 h-5 ${color} mt-0.5`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly bar chart */}
        {monthlyData.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Monthly Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-24">
                {monthlyData.map(([month, data]) => {
                  const heightPct = (data.sessions / maxSessions) * 100;
                  const [y, m] = month.split("-");
                  const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short" });
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[10px] text-muted-foreground font-medium">{data.sessions}</div>
                      <div className="w-full relative" style={{ height: "64px" }}>
                        <div
                          className="absolute bottom-0 w-full rounded-t bg-primary/70 transition-all duration-500"
                          style={{ height: `${Math.max(heightPct, 8)}%` }}
                          data-testid={`bar-${month}`}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session history */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Session History
              </CardTitle>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 h-8 text-xs" data-testid="select-filter-type">
                  <SelectValue placeholder="Filter type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {SESSION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No sessions logged yet. Start training!</p>
                <Button size="sm" className="mt-3" onClick={() => setLogOpen(true)}>Log first session</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                    data-testid={`session-history-${session.id}`}
                  >
                    <div className="text-center min-w-11">
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </div>
                      <div className="text-base font-bold text-foreground leading-tight">
                        {new Date(session.date + "T12:00:00").getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-[10px] capitalize ${TYPE_COLORS[session.sessionType] || "bg-muted text-muted-foreground"}`}>
                          {SESSION_TYPES.find(t => t.value === session.sessionType)?.label || session.sessionType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{session.durationMinutes}min</span>
                      </div>
                      {session.notes && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{session.notes}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < (session.rating || 0) ? "text-accent fill-accent" : "text-muted"}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
