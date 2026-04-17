import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/Login";
import RegisterPage from "@/pages/Register";
import DashboardPage from "@/pages/Dashboard";
import CalendarPage from "@/pages/Calendar";
import TrainingDayPage from "@/pages/TrainingDay";
import ProgressPage from "@/pages/Progress";
import SubscriptionPage from "@/pages/Subscription";
import ShopPage from "@/pages/Shop";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/lib/auth";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <Switch>
            <Route path="/" component={DashboardPage} />
            <Route path="/login" component={LoginPage} />
            <Route path="/register" component={RegisterPage} />
            <Route path="/calendar" component={CalendarPage} />
            <Route path="/training/:id" component={TrainingDayPage} />
            <Route path="/progress" component={ProgressPage} />
            <Route path="/subscription" component={SubscriptionPage} />
            <Route path="/shop" component={ShopPage} />
            <Route component={NotFound} />
          </Switch>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
