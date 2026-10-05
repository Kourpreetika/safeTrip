import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AppLayout } from "./components/Layout";
import { GuestOnly, ProtectedRoute } from "./components/Guards";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { ForgotPasswordPage } from "./pages/ForgotPassword";
import { DashboardPage } from "./pages/Dashboard";
import { CreateJourneyPage } from "./pages/CreateJourney";
import { ContactsPage } from "./pages/Contacts";
import { ActiveJourneyPage } from "./pages/ActiveJourney";
import { HistoryPage } from "./pages/History";
import { ProfilePage } from "./pages/Profile";
import { PublicTrackPage } from "./pages/PublicTrack";

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route element={<GuestOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
            <Route path="/track/:token" element={<PublicTrackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="journey/new" element={<CreateJourneyPage />} />
                <Route path="journey/:id" element={<ActiveJourneyPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="profile" element={<ProfilePage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
