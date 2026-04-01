import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import NotFound from "@/pages/not-found";
import RevenueLiftPage from "@/pages/revenue-lift";
import Dashboard from "@/pages/dashboard";
import EncounterNew from "@/pages/encounter-new";
import EncounterDetail from "@/pages/encounter-detail";
import HPEPage from "@/pages/hpe";
import FieldMapPage from "@/pages/field-map";

const queryClient = new QueryClient();

function Router() {
  return (
    <>
      <Header />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/encounter/new" component={EncounterNew} />
        <Route path="/encounter/:id" component={EncounterDetail} />
        <Route path="/hpe" component={HPEPage} />
        <Route path="/revenue-lift" component={RevenueLiftPage} />
        <Route path="/field-map" component={FieldMapPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
