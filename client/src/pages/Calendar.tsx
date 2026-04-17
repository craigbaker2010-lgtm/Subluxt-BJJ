import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CATEGORY_CLASSES: Record<string, string> = {
  takedowns: "category-takedowns",
  guard: "category-guard",
  passing: "category-passing",
  submissions: "category-submissions",
  sweeps: "category-sweeps",
  defense: "category-defense",
  sparring: "category-sparring",
};

const CATEGORY_DOT: Record<string, string> = {
  takedowns: "bg-blue-400",
  guard: "bg-emerald-400",
  passing: "bg-purple-400",
  submissions: "bg-red-400",
  sweeps: "bg-orange-400",
  defense: "bg-slate-400",
  sparring: "bg-yellow-400",
};

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed

  if (!loading && !user) { navigate("/login"); return null; }

  const { data: trainingDays = [], isLoading } = useQuery({
    queryKey: ["/api/training-days", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/training-days?year=${year}&month=${month}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/sessions"],
    enabled: !!user,
  });

  // Build a map: date string -> training day
  const dayMap = new Map<string, any>();
  (trainingDays as any[]).forEach((d: any) => dayMap.set(d.date, d));

  // Build a set of dates user has logged
  const loggedDates = new Set<string>((sessions as any[]).map((s: any) => s.date));

  // Calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const todayStr = today.toISOString().split("T")[0];

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const formatDateKey = (day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Training Calendar
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Click any highlighted day to view the session plan.</p>
          </div>
        </div>

        <Card>
          {/* Month navigation */}
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={prevMonth} data-testid="btn-prev-month">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <CardTitle className="text-base">
                {MONTHS[month - 1]} {year}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={nextMonth} data-testid="btn-next-month">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
              {Object.entries(CATEGORY_DOT).map(([cat, dot]) => (
                <div key={cat} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="capitalize">{cat}</span>
                </div>
              ))}
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  const dateKey = formatDateKey(day);
                  const trainingDay = dayMap.get(dateKey);
                  const isLogged = loggedDates.has(dateKey);
                  const isToday = dateKey === todayStr;

                  if (trainingDay) {
                    return (
                      <Link key={dateKey} href={`/training/${trainingDay.id}`}>
                        <div
                          className={`cal-day has-session ${isToday ? "is-today" : ""}`}
                          data-testid={`cal-day-${dateKey}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                            {isLogged && <div className="w-1.5 h-1.5 rounded-full bg-primary" title="Logged" />}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${CATEGORY_DOT[trainingDay.category] || "bg-muted"} mb-1`} />
                          <p className="text-[10px] text-foreground/80 leading-tight line-clamp-2">
                            {trainingDay.title}
                          </p>
                        </div>
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={dateKey}
                      className={`cal-day no-session ${isToday ? "is-today" : ""}`}
                      data-testid={`cal-day-empty-${dateKey}`}
                    >
                      <span className={`text-sm ${isToday ? "text-primary font-bold" : ""}`}>{day}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming this month */}
        <div className="mt-6">
          <h2 className="text-base font-bold text-foreground mb-3">This month's sessions</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (trainingDays as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No training days scheduled this month.
            </div>
          ) : (
            <div className="space-y-2">
              {(trainingDays as any[])
                .sort((a: any, b: any) => a.date.localeCompare(b.date))
                .map((day: any) => (
                  <Link key={day.id} href={`/training/${day.id}`}>
                    <div
                      className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer hover-elevate"
                      data-testid={`month-session-${day.id}`}
                    >
                      <div className="text-center min-w-12">
                        <div className="text-[10px] text-muted-foreground uppercase">
                          {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}
                        </div>
                        <div className="text-lg font-bold text-foreground leading-tight">
                          {new Date(day.date + "T12:00:00").getDate()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{day.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{day.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-[10px] capitalize ${CATEGORY_CLASSES[day.category] || ""}`}>
                          {day.category}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
