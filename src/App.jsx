import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AppLayout } from "./layouts/AppLayout";
import { RequireAuth, RequireFreshPassword, RequireRole } from "./routes/ProtectedRoute";
import { AttendancePage } from "./pages/AttendancePage";
import { AuthPage } from "./pages/AuthPage";
import { CalendarPage } from "./pages/CalendarPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { ClientsPage } from "./pages/ClientsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PointsPage } from "./pages/PointsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { DailyReportsPage } from "./pages/DailyReportsPage";
import { MonitoringPage } from "./pages/MonitoringPage";
import { PayrollPage } from "./pages/PayrollPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StaffPage } from "./pages/StaffPage";
import { TasksPage } from "./pages/TasksPage";
import { TaxPage } from "./pages/TaxPage";
import { InternTasksPage } from "./pages/InternTasksPage";
import { UsersManagementPage } from "./pages/UsersManagementPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/register" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route
          path="/reset-password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />
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
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/tax" element={<TaxPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/daily-reports" element={<DailyReportsPage />} />
          <Route path="/staff-reports" element={<Navigate to="/daily-reports" replace />} />
          <Route
            path="/monitoring"
            element={
              <RequireRole allowedRoles={["owner", "developer"]}>
                <MonitoringPage />
              </RequireRole>
            }
          />
          <Route path="/staff-monitoring" element={<Navigate to="/monitoring" replace />} />
          <Route
            path="/payroll"
            element={
              <RequireRole allowedRoles={["owner", "developer", "manager", "admin"]}>
                <PayrollPage />
              </RequireRole>
            }
          />
          <Route path="/gaji-staff" element={<Navigate to="/payroll" replace />} />
          <Route path="/gaji" element={<Navigate to="/payroll" replace />} />
          <Route path="/points" element={<PointsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/intern-tasks" element={<InternTasksPage />} />
          <Route
            path="/reports"
            element={
              <RequireRole allowedRoles={["owner", "developer", "manager", "admin"]}>
                <ReportsPage />
              </RequireRole>
            }
          />
          <Route
            path="/users-management"
            element={
              <RequireRole allowedRoles={["developer"]}>
                <UsersManagementPage />
              </RequireRole>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireRole allowedRoles={["owner", "developer"]}>
                <SettingsPage />
              </RequireRole>
            }
          />
        </Route>
        
        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
