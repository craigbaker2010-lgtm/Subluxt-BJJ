import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, X, CreditCard, CheckCircle, Package, ShoppingBag, Shirt, Play, Download, Lock, ChevronRight, Star } from "lucide-react";
import type { MerchProduct } from "@shared/schema";

interface CartItem {
  productId: number;
  name: string;
  size: string;
  qty: number;
  price: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Items",
  gi: "Gi",
  rashguard: "Rashguards",
  shorts: "Shorts",
  hoodie: "Hoodies",
  accessories: "Accessories",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  gi: <Package className="w-3.5 h-3.5" />,
  rashguard: <Shirt className="w-3.5 h-3.5" />,
  shorts: <ShoppingBag className="w-3.5 h-3.5" />,
  hoodie: <Shirt className="w-3.5 h-3.5" />,
  accessories: <ShoppingBag className="w-3.5 h-3.5" />,
};

// Category art — colored squares with category icon since we have no product images
const CATEGORY_COLORS: Record<string, string> = {
  gi: "from-[hsl(214_52%_18%)] to-[hsl(214_52%_28%)]",
  rashguard: "from-[hsl(5_72%_20%)] to-[hsl(5_72%_35%)]",
  shorts: "from-[hsl(270_40%_18%)] to-[hsl(270_40%_28%)]",
  hoodie: "from-[hsl(216_18%_14%)] to-[hsl(216_18%_22%)]",
  accessories: "from-[hsl(210_15%_18%)] to-[hsl(210_15%_28%)]",
};

