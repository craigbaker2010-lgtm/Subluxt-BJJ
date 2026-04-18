import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq, and, gte, lte } from "drizzle-orm";
import { mkdirSync } from "fs";
import { dirname } from "path";
import {
  users, trainingDays, techniqueDrills, sessionLogs, subscriptions,
  merchProducts, merchOrders,
  type User, type InsertUser,
  type TrainingDay, type InsertTrainingDay,
  type TechniqueDrill, type InsertTechniqueDrill,
  type SessionLog, type InsertSessionLog,
  type Subscription, type InsertSubscription,
  type MerchProduct, type InsertMerchProduct,
  type MerchOrder, type InsertMerchOrder,
} from "@shared/schema";
import bcrypt from "bcryptjs";

const DB_PATH = process.env.DATABASE_PATH || "subluxt.db";
// Ensure the parent directory exists before opening (critical for Railway volume mounts)
const dbDir = dirname(DB_PATH);
if (dbDir && dbDir !== ".") mkdirSync(dbDir, { recursive: true });
const client = createClient({ url: `file:${DB_PATH}` });
const db = drizzle(client);

// ─── Migrations ───────────────────────────────────────────────────────────────
async function runMigrations() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      belt TEXT NOT NULL DEFAULT 'white',
      stripes INTEGER NOT NULL DEFAULT 0,
      subscription_status TEXT NOT NULL DEFAULT 'inactive',
      subscription_plan TEXT,
      subscription_expiry TEXT,
      avatar_initials TEXT
    );

    CREATE TABLE IF NOT EXISTS training_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty_level TEXT NOT NULL DEFAULT 'all'
    );

    CREATE TABLE IF NOT EXISTS technique_drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      training_day_id INTEGER NOT NULL REFERENCES training_days(id),
      order_index INTEGER NOT NULL DEFAULT 0,
      part_label TEXT NOT NULL,
      script TEXT NOT NULL,
      video_url TEXT,
      video_platform TEXT DEFAULT 'youtube',
      duration_minutes INTEGER NOT NULL DEFAULT 10,
      key_points TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS session_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      training_day_id INTEGER REFERENCES training_days(id),
      date TEXT NOT NULL,
      session_type TEXT NOT NULL DEFAULT 'class',
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      notes TEXT,
      rating INTEGER DEFAULT 3,
      completed_drills TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      plan TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      payment_method TEXT DEFAULT 'card',
      last_four TEXT,
      transaction_id TEXT
    );

    CREATE TABLE IF NOT EXISTS merch_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL,
      sizes TEXT NOT NULL DEFAULT '[]',
      image_url TEXT,
      badge TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS merch_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      items TEXT NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_session_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

