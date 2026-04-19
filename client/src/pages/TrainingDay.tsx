import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, useParams } from "wouter";
import Layout from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, Star, CheckCircle, Circle, ChevronLeft, Play,
  BookOpen, Dumbbell, Target, ClipboardCheck
} from "lucide-react";
import { Link } from "wouter";

const CATEGORY_CLASSES: Record<string, string> = {
  takedowns: "category-takedowns",
  guard: "category-guard",
  passing: "category-passing",
  submissions: "category-submissions",
  sweeps: "category-sweeps",
  defense: "category-defense",
  sparring: "category-sparring",
};

// Convert any YouTube URL format to an embeddable URL
function toYouTubeEmbed(url: string): string {
  if (!url) return url;
  // Already an embed URL
  if (url.includes("youtube.com/embed/") || url.includes("youtube.com/v/")) return url;
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  // Return as-is (Vimeo, etc.)
  return url;
}

function DrillScript({ text }: { text: string }) {
  // Simple markdown-like renderer
  const lines = text.split("\n");
  return (
    <div className="drill-script space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Bold headers **text**
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>');
        if (line.startsWith("**") && line.endsWith("**") && !line.includes("**", 2)) {
          return <p key={i} className="font-bold text-foreground mt-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="flex gap-2 pl-1">
              <span className="text-primary mt-1 flex-shrink-0">·</span>
              <p dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} />
            </div>
          );
        }
        return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
      })}
    </div>
  );
}

