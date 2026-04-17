import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, CreditCard, Shield, Zap, Crown, Star,
  Lock, ArrowRight, Loader2
} from "lucide-react";

const PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: 29.99,
    period: "month",
    icon: Star,
    color: "border-blue-500/50",
    highlight: false,
    features: [
      "Interactive training calendar",
      "Daily technique scripts",
      "Session logging",
      "Progress tracking",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49.99,
    period: "month",
    icon: Zap,
    color: "border-primary",
    highlight: true,
    features: [
      "Everything in Basic",
      "Embedded video playlists",
      "Advanced analytics",
      "Priority support",
      "Competition prep modules",
    ],
  },
  {
    id: "annual",
    name: "Annual Pro",
    price: 399.99,
    period: "year",
    icon: Crown,
    color: "border-accent/50",
    highlight: false,
    features: [
      "Everything in Pro",
      "Save $200/year vs monthly",
      "Exclusive seminar access",
      "1-on-1 instructor feedback (2/mo)",
      "Badge & belt milestone tracking",
    ],
  },
];

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  return v.replace(/\D/g, "").slice(0, 4).replace(/(.{2})/, "$1/").replace(/\/$/, "");
}

export default function SubscriptionPage() {
  const { user, loading, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [step, setStep] = useState<"plans" | "checkout" | "success">("plans");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  if (!loading && !user) { navigate("/login"); return null; }

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["/api/subscriptions"],
    enabled: !!user,
  });

  const checkout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/subscriptions/checkout", {
      plan: selectedPlan,
      cardName,
      cardNumber: cardNumber.replace(/\s/g, ""),
      cardExpiry,
      cardCvc,
    }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      await refreshUser();
      setStep("success");
    },
    onError: (e: any) => {
      toast({ title: "Payment failed", description: e.message, variant: "destructive" });
    },
  });

  const activeSub = (subscriptions as any[]).find((s: any) => s.status === "active");
  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
      toast({ title: "Missing fields", description: "Please fill in all payment details.", variant: "destructive" });
      return;
    }
    checkout.mutate();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {user?.subscriptionStatus === "active"
              ? `You're on the ${user.subscriptionPlan?.toUpperCase()} plan, active until ${user.subscriptionExpiry}`
              : "Choose a plan to unlock full access."}
          </p>
        </div>

        {/* Active subscription banner */}
        {user?.subscriptionStatus === "active" && activeSub && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">Active Subscription</p>
                <p className="text-xs text-muted-foreground">
                  {activeSub.plan.toUpperCase()} plan · ${activeSub.amount}/
                  {activeSub.period === "annual" ? "year" : "month"} ·
                  Renews {activeSub.endDate}
                  {activeSub.lastFour && ` · ····${activeSub.lastFour}`}
                </p>
              </div>
              <Badge className="bg-primary/20 text-primary">Active</Badge>
            </CardContent>
          </Card>
        )}

        {step === "success" ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Payment successful!</h2>
              <p className="text-muted-foreground text-sm mb-6">
                You're now on the {selectedPlanData?.name} plan. Start exploring your training library.
              </p>
              <Button onClick={() => { setStep("plans"); navigate("/calendar"); }} className="gap-2">
                Go to Training Calendar <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ) : step === "checkout" ? (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Order summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-foreground font-medium">{selectedPlanData?.name} Plan</span>
                    <span className="text-sm font-bold text-foreground">
                      ${selectedPlanData?.price}/{selectedPlanData?.period}
                    </span>
                  </div>
                  <Separator />
                  <ul className="space-y-1.5">
                    {selectedPlanData?.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Separator />
                  <div className="flex justify-between text-base font-bold text-foreground">
                    <span>Total</span>
                    <span>${selectedPlanData?.price}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs text-muted-foreground"
                  onClick={() => setStep("plans")}
                  data-testid="btn-change-plan"
                >
                  Change plan
                </Button>
              </CardContent>
            </Card>

            {/* Payment form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Payment Details
                </CardTitle>
                <CardDescription className="text-xs">
                  Your info is secured with 256-bit encryption (prototype demo — no real charges).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <Label className="text-xs mb-1.5 block">Cardholder name</Label>
                    <Input
                      value={cardName}
                      onChange={e => setCardName(e.target.value)}
                      placeholder="John Silva"
                      required
                      data-testid="input-card-name"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Card number</Label>
                    <Input
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      required
                      data-testid="input-card-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block">Expiry</Label>
                      <Input
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                        data-testid="input-card-expiry"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">CVC</Label>
                      <Input
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        required
                        data-testid="input-card-cvc"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={checkout.isPending} data-testid="btn-pay">
                    {checkout.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Pay ${selectedPlanData?.price}</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Prototype demo — no real payment processed
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Plan selection */
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {PLANS.map(plan => {
                const Icon = plan.icon;
                const isSelected = selectedPlan === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all border-2 ${
                      isSelected ? plan.color + " bg-primary/5" : "border-border"
                    } ${plan.highlight && !isSelected ? "ring-1 ring-primary/20" : ""} hover-elevate`}
                    onClick={() => setSelectedPlan(plan.id)}
                    data-testid={`plan-card-${plan.id}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                        </div>
                        {plan.highlight && (
                          <Badge className="text-[10px] bg-primary text-primary-foreground">Popular</Badge>
                        )}
                      </div>
                      <div className="mt-1">
                        <span className="text-2xl font-bold text-foreground">${plan.price}</span>
                        <span className="text-xs text-muted-foreground">/{plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map(f => (
                          <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center pt-2">
              <Button
                size="lg"
                className="gap-2 px-8"
                onClick={() => setStep("checkout")}
                data-testid="btn-proceed-checkout"
              >
                Continue with {selectedPlanData?.name} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Billing history */}
            {(subscriptions as any[]).length > 0 && (
              <Card className="mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Billing History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(subscriptions as any[]).map((sub: any) => (
                      <div key={sub.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0" data-testid={`billing-row-${sub.id}`}>
                        <div>
                          <span className="font-medium text-foreground capitalize">{sub.plan} plan</span>
                          <span className="text-xs text-muted-foreground ml-2">{sub.startDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-foreground font-medium">${sub.amount}</span>
                          <Badge className={sub.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"} variant="outline">
                            {sub.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