// Seed demo data if empty
async function seedDemoData() {
  const existing = await db.select().from(trainingDays).all();
  if (existing.length > 0) return;

  // Seed merch products
  const products = [
    {
      name: "Subluxt Competition Gi",
      description: "Lightweight single-weave gi built for competition. Pre-shrunk cotton canvas with reinforced seams and embroidered Subluxt octopus patch on back.",
      price: 189.99,
      category: "gi",
      sizes: JSON.stringify(["A1", "A2", "A3", "A4", "A5"]),
      badge: "Best Seller",
      inStock: true,
    },
    {
      name: "Subluxt Training Gi",
      description: "Durable double-weave gi for everyday training. Thick cotton construction with contrast stitching in crimson and silver.",
      price: 149.99,
      category: "gi",
      sizes: JSON.stringify(["A1", "A2", "A3", "A4", "A5"]),
      inStock: true,
    },
    {
      name: "Octopus Rashguard — Long Sleeve",
      description: "400gsm compression rashguard with full-sublimated Subluxt octopus artwork. Flatlock stitching, anti-microbial fabric.",
      price: 69.99,
      category: "rashguard",
      sizes: JSON.stringify(["XS", "S", "M", "L", "XL", "XXL"]),
      badge: "New",
      inStock: true,
    },
    {
      name: "Octopus Rashguard — Short Sleeve",
      description: "Short sleeve version of our signature rashguard. Same 400gsm compression fabric, full-sublimated design.",
      price: 59.99,
      category: "rashguard",
      sizes: JSON.stringify(["XS", "S", "M", "L", "XL", "XXL"]),
      inStock: true,
    },
    {
      name: "Subluxt No-Gi Shorts",
      description: "4-way stretch fight shorts with internal compression liner. Deep side slits for full guard range of motion. No pockets to grab.",
      price: 54.99,
      category: "shorts",
      sizes: JSON.stringify(["XS", "S", "M", "L", "XL", "XXL"]),
      inStock: true,
    },
    {
      name: "Subluxt Vale Tudo Shorts",
      description: "Minimal profile compression shorts for no-gi. Crimson side stripe, flatlock seams, no-slide inner thigh grip.",
      price: 49.99,
      category: "shorts",
      sizes: JSON.stringify(["XS", "S", "M", "L", "XL", "XXL"]),
      badge: "New",
      inStock: true,
    },
    {
      name: "Subluxt Hoodie",
      description: "French terry 400gsm pullover hoodie. Embroidered octopus logo on chest, 'SUBLUXT JIU-JITSU' across back. Pre-washed for softness.",
      price: 89.99,
      category: "hoodie",
      sizes: JSON.stringify(["XS", "S", "M", "L", "XL", "XXL"]),
      inStock: true,
    },
    {
      name: "Subluxt Snapback Cap",
      description: "Structured 6-panel cap with embroidered octopus badge on front. Flat brim, adjustable snapback closure.",
      price: 34.99,
      category: "accessories",
      sizes: JSON.stringify(["One Size"]),
      inStock: true,
    },
    {
      name: "Subluxt Belt Bag",
      description: "Compact sling bag for gear day trips. Water-resistant 600D polyester, crimson accents, holds rashguard and shorts.",
      price: 44.99,
      category: "accessories",
      sizes: JSON.stringify(["One Size"]),
      inStock: true,
    },
  ];
  for (const p of products) {
    await db.insert(merchProducts).values(p).run();
  }

  // Insert demo training days for April/May 2026
  const days = [
    {
      date: "2026-04-07", title: "Double-Leg Takedown Series", category: "takedowns",
      difficultyLevel: "beginner",
      description: "Focus on level changes, penetration steps, and finishing the double-leg takedown with proper hip drive.",
    },
    {
      date: "2026-04-09", title: "Closed Guard Fundamentals", category: "guard",
      difficultyLevel: "all",
      description: "Controlling from closed guard, breaking posture, and setting up sweeps and submissions.",
    },
    {
      date: "2026-04-14", title: "Guard Passing – Torreando & Stack", category: "passing",
      difficultyLevel: "intermediate",
      description: "Two essential guard passes for neutralizing active open guards — torreando pressure and the stack pass.",
    },
    {
      date: "2026-04-16", title: "Triangle Choke System", category: "submissions",
      difficultyLevel: "intermediate",
      description: "Building a complete triangle choke system from closed guard, mount, and back control.",
    },
    {
      date: "2026-04-18", title: "Scissor & Hip Bump Sweep", category: "sweeps",
      difficultyLevel: "beginner",
      description: "Two foundational sweeps from closed guard that work together as a combination.",
    },
    {
      date: "2026-04-21", title: "Rear Naked Choke & Back Control", category: "submissions",
      difficultyLevel: "all",
      description: "Establishing back control, maintaining hooks, and finishing the rear naked choke.",
    },
    {
      date: "2026-04-23", title: "Kimura from Side Control", category: "submissions",
      difficultyLevel: "intermediate",
      description: "Trapping the arm and finishing the kimura from side control top position.",
    },
    {
      date: "2026-04-25", title: "Open Guard – De La Riva", category: "guard",
      difficultyLevel: "advanced",
      description: "De La Riva hook fundamentals, framing, and transitioning to sweeps and back takes.",
    },
    {
      date: "2026-04-28", title: "Positional Sparring Focus: Mount Escape", category: "defense",
      difficultyLevel: "all",
      description: "Mount escape via elbow-knee and bridge-and-roll, drilling both until automatic.",
    },
    {
      date: "2026-04-30", title: "Leg Lock Fundamentals", category: "submissions",
      difficultyLevel: "advanced",
      description: "Straight ankle lock and kneebar mechanics from ashi garami and outside heel hook entries.",
    },
    {
      date: "2026-05-02", title: "X-Guard Sweeps", category: "sweeps",
      difficultyLevel: "advanced",
      description: "Entering X-guard, balancing off your partner, and executing primary sweeps.",
    },
    {
      date: "2026-05-05", title: "Single-Leg Takedown", category: "takedowns",
      difficultyLevel: "beginner",
      description: "Low single, high single, and running the pipe finishes.",
    },
    {
      date: "2026-05-07", title: "Open Mat Sparring", category: "sparring",
      difficultyLevel: "all",
      description: "Free sparring session — apply techniques from the past two weeks. Coaches provide feedback.",
    },
    {
      date: "2026-05-09", title: "Armbar from Guard", category: "submissions",
      difficultyLevel: "intermediate",
      description: "Classic armbar from closed guard with setups, breaking the grip, and hip elevation mechanics.",
    },
    {
      date: "2026-05-12", title: "Butterfly Guard & Sweeps", category: "sweeps",
      difficultyLevel: "intermediate",
      description: "Butterfly guard posture, the basic lift sweep, and hooking butterfly.",
    },
  ];

  for (const day of days) {
    await db.insert(trainingDays).values(day).run();
  }

  // Insert drills for seeded training days
  const allDays = await db.select().from(trainingDays).all();
  const triangleDay = allDays.find(d => d.date === "2026-04-16");
  const takedownDay = allDays.find(d => d.date === "2026-04-07");
  const guardDay = allDays.find(d => d.date === "2026-04-09");

  if (triangleDay) {
    const drills = [
      {
        trainingDayId: triangleDay.id,
        orderIndex: 0,
        partLabel: "Part 1 – Warm-Up & Hip Mobility",
        durationMinutes: 8,
        script: `**Objective:** Prepare the hip flexors and adductors for triangle mechanics.

**Drill 1: Hip Escape Reps (3 min)**
- Begin in guard position, partner standing.
- Perform 10 consecutive hip escapes (shrimping) to each side.
- Focus on keeping your hips off the mat and turning your body completely.
- *Key cue:* "Hips move first, shoulders follow."

**Drill 2: Triangle Position Hold (5 min)**
- Lie on your back, pull one knee to your chest.
- Form a triangle shape with your legs — shin perpendicular, back of the knee behind the neck line.
- Hold 30 seconds each leg, stretch slowly.
- Feel the opening through your hip and groin; this is the geometry of the choke.`,
        videoUrl: "https://www.youtube.com/embed/videoseries?list=PLx7tRqrPIxhvQUSmNNvOhBuZpwmhS7YJe",
        keyPoints: JSON.stringify(["Hip flexibility determines triangle efficiency", "Knee must cross behind opponent neck line", "Adductors provide the choke pressure"]),
      },
      {
        trainingDayId: triangleDay.id,
        orderIndex: 1,
        partLabel: "Part 2 – Triangle from Closed Guard",
        durationMinutes: 20,
        script: `**Objective:** Build the triangle from closed guard with proper mechanics.

**Setup — Breaking Posture (5 min)**
- Establish closed guard, break partner's grip on hips.
- Use an over-under grip on their collar and sleeve.
- Pull down with collar grip while pushing down their head — destroy their posture completely.
- *Never* attempt a triangle from an upright opponent.

**Entry — The Hip Pivot (8 min)**
- From broken posture, shoot your hips to one side (the "hip out" movement).
- Swing your opposite leg across their back and up to their shoulder.
- Cup the back of their head with your knee — this closes the gap.
- Grab your own shin to control depth while you adjust.

**Finish — Locking the Triangle (7 min)**
- Pull their arm across your centerline (figure-4 with your legs captures it).
- Squeeze your knees together and lift your hips.
- Pull their head down — choke comes from the thigh, not the calf.
- *Tap check:* If they're not tapping, re-check arm position and hip angle.`,
        videoUrl: "https://www.youtube.com/embed/2yPVHNcJXlU",
        keyPoints: JSON.stringify(["Break posture FIRST — always", "Hip pivot creates the angle", "Arm across centerline traps the shoulder", "Pull head down, push hips up"]),
      },
      {
        trainingDayId: triangleDay.id,
        orderIndex: 2,
        partLabel: "Part 3 – Triangle from Mount",
        durationMinutes: 15,
        script: `**Objective:** Learn the armbar-to-triangle transition from mount.

**Setup — High Mount (5 min)**
- Establish high mount: knees behind their elbows, sit upright.
- Post one hand on the mat beside their head for base.
- Apply cross-face pressure with your other arm to break their frame.

**Transition — Spinning Triangle (10 min)**
- Isolate an arm: push it to center with your hip pressure.
- Post your foot on the mat and spin 90 degrees, rotating toward their head.
- As you spin, your leg swings over their head — lock the triangle immediately.
- This must happen in one fluid motion — practice slow first.

*Note:* If they resist the spin, revert to straight armbar on the isolated arm.`,
        videoUrl: "https://www.youtube.com/embed/XxMKmzTJEYY",
        keyPoints: JSON.stringify(["High mount needed — knee behind elbows", "Isolate the arm before spinning", "Spin and lock in one motion", "Armbar is always available as backup"]),
      },
      {
        trainingDayId: triangleDay.id,
        orderIndex: 3,
        partLabel: "Part 4 – Sparring Application",
        durationMinutes: 17,
        script: `**Objective:** Apply triangle mechanics under live resistance.

**Round 1 (5 min): Guard vs. Passer — Triangle Only**
- Bottom player: can only submit with triangle or triangle-related submissions.
- Top player: try to pass guard.
- Restart from closed guard each time.

**Round 2 (5 min): Submission Only Sparring**
- Open sparring — but if you're on bottom, actively hunt triangles.
- Coach watches and stops action to provide corrections.

**Round 3 (7 min): Positional Feedback**
- Students pair up: one performs triangle entry 3 times at 70% resistance.
- Partner provides verbal feedback on hip angle and arm positioning.
- Switch roles.

*Coaching notes:* Watch for students who skip the posture break. That is the most common error. Also watch for collapsed hip — the triangle must be perpendicular.`,
        videoUrl: "https://www.youtube.com/embed/videoseries?list=PLx7tRqrPIxhvQUSmNNvOhBuZpwmhS7YJe",
        keyPoints: JSON.stringify(["Competition mindset in round 1", "Active triangle hunting in round 2", "Verbal coaching reinforces mechanics", "Reset and drill errors immediately"]),
      },
    ];
    for (const drill of drills) {
      await db.insert(techniqueDrills).values(drill).run();
    }
  }

  if (takedownDay) {
    const drills = [
      {
        trainingDayId: takedownDay.id, orderIndex: 0, partLabel: "Part 1 – Level Change & Stance", durationMinutes: 10,
        script: `**Objective:** Master the foundational movement of every takedown — the level change.

**Drill: Stance & Level Change (10 min)**
- Start in wrestling stance: feet shoulder-width, weight on balls of feet, hands up.
- Practice level change: drive hips down, keep chest up, eyes forward.
- Rule: your chest should never drop below your hips.
- Partner checks posture — back must stay flat throughout.`,
        videoUrl: "https://www.youtube.com/embed/PLCyIBbQhJo",
        keyPoints: JSON.stringify(["Weight on balls of feet", "Hips down, chest up", "Eyes always forward", "Never round the back"]),
      },
      {
        trainingDayId: takedownDay.id, orderIndex: 1, partLabel: "Part 2 – Penetration Step & Finish", durationMinutes: 20,
        script: `**Objective:** Complete double-leg from level change through penetration step to finish.

**Penetration Step Drill (10 min):**
- Level change → lead leg shoots forward to behind opponent's feet.
- Head placement: outside of their hip (same side as shooting leg).
- Grab behind both knees simultaneously.

**Finish — Drive Finish (10 min):**
- From the grab, drive forward with your hips, lifting them off the mat.
- Step your back foot up beside your lead foot mid-lift.
- Drive them forward and down — don't fall with them, stay base.`,
        videoUrl: "https://www.youtube.com/embed/dDlI2Oi95NE",
        keyPoints: JSON.stringify(["Head outside hip", "Grab behind knees simultaneously", "Drive from hips not arms", "Maintain base after takedown"]),
      },
    ];
    for (const drill of drills) {
      await db.insert(techniqueDrills).values(drill).run();
    }
  }

  if (guardDay) {
    const drills = [
      {
        trainingDayId: guardDay.id, orderIndex: 0, partLabel: "Part 1 – Closed Guard Posture Control", durationMinutes: 15,
        script: `**Objective:** Learn how to break and maintain control over your opponent's posture.

**Breaking Posture (15 min):**
- From closed guard, grip their collars and sleeves.
- Use collar grip to pull head down; use sleeve grip to prevent posting.
- Lock your guard tight and bridge your hips to kill their base.
- *Drill:* posture-break 10 times, hold 5 seconds each.`,
        videoUrl: "https://www.youtube.com/embed/ByBuBibsymE",
        keyPoints: JSON.stringify(["Control collar and sleeve simultaneously", "Pull head, not just collar", "Tight closed guard + hips up = no posture", "Stay active — don't hold guard passively"]),
      },
      {
        trainingDayId: guardDay.id, orderIndex: 1, partLabel: "Part 2 – Sweeps & Submissions", durationMinutes: 25,
        script: `**Objective:** Apply sweeps and submissions from broken posture.

**Hip Bump Sweep Setup (10 min):**
- From broken posture, post one arm on the mat and sit up.
- Wrap your arm around their neck (like a headlock).
- Bump your hips explosively, rotating them to the mat.

**Guillotine Entry (15 min):**
- As they posture up: shoot your arm under their neck from the front.
- Cup your forearm into their throat, squeeze elbows together.
- Fall to guard while completing the squeeze — don't let them stand.`,
        videoUrl: "https://www.youtube.com/embed/jWdGRvEAGOs",
        keyPoints: JSON.stringify(["Hip bump needs explosive rotation", "Guillotine: arm under, forearm in throat", "Fall to guard when finishing guillotine", "Combination: hip bump if guillotine fails"]),
      },
    ];
    for (const drill of drills) {
      await db.insert(techniqueDrills).values(drill).run();
    }
  }

  // Seed a demo user
  const hashedPassword = await bcrypt.hash("demo1234", 10);
  await db.insert(users).values({
    email: "demo@subluxt.com",
    password: hashedPassword,
    name: "Alex Rivera",
    belt: "blue",
    stripes: 2,
    subscriptionStatus: "active",
    subscriptionPlan: "pro",
    subscriptionExpiry: "2027-04-16",
    avatarInitials: "AR",
  }).run();

  // Seed some session logs for the demo user
  const demoUserRows = await db.select().from(users).where(eq(users.email, "demo@subluxt.com")).all();
  const demoUser = demoUserRows[0];
  if (demoUser) {
    const logData = [
      { userId: demoUser.id, date: "2026-04-07", sessionType: "class", durationMinutes: 75, rating: 4, notes: "Great double-leg session, need to work on the finish.", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-04-09", sessionType: "class", durationMinutes: 60, rating: 5, notes: "Closed guard finally clicking!", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-04-14", sessionType: "class", durationMinutes: 90, rating: 3, notes: "Torreando is hard. Keep getting countered.", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-04-11", sessionType: "open_mat", durationMinutes: 45, rating: 4, notes: "Open mat — focused on guard passing.", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-03-31", sessionType: "class", durationMinutes: 60, rating: 5, notes: "Competition prep.", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-03-26", sessionType: "class", durationMinutes: 75, rating: 4, notes: "Back attacks seminar.", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-03-24", sessionType: "solo", durationMinutes: 30, rating: 3, notes: "Solo drilling — takedown entries.", completedDrills: "[]" },
      { userId: demoUser.id, date: "2026-03-19", sessionType: "class", durationMinutes: 60, rating: 5, notes: "Triangles starting to feel natural.", completedDrills: "[]" },
    ];
    for (const log of logData) {
      await db.insert(sessionLogs).values(log).run();
    }
  }
}

