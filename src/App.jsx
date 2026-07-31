import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./layouts/AppLayout";
import { RequireAuth, RequireFreshPassword } from "./routes/ProtectedRoute";
import { AdminDosenPage } from "./pages/AdminDosenPage";
import { AttendancePage } from "./pages/AttendancePage";
import { AuthPage } from "./pages/AuthPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MediaPage } from "./pages/MediaPage";
import { PointsPage } from "./pages/PointsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StaffPage } from "./pages/StaffPage";
import { SuratLuarPage } from "./pages/SuratLuarPage";
import { TasksPage } from "./pages/TasksPage";
import { TaxPage } from "./pages/TaxPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/reset-password" element={<AuthPage mode="reset" />} />
        <Route
          path="/change-password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />

        <Route
          element={
            <RequireAuth>
              <RequireFreshPassword>
                <AppLayout />
              </RequireFreshPassword>
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tax" element={<TaxPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/admin-dosen" element={<AdminDosenPage />} />
          <Route path="/surat-keluar" element={<SuratLuarPage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster richColors />
    </>
  );
}