export default function TrainingDayPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { toast } = useToast();

  const [completedDrills, setCompletedDrills] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(4);
  const [duration, setDuration] = useState(60);
  const [activeDrillTab, setActiveDrillTab] = useState("0");

  if (!loading && !user) { navigate("/login"); return null; }

  const { data: dayData, isLoading } = useQuery({
    queryKey: ["/api/training-days", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/training-days/${params.id}`, { credentials: "include" });
      return res.json();
    },
    enabled: !!user && !!params.id,
  });

  const logSession = useMutation({
    mutationFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      return apiRequest("POST", "/api/sessions", {
        trainingDayId: Number(params.id),
        date: today,
        sessionType: "class",
        durationMinutes: duration,
        notes,
        rating,
        completedDrills,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Session logged!", description: "Your training session has been recorded." });
      setCompletedDrills([]);
      setNotes("");
    },
    onError: (e: any) => {
      toast({ title: "Failed to log session", description: e.message, variant: "destructive" });
    },
  });

  const toggleDrill = (drillId: number) => {
    setCompletedDrills(prev =>
      prev.includes(drillId) ? prev.filter(id => id !== drillId) : [...prev, drillId]
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!dayData || dayData.error) {
    return (
      <Layout>
        <div className="text-center py-20 text-muted-foreground">
          <p>Training day not found.</p>
          <Link href="/calendar">
            <Button className="mt-4">Back to Calendar</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const drills: any[] = dayData.drills || [];
  const totalDrillTime = drills.reduce((sum: number, d: any) => sum + (d.durationMinutes || 0), 0);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <Link href="/calendar">
          <Button variant="ghost" size="sm" className="mb-4 -ml-1 text-muted-foreground" data-testid="btn-back-calendar">
            <ChevronLeft className="w-4 h-4 mr-1" /> Calendar
          </Button>
        </Link>

        {/* Day header */}
        <Card className="mb-5">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className={CATEGORY_CLASSES[dayData.category] || ""}>
                    {dayData.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {dayData.difficultyLevel}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold text-foreground">{dayData.title}</h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-lg">{dayData.description}</p>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div className="text-base font-bold text-foreground">
                  {new Date(dayData.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric"
                  })}
                </div>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{totalDrillTime} min total</span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {drills.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Drills completed</span>
                  <span>{completedDrills.length} / {drills.length}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${drills.length > 0 ? (completedDrills.length / drills.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drills */}
        {drills.length === 0 ? (
          <Card className="mb-5">
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No drill breakdowns uploaded yet for this session.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="mb-5">
            <Tabs value={activeDrillTab} onValueChange={setActiveDrillTab}>
              <TabsList className="w-full flex overflow-x-auto mb-4 h-auto flex-wrap gap-1 bg-muted/50 p-1">
                {drills.map((drill: any, i: number) => (
                  <TabsTrigger
                    key={drill.id}
                    value={String(i)}
                    className="text-xs flex-1 min-w-24 data-[state=active]:bg-card data-[state=active]:text-primary"
                    data-testid={`drill-tab-${i}`}
                  >
                    {drill.partLabel.split("–")[0].trim()}
                  </TabsTrigger>
                ))}
              </TabsList>

              {drills.map((drill: any, i: number) => {
                const keyPoints: string[] = JSON.parse(drill.keyPoints || "[]");
                const isDone = completedDrills.includes(drill.id);

                return (
                  <TabsContent key={drill.id} value={String(i)}>
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base text-foreground">{drill.partLabel}</CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{drill.durationMinutes} minutes</span>
                            </div>
                          </div>
                          <Button
                            variant={isDone ? "default" : "outline"}
                            size="sm"
                            className="gap-1.5 flex-shrink-0 text-xs"
                            onClick={() => toggleDrill(drill.id)}
                            data-testid={`btn-complete-drill-${drill.id}`}
                          >
                            {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                            {isDone ? "Completed" : "Mark done"}
                          </Button>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5">
                        {/* Technique script */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                            <BookOpen className="w-3.5 h-3.5" /> Technique Script
                          </div>
                          <div className="bg-muted/30 rounded-lg p-4 border border-border">
                            <DrillScript text={drill.script} />
                          </div>
                        </div>

                        {/* Key points */}
                        {keyPoints.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              <Target className="w-3.5 h-3.5" /> Key Points
                            </div>
                            <div className="grid gap-2">
                              {keyPoints.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-md bg-primary/5 border border-primary/20">
                                  <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                    {idx + 1}
                                  </div>
                                  <p className="text-sm text-foreground/90">{point}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Embedded video */}
                        {drill.videoUrl && (
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                              <Play className="w-3.5 h-3.5" /> Instructional Video
                            </div>
                            <div className="video-embed shadow-md border border-border">
                              <iframe
                                src={toYouTubeEmbed(drill.videoUrl)}
                                title={drill.partLabel}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                data-testid={`video-embed-${drill.id}`}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Navigation between parts */}
                    <div className="flex justify-between mt-3 gap-2">
                      {i > 0 ? (
                        <Button variant="outline" size="sm" onClick={() => setActiveDrillTab(String(i - 1))} data-testid="btn-prev-drill">
                          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous part
                        </Button>
                      ) : <div />}
                      {i < drills.length - 1 ? (
                        <Button variant="outline" size="sm" onClick={() => setActiveDrillTab(String(i + 1))} data-testid="btn-next-drill">
                          Next part <ChevronLeft className="w-3.5 h-3.5 ml-1 rotate-180" />
                        </Button>
                      ) : <div />}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}

        {/* Log session */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Log This Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs mb-1.5 block">Duration (minutes)</Label>
                <div className="flex gap-2">
                  {[45, 60, 75, 90].map(d => (
                    <Button
                      key={d}
                      variant={duration === d ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setDuration(d)}
                      data-testid={`btn-duration-${d}`}
                    >
                      {d}m
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Session rating</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(r => (
                    <button
                      key={r}
                      onClick={() => setRating(r)}
                      className="p-0.5"
                      data-testid={`btn-rating-${r}`}
                    >
                      <Star className={`w-5 h-5 ${r <= rating ? "text-accent fill-accent" : "text-muted"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">Session notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="What clicked today? What needs more work?"
                className="resize-none text-sm h-20"
                data-testid="input-session-notes"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={() => logSession.mutate()}
              disabled={logSession.isPending}
              data-testid="btn-log-session"
            >
              <Dumbbell className="w-4 h-4" />
              {logSession.isPending ? "Logging..." : `Log session (${completedDrills.length}/${drills.length} drills)`}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