// Run migrations and seed on startup — exported so index.ts can await it
export async function initDatabase() {
  await runMigrations();
  await seedDemoData();
}

// ─── Storage Interface ────────────────────────────────────────────────────────
export interface IStorage {
  // Admin
  getAllUsers(): Promise<User[]>;
  updateUserBelt(userId: number, belt: string, stripes: number): Promise<User | undefined>;
  createTrainingDay(data: InsertTrainingDay): Promise<TrainingDay>;
  updateTrainingDay(id: number, data: Partial<InsertTrainingDay>): Promise<TrainingDay | undefined>;
  deleteTrainingDay(id: number): Promise<void>;
  createDrill(data: InsertTechniqueDrill): Promise<TechniqueDrill>;
  updateDrill(id: number, data: Partial<InsertTechniqueDrill>): Promise<TechniqueDrill | undefined>;
  deleteDrill(id: number): Promise<void>;

  // Auth (existing)
  // Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUserSubscription(userId: number, status: string, plan: string | null, expiry: string | null): Promise<User | undefined>;

  // Training Days
  getTrainingDays(): Promise<TrainingDay[]>;
  getTrainingDaysByMonth(year: number, month: number): Promise<TrainingDay[]>;
  getTrainingDayById(id: number): Promise<TrainingDay | undefined>;

