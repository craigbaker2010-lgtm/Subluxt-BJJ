import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  belt: text("belt").notNull().default("white"),
  stripes: integer("stripes").notNull().default(0),
  subscriptionStatus: text("subscription_status").notNull().default("inactive"), // active | inactive | trial
  subscriptionPlan: text("subscription_plan"), // basic | pro
  subscriptionExpiry: text("subscription_expiry"),
  avatarInitials: text("avatar_initials"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Training Days (calendar events defined by admin/seed) ───────────────────
export const trainingDays = sqliteTable("training_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // takedowns | guard | passing | submissions | sweeps | defense | sparring
  difficultyLevel: text("difficulty_level").notNull().default("all"), // beginner | intermediate | advanced | all
});

export const insertTrainingDaySchema = createInsertSchema(trainingDays).omit({ id: true });
export type InsertTrainingDay = z.infer<typeof insertTrainingDaySchema>;
export type TrainingDay = typeof trainingDays.$inferSelect;

// ─── Technique Drills (sub-sections of a training day) ──────────────────────
export const techniqueDrills = sqliteTable("technique_drills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trainingDayId: integer("training_day_id").notNull().references(() => trainingDays.id),
  orderIndex: integer("order_index").notNull().default(0),
  partLabel: text("part_label").notNull(), // e.g. "Part 1 – Warm-Up", "Part 2 – Technique"
  script: text("script").notNull(), // detailed technique instructions (markdown-like)
  videoUrl: text("video_url"), // YouTube embed URL or playlist
  videoPlatform: text("video_platform").default("youtube"), // youtube | vimeo
  durationMinutes: integer("duration_minutes").notNull().default(10),
  keyPoints: text("key_points").notNull().default("[]"), // JSON array of strings
});

export const insertTechniqueDrillSchema = createInsertSchema(techniqueDrills).omit({ id: true });
export type InsertTechniqueDrill = z.infer<typeof insertTechniqueDrillSchema>;
export type TechniqueDrill = typeof techniqueDrills.$inferSelect;

// ─── Session Logs (student progress) ────────────────────────────────────────
export const sessionLogs = sqliteTable("session_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  trainingDayId: integer("training_day_id").references(() => trainingDays.id),
  date: text("date").notNull(), // YYYY-MM-DD
  sessionType: text("session_type").notNull().default("class"), // class | open_mat | solo | competition
  durationMinutes: integer("duration_minutes").notNull().default(60),
  notes: text("notes"),
  rating: integer("rating").default(3), // 1-5
  completedDrills: text("completed_drills").notNull().default("[]"), // JSON array of drill IDs
});

export const insertSessionLogSchema = createInsertSchema(sessionLogs).omit({ id: true });
export type InsertSessionLog = z.infer<typeof insertSessionLogSchema>;
export type SessionLog = typeof sessionLogs.$inferSelect;

// ─── Subscriptions / Payment Records ─────────────────────────────────────────
export const subscriptions = sqliteTable("subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  plan: text("plan").notNull(), // basic | pro | annual
  status: text("status").notNull().default("pending"), // pending | active | cancelled | expired
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  paymentMethod: text("payment_method").default("card"),
  lastFour: text("last_four"),
  transactionId: text("transaction_id"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// ─── Merch Products ───────────────────────────────────────────────────────────
export const merchProducts = sqliteTable("merch_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: real("price").notNull(),
  category: text("category").notNull(), // gi | rashguard | shorts | hoodie | accessories
  sizes: text("sizes").notNull().default("[]"), // JSON array
  imageUrl: text("image_url"),
  badge: text("badge"), // e.g. "New", "Best Seller"
  inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
});

export const insertMerchProductSchema = createInsertSchema(merchProducts).omit({ id: true });
export type InsertMerchProduct = z.infer<typeof insertMerchProductSchema>;
export type MerchProduct = typeof merchProducts.$inferSelect;

// ─── Merch Orders ─────────────────────────────────────────────────────────────
export const merchOrders = sqliteTable("merch_orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  items: text("items").notNull(), // JSON array of {productId, name, size, qty, price}
  total: real("total").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | shipped | delivered
  stripeSessionId: text("stripe_session_id"),
  createdAt: text("created_at").notNull(),
});

export const insertMerchOrderSchema = createInsertSchema(merchOrders).omit({ id: true });
export type InsertMerchOrder = z.infer<typeof insertMerchOrderSchema>;
export type MerchOrder = typeof merchOrders.$inferSelect;
