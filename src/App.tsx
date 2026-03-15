import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import TrackerPage from "./pages/TrackerPage";
import GlobalDashboardPage from "./pages/GlobalDashboardPage";
import ClientInputPage from "./pages/ClientInputPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import { autoInitializeAllProducts, restoreSeedTargetsOnce } from "@/lib/seedData";

// Seed all products on first visit (localStorage is empty on new domains after publish)
autoInitializeAllProducts();
restoreSeedTargetsOnce();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <GlobalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/global"
              element={
                <ProtectedRoute>
                  <GlobalDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tracker"
              element={
                <ProtectedRoute>
                  <TrackerPage />
                </ProtectedRoute>
              }
            />
            <Route path="/product" element={<Navigate to="/tracker" replace />} />
            <Route
              path="/clients"
              element={
                <ProtectedRoute requireRole="editor">
                  <ClientInputPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute requireRole="editor">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
