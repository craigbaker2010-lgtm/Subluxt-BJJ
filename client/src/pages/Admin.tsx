import { useState, useEffect } from "react";

// Convert any YouTube URL to embed format
function toYouTubeEmbed(url: string): string {
  if (!url) return url;
  if (url.includes("youtube.com/embed/")) return url;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  return url;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TrainingDay {
  id: number;
  date: string;
  title: string;
  description: string;
  category: string;
  difficultyLevel: string;
  drills?: Drill[];
}

interface Drill {
  id: number;
  trainingDayId: number;
  orderIndex: number;
  partLabel: string;
  script: string;
  videoUrl: string;
  durationMinutes: number;
  keyPoints: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  belt: string;
  stripes: number;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
}

const BELTS = ["white", "blue", "purple", "brown", "black"];
const CATEGORIES = ["takedowns", "guard", "passing", "submissions", "sweeps", "defense", "sparring"];
const DIFFICULTIES = ["all", "beginner", "intermediate", "advanced"];

// ─── Admin Login Screen ───────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onLogin();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111418", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a1f26", border: "1px solid #2a3140", borderRadius: 12, padding: 40, width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🥋</div>
          <h1 style={{ color: "#fff", fontSize: 22, fontWeight: 700, margin: 0 }}>Admin Panel</h1>
          <p style={{ color: "#8a9bb0", fontSize: 14, marginTop: 6 }}>Subluxt Jiu-Jitsu</p>
        </div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", background: "#111418", border: "1px solid #2a3140", borderRadius: 8, color: "#fff", fontSize: 15, boxSizing: "border-box", marginBottom: 16, outline: "none" }}
            autoFocus
          />
          {error && <div style={{ color: "#e05252", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", padding: "12px", background: "#b02318", border: "none", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<"calendar" | "students">("calendar");

  // Training days state
  const [days, setDays] = useState<TrainingDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null);
  const [showDayForm, setShowDayForm] = useState(false);
  const [editingDay, setEditingDay] = useState<TrainingDay | null>(null);

  // Drill state
  const [showDrillForm, setShowDrillForm] = useState(false);
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null);

  // Students state
  const [students, setStudents] = useState<Student[]>([]);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Check admin session
  useEffect(() => {
    fetch("/api/admin/check")
      .then(r => r.json())
      .then(d => { setIsAdmin(d.isAdmin); setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  // Load data once logged in
  useEffect(() => {
    if (!isAdmin) return;
    loadDays();
    loadStudents();
  }, [isAdmin]);

  const loadDays = async () => {
    const res = await fetch("/api/training-days");
    const data = await res.json();
    setDays(data.sort((a: TrainingDay, b: TrainingDay) => a.date.localeCompare(b.date)));
  };

  const loadStudents = async () => {
    const res = await fetch("/api/admin/students");
    const data = await res.json();
    setStudents(data);
  };

  const loadDrillsForDay = async (dayId: number) => {
    const res = await fetch(`/api/training-days/${dayId}`);
    const data = await res.json();
    setSelectedDay(data);
  };

  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setIsAdmin(false);
  };

  // ─── Training Day Form ──────────────────────────────────────────────────────
  const DayForm = () => {
    const blank = { date: "", title: "", description: "", category: "submissions", difficultyLevel: "all" };
    const [form, setForm] = useState(editingDay ? { ...editingDay } : blank);

    const save = async () => {
      setSaving(true);
      try {
        const url = editingDay ? `/api/admin/training-days/${editingDay.id}` : "/api/admin/training-days";
        const method = editingDay ? "PUT" : "POST";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        await loadDays();
        setShowDayForm(false);
        setEditingDay(null);
        flash(editingDay ? "Training day updated." : "Training day added.");
      } finally { setSaving(false); }
    };

    const del = async () => {
      if (!editingDay) return;
      if (!confirm(`Delete "${editingDay.title}"? This also deletes all its drills.`)) return;
      await fetch(`/api/admin/training-days/${editingDay.id}`, { method: "DELETE" });
      await loadDays();
      setShowDayForm(false);
      setEditingDay(null);
      setSelectedDay(null);
      flash("Training day deleted.");
    };

    return (
      <div style={overlay}>
        <div style={modal}>
          <h2 style={modalTitle}>{editingDay ? "Edit Training Day" : "Add Training Day"}</h2>
          <label style={label}>Date</label>
          <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={input} />
          <label style={label}>Title</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Triangle Choke System" style={input} />
          <label style={label}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Brief overview of what students will learn" style={{ ...input, resize: "vertical" }} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Level</label>
              <select value={form.difficultyLevel} onChange={e => setForm({ ...form, difficultyLevel: e.target.value })} style={input}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            {editingDay && <button onClick={del} style={{ ...btn, background: "#7a1a1a" }}>Delete</button>}
            <button onClick={() => { setShowDayForm(false); setEditingDay(null); }} style={{ ...btn, background: "#2a3140" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btn, background: "#b02318" }}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Drill Form ─────────────────────────────────────────────────────────────
  const DrillForm = () => {
    const blank = {
      trainingDayId: selectedDay!.id,
      orderIndex: (selectedDay?.drills?.length || 0),
      partLabel: `Part ${(selectedDay?.drills?.length || 0) + 1} – `,
      script: "",
      videoUrl: "",
      durationMinutes: 15,
      keyPoints: "[]",
    };
    const [form, setForm] = useState(editingDrill ? { ...editingDrill } : blank);
    const [keyPointsText, setKeyPointsText] = useState(
      editingDrill ? (JSON.parse(editingDrill.keyPoints || "[]") as string[]).join("\n") : ""
    );

    const save = async () => {
      setSaving(true);
      try {
        // Convert newline-separated key points to JSON array
        const kp = keyPointsText.split("\n").map(s => s.trim()).filter(Boolean);
        const payload = { ...form, keyPoints: JSON.stringify(kp) };
        const url = editingDrill ? `/api/admin/drills/${editingDrill.id}` : "/api/admin/drills";
        const method = editingDrill ? "PUT" : "POST";
        await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        await loadDrillsForDay(selectedDay!.id);
        setShowDrillForm(false);
        setEditingDrill(null);
        flash(editingDrill ? "Drill updated." : "Drill added.");
      } finally { setSaving(false); }
    };

    const del = async () => {
      if (!editingDrill) return;
      if (!confirm(`Delete "${editingDrill.partLabel}"?`)) return;
      await fetch(`/api/admin/drills/${editingDrill.id}`, { method: "DELETE" });
      await loadDrillsForDay(selectedDay!.id);
      setShowDrillForm(false);
      setEditingDrill(null);
      flash("Drill deleted.");
    };

    return (
      <div style={overlay}>
        <div style={{ ...modal, maxWidth: 680 }}>
          <h2 style={modalTitle}>{editingDrill ? "Edit Drill" : "Add Drill"}</h2>
          <label style={label}>Part Label</label>
          <input value={form.partLabel} onChange={e => setForm({ ...form, partLabel: e.target.value })} placeholder='e.g. "Part 1 – Warm-Up & Hip Mobility"' style={input} />

          <label style={label}>Script / Instructions</label>
          <textarea
            value={form.script}
            onChange={e => setForm({ ...form, script: e.target.value })}
            rows={8}
            placeholder={"Write the full technique instructions here.\nUse **bold** for emphasis.\nBreak into steps with line breaks."}
            style={{ ...input, resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
          />

          <label style={label}>YouTube Video URL</label>
          <input
            value={form.videoUrl}
            onChange={e => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
            style={input}
          />
          <p style={{ color: "#5a6a7a", fontSize: 12, marginTop: -8, marginBottom: 12 }}>
            Paste any YouTube link — the app converts it automatically.
          </p>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Duration (minutes)</label>
              <input type="number" min={1} max={120} value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} style={input} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Order</label>
              <input type="number" min={0} value={form.orderIndex} onChange={e => setForm({ ...form, orderIndex: Number(e.target.value) })} style={input} />
            </div>
          </div>

          <label style={label}>Key Points (one per line)</label>
          <textarea
            value={keyPointsText}
            onChange={e => setKeyPointsText(e.target.value)}
            rows={4}
            placeholder={"Break posture FIRST — always\nHip pivot creates the angle\nArm across centerline traps the shoulder"}
            style={{ ...input, resize: "vertical" }}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            {editingDrill && <button onClick={del} style={{ ...btn, background: "#7a1a1a" }}>Delete</button>}
            <button onClick={() => { setShowDrillForm(false); setEditingDrill(null); }} style={{ ...btn, background: "#2a3140" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btn, background: "#b02318" }}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Student Edit Form ──────────────────────────────────────────────────────
  const StudentForm = () => {
    const [belt, setBelt] = useState(editingStudent!.belt);
    const [stripes, setStripes] = useState(editingStudent!.stripes);

    const save = async () => {
      setSaving(true);
      try {
        await fetch(`/api/admin/students/${editingStudent!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ belt, stripes }),
        });
        await loadStudents();
        setEditingStudent(null);
        flash("Student updated.");
      } finally { setSaving(false); }
    };

    return (
      <div style={overlay}>
        <div style={{ ...modal, maxWidth: 400 }}>
          <h2 style={modalTitle}>Edit Student</h2>
          <p style={{ color: "#8a9bb0", marginBottom: 20 }}>{editingStudent!.name} — {editingStudent!.email}</p>
          <label style={label}>Belt</label>
          <select value={belt} onChange={e => setBelt(e.target.value)} style={input}>
            {BELTS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)} Belt</option>)}
          </select>
          <label style={label}>Stripes (0–4)</label>
          <select value={stripes} onChange={e => setStripes(Number(e.target.value))} style={input}>
            {[0, 1, 2, 3, 4].map(s => <option key={s} value={s}>{s} stripe{s !== 1 ? "s" : ""}</option>)}
          </select>
          <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
            <button onClick={() => setEditingStudent(null)} style={{ ...btn, background: "#2a3140" }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ ...btn, background: "#b02318" }}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  if (checking) return <div style={{ background: "#111418", minHeight: "100vh" }} />;
  if (!isAdmin) return <AdminLogin onLogin={() => setIsAdmin(true)} />;

  const beltColor: Record<string, string> = {
    white: "#e0e0e0", blue: "#3b7dd8", purple: "#8b5cf6", brown: "#92400e", black: "#374151",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111418", color: "#e0e6f0", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#1a1f26", borderBottom: "1px solid #2a3140", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🥋</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Subluxt Admin</span>
          <span style={{ background: "#b02318", color: "#fff", fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>ADMIN</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {msg && <span style={{ color: "#4ade80", fontSize: 13 }}>{msg}</span>}
          <button onClick={() => window.location.hash = "/"} style={{ ...btn, background: "#2a3140", fontSize: 13 }}>← Back to App</button>
          <button onClick={handleLogout} style={{ ...btn, background: "#2a3140", fontSize: 13 }}>Log Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "#1a1f26", borderBottom: "1px solid #2a3140", padding: "0 24px", display: "flex", gap: 4 }}>
        {(["calendar", "students"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", padding: "14px 16px", color: tab === t ? "#fff" : "#6a7a8a", fontWeight: tab === t ? 600 : 400, borderBottom: tab === t ? "2px solid #b02318" : "2px solid transparent", cursor: "pointer", fontSize: 14, textTransform: "capitalize" }}>
            {t === "calendar" ? "Training Calendar" : "Students"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 105px)" }}>
        {/* ── Calendar Tab ── */}
        {tab === "calendar" && (
          <>
            {/* Left: training days list */}
            <div style={{ width: 320, borderRight: "1px solid #2a3140", overflowY: "auto", padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 14, color: "#8a9bb0", textTransform: "uppercase", letterSpacing: 1 }}>Training Days</h3>
                <button onClick={() => { setEditingDay(null); setShowDayForm(true); }} style={{ ...btn, background: "#b02318", fontSize: 12, padding: "5px 12px" }}>+ Add Day</button>
              </div>
              {days.length === 0 && <p style={{ color: "#5a6a7a", fontSize: 13 }}>No training days yet.</p>}
              {days.map(day => (
                <div
                  key={day.id}
                  onClick={() => loadDrillsForDay(day.id)}
                  style={{ padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", background: selectedDay?.id === day.id ? "#1e2d3d" : "#1a1f26", border: `1px solid ${selectedDay?.id === day.id ? "#3b7dd8" : "#2a3140"}` }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e6f0" }}>{day.title}</div>
                      <div style={{ fontSize: 12, color: "#5a7a9a", marginTop: 2 }}>{day.date} · {day.category}</div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingDay(day); setShowDayForm(true); }}
                      style={{ background: "none", border: "none", color: "#5a6a7a", cursor: "pointer", fontSize: 16, padding: "0 4px" }}
                    >✏️</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: drill editor */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {!selectedDay ? (
                <div style={{ textAlign: "center", marginTop: 80, color: "#5a6a7a" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
                  <p>Select a training day to manage its drills</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedDay.title}</h2>
                      <p style={{ margin: "4px 0 0", color: "#5a7a9a", fontSize: 13 }}>{selectedDay.date} · {selectedDay.category} · {selectedDay.difficultyLevel}</p>
                    </div>
                    <button onClick={() => { setEditingDrill(null); setShowDrillForm(true); }} style={{ ...btn, background: "#b02318" }}>+ Add Drill</button>
                  </div>

                  {(!selectedDay.drills || selectedDay.drills.length === 0) && (
                    <div style={{ background: "#1a1f26", border: "1px dashed #2a3140", borderRadius: 10, padding: 32, textAlign: "center", color: "#5a6a7a" }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>🎬</div>
                      <p style={{ margin: 0 }}>No drills yet. Click "Add Drill" to add your first technique video and instructions.</p>
                    </div>
                  )}

                  {selectedDay.drills?.map((drill, i) => (
                    <div key={drill.id} style={{ background: "#1a1f26", border: "1px solid #2a3140", borderRadius: 10, padding: 20, marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <span style={{ background: "#b02318", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Part {i + 1}</span>
                            <span style={{ fontWeight: 600, fontSize: 15 }}>{drill.partLabel}</span>
                            <span style={{ color: "#5a6a7a", fontSize: 12 }}>{drill.durationMinutes} min</span>
                          </div>
                          {drill.videoUrl && (
                            <div style={{ fontSize: 12, color: "#3b7dd8", marginBottom: 6 }}>
                              🎥 {drill.videoUrl.length > 60 ? drill.videoUrl.slice(0, 60) + "..." : drill.videoUrl}
                            </div>
                          )}
                          <p style={{ color: "#8a9bb0", fontSize: 13, margin: 0, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>
                            {drill.script.slice(0, 200)}{drill.script.length > 200 ? "..." : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => { setEditingDrill(drill); setShowDrillForm(true); }}
                          style={{ ...btn, background: "#2a3140", fontSize: 12, marginLeft: 12, flexShrink: 0 }}
                        >Edit</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {/* ── Students Tab ── */}
        {tab === "students" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700 }}>Students ({students.length})</h2>
            {students.length === 0 && <p style={{ color: "#5a6a7a" }}>No students registered yet.</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {students.map(s => (
                <div key={s.id} style={{ background: "#1a1f26", border: "1px solid #2a3140", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{s.name}</div>
                      <div style={{ color: "#5a7a9a", fontSize: 12, marginTop: 2 }}>{s.email}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <span style={{ background: beltColor[s.belt] || "#374151", color: s.belt === "white" ? "#111" : "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 99 }}>
                          {s.belt.toUpperCase()}
                        </span>
                        <span style={{ color: "#f59e0b", fontSize: 13 }}>{"◆".repeat(s.stripes)}{"◇".repeat(4 - s.stripes)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: s.subscriptionStatus === "active" ? "#4ade80" : "#f87171", marginTop: 6 }}>
                        {s.subscriptionStatus === "active" ? "✓ Active" : s.subscriptionStatus} {s.subscriptionPlan ? `· ${s.subscriptionPlan}` : ""}
                      </div>
                    </div>
                    <button onClick={() => setEditingStudent(s)} style={{ ...btn, background: "#2a3140", fontSize: 12 }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDayForm && <DayForm />}
      {showDrillForm && selectedDay && <DrillForm />}
      {editingStudent && <StudentForm />}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const modal: React.CSSProperties = {
  background: "#1a1f26", border: "1px solid #2a3140", borderRadius: 12,
  padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto",
};
const modalTitle: React.CSSProperties = { margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#fff" };
const label: React.CSSProperties = { display: "block", fontSize: 12, color: "#8a9bb0", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "#111418", border: "1px solid #2a3140",
  borderRadius: 7, color: "#e0e6f0", fontSize: 14, boxSizing: "border-box", marginBottom: 14, outline: "none",
};
const btn: React.CSSProperties = {
  padding: "8px 16px", border: "none", borderRadius: 7, color: "#fff",
  fontWeight: 600, cursor: "pointer", fontSize: 14,
};
