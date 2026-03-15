import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TrackerPage from "./pages/TrackerPage";
import GlobalDashboardPage from "./pages/GlobalDashboardPage";
import ClientInputPage from "./pages/ClientInputPage";
import NotFound from "./pages/NotFound";
import { autoInitializeAllProducts, restoreSeedTargetsOnce } from "@/lib/seedData";

// Seed all products on first visit (localStorage is empty on new domains after publish)
autoInitializeAllProducts();
restoreSeedTargetsOnce();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GlobalDashboardPage />} />
          <Route path="/global" element={<GlobalDashboardPage />} />
          <Route path="/tracker" element={<TrackerPage />} />
          <Route path="/product" element={<Navigate to="/tracker" replace />} />
          <Route path="/clients" element={<ClientInputPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
