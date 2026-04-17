import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { insertUserSchema, insertSessionLogSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export function registerRoutes(httpServer: Server, app: Express): void {
  // Health check — Railway uses this to confirm the app is running
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || "subluxt-bjj-secret-2026",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
  }));

  // ─── Auth Routes ──────────────────────────────────────────────────────────────
  app.post("/api/auth/register", (req: Request, res: Response) => {
    try {
      const body = req.body;
      const { email, name, password } = body;
      if (!email || !name || !password) {
        return res.status(400).json({ error: "Email, name, and password are required" });
      }
      const existing = storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ error: "Email already registered" });

      const hashedPassword = bcrypt.hashSync(password, 10);
      const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
      const user = storage.createUser({
        email, name, password: hashedPassword,
        belt: "white", stripes: 0,
        subscriptionStatus: "trial",
        subscriptionPlan: "basic",
        subscriptionExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        avatarInitials: initials,
      });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Email and password required" });

      const user = storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Invalid email or password" });

      const valid = bcrypt.compareSync(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid email or password" });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      return res.json({ user: safeUser });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const user = storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  });

  // ─── Training Days ────────────────────────────────────────────────────────────
  app.get("/api/training-days", (req: Request, res: Response) => {
    const { year, month } = req.query;
    if (year && month) {
      const days = storage.getTrainingDaysByMonth(Number(year), Number(month));
      return res.json(days);
    }
    return res.json(storage.getTrainingDays());
  });

  app.get("/api/training-days/:id", (req: Request, res: Response) => {
    const day = storage.getTrainingDayById(Number(req.params.id));
    if (!day) return res.status(404).json({ error: "Training day not found" });
    const drills = storage.getDrillsByTrainingDay(day.id);
    return res.json({ ...day, drills });
  });

  // ─── Session Logs ─────────────────────────────────────────────────────────────
  app.get("/api/sessions", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const { from, to } = req.query;
    if (from && to) {
      return res.json(storage.getSessionsByUserAndDate(req.session.userId, String(from), String(to)));
    }
    return res.json(storage.getSessionsByUser(req.session.userId));
  });

  app.post("/api/sessions", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const data = {
        ...req.body,
        userId: req.session.userId,
        completedDrills: JSON.stringify(req.body.completedDrills || []),
      };
      const log = storage.createSessionLog(data);
      return res.json(log);
    } catch (e: any) {
      return res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/stats", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const stats = storage.getUserStats(req.session.userId);
    return res.json(stats);
  });

  // ─── Subscriptions ────────────────────────────────────────────────────────────
  app.get("/api/subscriptions", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    const subs = storage.getSubscriptionsByUser(req.session.userId);
    return res.json(subs);
  });

  app.post("/api/subscriptions/checkout", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { plan, cardNumber, cardExpiry, cardCvc, cardName } = req.body;
      if (!plan || !cardNumber || !cardExpiry || !cardCvc || !cardName) {
        return res.status(400).json({ error: "All payment fields are required" });
      }

      const plans: Record<string, { amount: number; months: number }> = {
        basic: { amount: 29.99, months: 1 },
        pro: { amount: 49.99, months: 1 },
        annual: { amount: 399.99, months: 12 },
      };

      const planDetails = plans[plan];
      if (!planDetails) return res.status(400).json({ error: "Invalid plan" });

      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + planDetails.months * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const lastFour = String(cardNumber).replace(/\s/g, "").slice(-4);
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

      const sub = storage.createSubscription({
        userId: req.session.userId,
        plan,
        status: "active",
        amount: planDetails.amount,
        currency: "USD",
        startDate,
        endDate,
        paymentMethod: "card",
        lastFour,
        transactionId,
      });

      // Update user subscription status
      storage.updateUserSubscription(req.session.userId, "active", plan, endDate);

      return res.json({ subscription: sub, transactionId });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });

  // ─── Merch Routes ──────────────────────────────────────────────────────────────
  app.get("/api/merch/products", (_req: Request, res: Response) => {
    const products = storage.getMerchProducts();
    return res.json(products);
  });

  app.get("/api/merch/products/:id", (req: Request, res: Response) => {
    const product = storage.getMerchProductById(Number(req.params.id));
    if (!product) return res.status(404).json({ error: "Product not found" });
    return res.json(product);
  });

  app.get("/api/merch/orders", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    return res.json(storage.getMerchOrdersByUser(req.session.userId));
  });

  // Simulate Stripe checkout — creates order record, returns a fake session ID
  // In production: swap this for a real Stripe Checkout Session creation
  app.post("/api/merch/checkout", (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
    try {
      const { items, cardNumber, cardExpiry, cardCvc, cardName } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }
      if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
        return res.status(400).json({ error: "All payment fields are required" });
      }

      const total = items.reduce((sum: number, item: any) => sum + item.price * item.qty, 0);
      const fakeSessionId = `cs_test_${Date.now()}_${Math.random().toString(36).substr(2, 10)}`;

      const order = storage.createMerchOrder({
        userId: req.session.userId,
        items: JSON.stringify(items),
        total: Math.round(total * 100) / 100,
        status: "paid",
        stripeSessionId: fakeSessionId,
        createdAt: new Date().toISOString().split("T")[0],
      });

      return res.json({ order, sessionId: fakeSessionId });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  });
}