function ProductCard({ product, onAddToCart }: { product: MerchProduct; onAddToCart: (p: MerchProduct, size: string) => void }) {
  const sizes: string[] = JSON.parse(product.sizes || "[]");
  const [selectedSize, setSelectedSize] = useState(sizes[0] || "");
  const gradClass = CATEGORY_COLORS[product.category] || "from-muted to-card";

  return (
    <Card className="bg-card border-border overflow-hidden hover-elevate group" data-testid={`card-product-${product.id}`}>
      {/* Product visual */}
      <div className={`relative h-44 bg-gradient-to-br ${gradClass} flex items-center justify-center`}>
        {product.badge && (
          <Badge
            className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5"
            style={{ background: "hsl(5 72% 44%)", color: "#fff", border: "none" }}
          >
            {product.badge}
          </Badge>
        )}
        <div className="flex flex-col items-center gap-2 opacity-40">
          <Package className="w-14 h-14 text-foreground/60" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-foreground/40">
            {CATEGORY_LABELS[product.category] || product.category}
          </span>
        </div>
        {/* Subtle octopus texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0px, hsl(var(--foreground)) 1px, transparent 1px, transparent 12px)",
          }}
        />
      </div>

      <CardContent className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-sm text-foreground leading-snug" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{product.description}</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-lg font-black text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            ${product.price.toFixed(2)}
          </span>
          {product.inStock ? (
            <span className="text-[10px] font-semibold text-emerald-400 tracking-wide uppercase">In Stock</span>
          ) : (
            <span className="text-[10px] font-semibold text-muted-foreground tracking-wide uppercase">Out of Stock</span>
          )}
        </div>

        {sizes.length > 0 && (
          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger className="h-8 text-xs border-border" data-testid={`select-size-${product.id}`}>
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          size="sm"
          className="w-full gap-1.5 text-xs font-bold"
          style={{ background: "hsl(5 72% 44%)", border: "none" }}
          disabled={!product.inStock || !selectedSize}
          onClick={() => onAddToCart(product, selectedSize)}
          data-testid={`btn-add-to-cart-${product.id}`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}

function CartSidebar({
  cart,
  onRemove,
  onClose,
  onCheckout,
}: {
  cart: CartItem[];
  onRemove: (idx: number) => void;
  onClose: () => void;
  onCheckout: () => void;
}) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-sidebar-background border-l border-border flex flex-col h-full shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>Cart</span>
            <Badge className="text-[10px]" style={{ background: "hsl(5 72% 44%)", color: "#fff", border: "none" }}>{cart.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 opacity-30" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 border-b border-border pb-3" data-testid={`cart-item-${item.productId}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground leading-snug">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Size: {item.size} · Qty: {item.qty}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold text-foreground">${(item.price * item.qty).toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="w-5 h-5 text-muted-foreground hover:text-destructive" onClick={() => onRemove(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-black text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                ${total.toFixed(2)}
              </span>
            </div>
            <Button
              className="w-full font-bold gap-2"
              style={{ background: "hsl(5 72% 44%)", border: "none" }}
              onClick={onCheckout}
              data-testid="btn-checkout"
            >
              <CreditCard className="w-4 h-4" />
              Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutDialog({
  open,
  cart,
  onClose,
  onSuccess,
}: {
  open: boolean;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ cardName: "", cardNumber: "", cardExpiry: "", cardCvc: "" });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const checkoutMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/merch/checkout", {
        items: cart,
        ...data,
      }),
    onSuccess: async (res) => {
      const json = await res.json();
      toast({ title: "Order confirmed!", description: `Order #${json.order.id} — $${json.order.total.toFixed(2)}` });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Payment failed", description: "Please check your card details and try again.", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-black" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Complete Your Order
          </DialogTitle>
        </DialogHeader>

        {checkoutMutation.isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
            <div>
              <p className="font-bold text-foreground">Order Confirmed!</p>
              <p className="text-sm text-muted-foreground mt-1">
                You'll receive a confirmation shortly. Your gear is on its way.
              </p>
            </div>
            <Button onClick={onClose} className="mt-2" style={{ background: "hsl(5 72% 44%)", border: "none" }}>
              Back to Shop
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Order summary */}
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.name} ({item.size}) ×{item.qty}</span>
                  <span className="text-foreground font-medium">${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Cardholder Name</Label>
                <Input
                  className="mt-1 h-9 text-sm border-border bg-muted/20"
                  placeholder="Alex Rivera"
                  value={form.cardName}
                  onChange={e => setForm(f => ({ ...f, cardName: e.target.value }))}
                  required
                  data-testid="input-card-name"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Card Number</Label>
                <Input
                  className="mt-1 h-9 text-sm border-border bg-muted/20"
                  placeholder="4242 4242 4242 4242"
                  value={form.cardNumber}
                  onChange={e => setForm(f => ({ ...f, cardNumber: e.target.value }))}
                  required
                  maxLength={19}
                  data-testid="input-card-number"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Expiry</Label>
                  <Input
                    className="mt-1 h-9 text-sm border-border bg-muted/20"
                    placeholder="MM/YY"
                    value={form.cardExpiry}
                    onChange={e => setForm(f => ({ ...f, cardExpiry: e.target.value }))}
                    required
                    maxLength={5}
                    data-testid="input-card-expiry"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CVC</Label>
                  <Input
                    className="mt-1 h-9 text-sm border-border bg-muted/20"
                    placeholder="123"
                    value={form.cardCvc}
                    onChange={e => setForm(f => ({ ...f, cardCvc: e.target.value }))}
                    required
                    maxLength={4}
                    data-testid="input-card-cvc"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              <span>Secured checkout · Powered by Stripe</span>
            </div>

            <Button
              type="submit"
              className="w-full font-bold gap-2"
              style={{ background: "hsl(5 72% 44%)", border: "none" }}
              disabled={checkoutMutation.isPending}
              data-testid="btn-submit-order"
            >
              {checkoutMutation.isPending ? "Processing..." : `Pay $${total.toFixed(2)}`}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Digital Instructionals Data ─────────────────────────────────────────────
const DIGITAL_COURSES = [
  {
    id: "back-system",
    title: "Attacking the Back",
    tagline: "They can't tap what they can't see coming.",
    description:
      "A complete back-attack system from first hook to finish. 7 chapters covering harness control, seat belt adjustments, breaking defenses, and iron-clad RNC mechanics — plus the sneaky entries nobody sees coming.",
    instructor: "Craig Baker",
    price: 79.99,
    chapters: 7,
    duration: "4h 22min",
    level: "All Levels",
    badge: "Featured",
    topics: [
      "Body triangle vs. double hooks",
      "Seat belt adjustments under pressure",
      "Breaking the two-on-one defense",
      "Bow-and-arrow from the back",
      "Mata leão — the iron grip finish",
      "Back retention when they roll",
      "Entries: rolling back take, clock choke counter",
    ],
  },
  {
    id: "guard-mastery",
    title: "Guard Mastery Series",
    tagline: "The floor is your home court.",
    description:
      "Closed guard, De La Riva, spider guard, and butterfly — all under one roof. Build the guard game that frustrates every passer and creates submission opportunities from every position.",
    instructor: "Craig Baker",
    price: 69.99,
    chapters: 9,
    duration: "5h 10min",
    level: "Beginner–Intermediate",
    badge: "New",
    topics: [
      "Closed guard posture control",
      "Hip bump & scissor sweep combos",
      "De La Riva hook mechanics",
      "Spider guard distance management",
      "Butterfly lift and hook sweep",
      "Triangle and armbar from guard",
      "Guard retention fundamentals",
    ],
  },
  {
    id: "leg-locks",
    title: "Leg Lock Laboratory",
    tagline: "The legs are just arms you haven't attacked yet.",
    description:
      "Ashi garami, inside heel hook, outside heel hook, and kneebar — built from the ground up. Includes positional control, reaping mechanics, and the submission sequences that win tournaments.",
    instructor: "Craig Baker",
    price: 64.99,
    chapters: 6,
    duration: "3h 48min",
    level: "Intermediate–Advanced",
    badge: null,
    topics: [
      "Ashi garami control",
      "Straight ankle lock mechanics",
      "Inside heel hook entries",
      "Outside heel hook finish",
      "Kneebar from top position",
      "Leg lock chains & counters",
    ],
  },
];

function DigitalCourseCard({ course, onBuy }: { course: typeof DIGITAL_COURSES[0]; onBuy: (course: typeof DIGITAL_COURSES[0]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isFeatured = course.badge === "Featured";

  return (
    <div
      className={`relative rounded-xl border overflow-hidden transition-all duration-200 ${
        isFeatured
          ? "border-primary/50 bg-gradient-to-br from-[hsl(5_72%_10%)] via-card to-[hsl(214_52%_12%)]"
          : "border-border bg-card"
      }`}
      data-testid={`card-digital-${course.id}`}
    >
      {/* Featured glow */}
      {isFeatured && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top left, hsl(5 72% 44% / 0.08) 0%, transparent 65%)" }}
        />
      )}

      <div className="relative p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {course.badge && (
                <Badge
                  className="text-[10px] font-bold px-2 py-0"
                  style={{
                    background: isFeatured ? "hsl(5 72% 44%)" : "hsl(214 52% 30%)",
                    color: "#fff",
                    border: "none",
                  }}
                >
                  {course.badge}
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Digital Instructional
              </span>
            </div>
            <h3
              className="font-black text-foreground leading-tight"
              style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: "1.1rem" }}
            >
              {course.title}
            </h3>
            <p
              className="text-sm mt-0.5 font-medium"
              style={{ color: isFeatured ? "hsl(5 72% 65%)" : "hsl(var(--muted-foreground))" }}
            >
              {course.tagline}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              ${course.price.toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">one-time · lifetime access</div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Play className="w-3 h-3" />{course.chapters} chapters</span>
          <span className="flex items-center gap-1"><Download className="w-3 h-3" />{course.duration}</span>
          <span className="flex items-center gap-1"><Star className="w-3 h-3" />{course.level}</span>
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" />Lifetime access</span>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground leading-relaxed">{course.description}</p>

        {/* Expandable chapter list */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors w-fit"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`} />
          {expanded ? "Hide" : "Show"} chapters
        </button>

        {expanded && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 pl-1">
            {course.topics.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <span className="text-primary mt-0.5 flex-shrink-0">▸</span>
                {t}
              </li>
            ))}
          </ul>
        )}

        {/* CTA */}
        <Button
          className="w-full font-bold gap-2 mt-1"
          style={{
            background: isFeatured ? "hsl(5 72% 44%)" : "hsl(214 52% 28%)",
            border: "none",
          }}
          onClick={() => onBuy(course)}
          data-testid={`btn-buy-digital-${course.id}`}
        >
          <Play className="w-4 h-4" />
          Get Instant Access · ${course.price.toFixed(2)}
        </Button>
      </div>
    </div>
  );
}