  // Drills
  getDrillsByTrainingDay(trainingDayId: number): Promise<TechniqueDrill[]>;

  // Session Logs
  getSessionsByUser(userId: number): Promise<SessionLog[]>;
  getSessionsByUserAndDate(userId: number, from: string, to: string): Promise<SessionLog[]>;
  createSessionLog(data: InsertSessionLog): Promise<SessionLog>;
  getUserStats(userId: number): Promise<{ totalSessions: number; totalMinutes: number; avgRating: number; streak: number }>;

  // Subscriptions
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  getSubscriptionsByUser(userId: number): Promise<Subscription[]>;
  getActiveSubscription(userId: number): Promise<Subscription | undefined>;

  // Merch
  getMerchProducts(): Promise<MerchProduct[]>;
  getMerchProductById(id: number): Promise<MerchProduct | undefined>;
  createMerchOrder(data: InsertMerchOrder): Promise<MerchOrder>;
  getMerchOrdersByUser(userId: number): Promise<MerchOrder[]>;
  updateMerchOrderStatus(orderId: number, status: string, stripeSessionId?: string): Promise<MerchOrder | undefined>;
}

export class DrizzleStorage implements IStorage {
  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.email, email)).all();
    return rows[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const rows = await db.select().from(users).where(eq(users.id, id)).all();
    return rows[0];
  }

  async createUser(data: InsertUser): Promise<User> {
    const rows = await db.insert(users).values(data).returning().all();
    return rows[0];
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).all();
  }

  async updateUserBelt(userId: number, belt: string, stripes: number): Promise<User | undefined> {
    const rows = await db.update(users)
      .set({ belt, stripes })
      .where(eq(users.id, userId))
      .returning().all();
    return rows[0];
  }

  async createTrainingDay(data: InsertTrainingDay): Promise<TrainingDay> {
    const rows = await db.insert(trainingDays).values(data).returning().all();
    return rows[0];
  }

  async updateTrainingDay(id: number, data: Partial<InsertTrainingDay>): Promise<TrainingDay | undefined> {
    const rows = await db.update(trainingDays).set(data).where(eq(trainingDays.id, id)).returning().all();
    return rows[0];
  }

  async deleteTrainingDay(id: number): Promise<void> {
    // Delete drills first (FK constraint)
    await db.delete(techniqueDrills).where(eq(techniqueDrills.trainingDayId, id)).run();
    await db.delete(trainingDays).where(eq(trainingDays.id, id)).run();
  }

  async createDrill(data: InsertTechniqueDrill): Promise<TechniqueDrill> {
    const rows = await db.insert(techniqueDrills).values(data).returning().all();
    return rows[0];
  }

  async updateDrill(id: number, data: Partial<InsertTechniqueDrill>): Promise<TechniqueDrill | undefined> {
    const rows = await db.update(techniqueDrills).set(data).where(eq(techniqueDrills.id, id)).returning().all();
    return rows[0];
  }

  async deleteDrill(id: number): Promise<void> {
    await db.delete(techniqueDrills).where(eq(techniqueDrills.id, id)).run();
  }

  async updateUserSubscription(userId: number, status: string, plan: string | null, expiry: string | null): Promise<User | undefined> {
    const rows = await db.update(users)
      .set({ subscriptionStatus: status, subscriptionPlan: plan, subscriptionExpiry: expiry })
      .where(eq(users.id, userId))
      .returning().all();
    return rows[0];
  }

  async getTrainingDays(): Promise<TrainingDay[]> {
    return db.select().from(trainingDays).all();
  }

  async getTrainingDaysByMonth(year: number, month: number): Promise<TrainingDay[]> {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${year}-${String(month).padStart(2, "0")}-31`;
    return db.select().from(trainingDays).where(and(gte(trainingDays.date, start), lte(trainingDays.date, end))).all();
  }

  async getTrainingDayById(id: number): Promise<TrainingDay | undefined> {
    const rows = await db.select().from(trainingDays).where(eq(trainingDays.id, id)).all();
    return rows[0];
  }

  async getDrillsByTrainingDay(trainingDayId: number): Promise<TechniqueDrill[]> {
    const rows = await db.select().from(techniqueDrills)
      .where(eq(techniqueDrills.trainingDayId, trainingDayId))
      .all();
    return rows.sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async getSessionsByUser(userId: number): Promise<SessionLog[]> {
    return db.select().from(sessionLogs).where(eq(sessionLogs.userId, userId)).all();
  }

  async getSessionsByUserAndDate(userId: number, from: string, to: string): Promise<SessionLog[]> {
    return db.select().from(sessionLogs)
      .where(and(eq(sessionLogs.userId, userId), gte(sessionLogs.date, from), lte(sessionLogs.date, to)))
      .all();
  }

  async createSessionLog(data: InsertSessionLog): Promise<SessionLog> {
    const rows = await db.insert(sessionLogs).values(data).returning().all();
    return rows[0];
  }

  async getUserStats(userId: number): Promise<{ totalSessions: number; totalMinutes: number; avgRating: number; streak: number }> {
    const logs = await db.select().from(sessionLogs).where(eq(sessionLogs.userId, userId)).all();
    const totalSessions = logs.length;
    const totalMinutes = logs.reduce((s, l) => s + (l.durationMinutes || 0), 0);
    const ratings = logs.filter(l => l.rating !== null).map(l => l.rating as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    // Calculate current streak (consecutive days with sessions)
    const uniqueDates = [...new Set(logs.map(l => l.date))].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = expected.toISOString().split("T")[0];
      if (uniqueDates[i] === expectedStr) streak++;
      else break;
    }

    return { totalSessions, totalMinutes, avgRating: Math.round(avgRating * 10) / 10, streak };
  }

  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const rows = await db.insert(subscriptions).values(data).returning().all();
    return rows[0];
  }

  async getSubscriptionsByUser(userId: number): Promise<Subscription[]> {
    return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).all();
  }

  async getActiveSubscription(userId: number): Promise<Subscription | undefined> {
    const rows = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
      .all();
    return rows[0];
  }

  async getMerchProducts(): Promise<MerchProduct[]> {
    return db.select().from(merchProducts).all();
  }

  async getMerchProductById(id: number): Promise<MerchProduct | undefined> {
    const rows = await db.select().from(merchProducts).where(eq(merchProducts.id, id)).all();
    return rows[0];
  }

  async createMerchOrder(data: InsertMerchOrder): Promise<MerchOrder> {
    const rows = await db.insert(merchOrders).values(data).returning().all();
    return rows[0];
  }

  async getMerchOrdersByUser(userId: number): Promise<MerchOrder[]> {
    return db.select().from(merchOrders).where(eq(merchOrders.userId, userId)).all();
  }

  async updateMerchOrderStatus(orderId: number, status: string, stripeSessionId?: string): Promise<MerchOrder | undefined> {
    const rows = await db.update(merchOrders)
      .set({ status, ...(stripeSessionId ? { stripeSessionId } : {}) })
      .where(eq(merchOrders.id, orderId))
      .returning().all();
    return rows[0];
  }
}

export const storage = new DrizzleStorage();