function DigitalCheckoutDialog({
  open,
  course,
  onClose,
}: {
  open: boolean;
  course: typeof DIGITAL_COURSES[0] | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ cardName: "", cardNumber: "", cardExpiry: "", cardCvc: "" });
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate payment processing
    setTimeout(() => {
      toast({ title: "Purchase complete!", description: `"${course?.title}" is now in your library.` });
      setDone(true);
    }, 900);
  };

  const handleClose = () => { setDone(false); setForm({ cardName: "", cardNumber: "", cardExpiry: "", cardCvc: "" }); onClose(); };

  if (!course) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-black" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            {done ? "You're In" : "Get Instant Access"}
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-400" />
            <div>
              <p className="font-bold text-foreground text-lg">{course.title}</p>
              <p className="text-sm text-muted-foreground mt-1">Access unlocked. Check your training library.</p>
            </div>
            <Button onClick={handleClose} style={{ background: "hsl(5 72% 44%)", border: "none" }}>Start Watching</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-muted/20 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{course.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{course.chapters} chapters · {course.duration} · Lifetime access</p>
              </div>
              <span className="text-lg font-black text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
                ${course.price.toFixed(2)}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Cardholder Name</Label>
                <Input className="mt-1 h-9 text-sm border-border bg-muted/20" placeholder="Alex Rivera" value={form.cardName} onChange={e => setForm(f => ({ ...f, cardName: e.target.value }))} required data-testid="input-digital-card-name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Card Number</Label>
                <Input className="mt-1 h-9 text-sm border-border bg-muted/20" placeholder="4242 4242 4242 4242" value={form.cardNumber} onChange={e => setForm(f => ({ ...f, cardNumber: e.target.value }))} required maxLength={19} data-testid="input-digital-card-number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Expiry</Label>
                  <Input className="mt-1 h-9 text-sm border-border bg-muted/20" placeholder="MM/YY" value={form.cardExpiry} onChange={e => setForm(f => ({ ...f, cardExpiry: e.target.value }))} required maxLength={5} data-testid="input-digital-expiry" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">CVC</Label>
                  <Input className="mt-1 h-9 text-sm border-border bg-muted/20" placeholder="123" value={form.cardCvc} onChange={e => setForm(f => ({ ...f, cardCvc: e.target.value }))} required maxLength={4} data-testid="input-digital-cvc" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span>Secured checkout · Powered by Stripe</span>
            </div>

            <Button type="submit" className="w-full font-bold gap-2" style={{ background: "hsl(5 72% 44%)", border: "none" }} data-testid="btn-submit-digital">
              <Play className="w-4 h-4" />
              Pay ${course.price.toFixed(2)} · Instant Access
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [digitalCourse, setDigitalCourse] = useState<typeof DIGITAL_COURSES[0] | null>(null);
  const [digitalCheckoutOpen, setDigitalCheckoutOpen] = useState(false);

  const handleBuyDigital = (course: typeof DIGITAL_COURSES[0]) => {
    setDigitalCourse(course);
    setDigitalCheckoutOpen(true);
  };

  const { data: products = [], isLoading } = useQuery<MerchProduct[]>({
    queryKey: ["/api/merch/products"],
  });

  const filteredProducts = activeCategory === "all"
    ? products
    : products.filter(p => p.category === activeCategory);

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category)))];

  const addToCart = (product: MerchProduct, size: string) => {
    setCart(prev => {
      const existing = prev.findIndex(i => i.productId === product.id && i.size === size);
      if (existing >= 0) {
        return prev.map((item, i) => i === existing ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { productId: product.id, name: product.name, size, qty: 1, price: product.price }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (idx: number) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCheckoutSuccess = () => {
    setCart([]);
    setCheckoutOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
            Subluxt Gear
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Official apparel and equipment</p>
        </div>
        <Button
          variant="outline"
          className="relative gap-2 border-border"
          onClick={() => setCartOpen(true)}
          data-testid="btn-open-cart"
        >
          <ShoppingCart className="w-4 h-4" />
          Cart
          {cart.length > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: "hsl(5 72% 44%)", color: "#fff" }}
            >
              {cart.length}
            </span>
          )}
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className={`gap-1.5 text-xs h-7 ${activeCategory === cat ? "" : "border-border text-muted-foreground hover:text-foreground"}`}
            style={activeCategory === cat ? { background: "hsl(5 72% 44%)", border: "none" } : {}}
            data-testid={`filter-${cat}`}
          >
            {CATEGORY_ICONS[cat]}
            {CATEGORY_LABELS[cat] || cat}
          </Button>
        ))}
      </div>

      {/* ── Digital Instructionals ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-black text-foreground" style={{ fontFamily: "'Cabinet Grotesk', sans-serif" }}>
              Digital Instructionals
            </h2>
            <p className="text-xs text-muted-foreground">Full system video courses · One-time purchase · Lifetime access</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {DIGITAL_COURSES.map(course => (
            <DigitalCourseCard key={course.id} course={course} onBuy={handleBuyDigital} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Apparel &amp; Gear</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-72 rounded-xl" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">No products in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={addToCart} />
          ))}
        </div>
      )}

      {/* Cart sidebar */}
      {cartOpen && (
        <CartSidebar
          cart={cart}
          onRemove={removeFromCart}
          onClose={() => setCartOpen(false)}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}

      {/* Checkout dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        cart={cart}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={handleCheckoutSuccess}
      />

      {/* Digital checkout dialog */}
      <DigitalCheckoutDialog
        open={digitalCheckoutOpen}
        course={digitalCourse}
        onClose={() => { setDigitalCheckoutOpen(false); }}
      />
    </div>
  );
}
