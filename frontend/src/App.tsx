/** App root — routing with lazy-loaded pages + auth guard. */

import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { ChangelogOverlay } from "./components/ChangelogOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { useLocaleSync } from "./hooks/useLocale";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const SleepPage = lazy(() => import("./pages/SleepPage"));
const FeedingPage = lazy(() => import("./pages/FeedingPage"));
const DiaperPage = lazy(() => import("./pages/DiaperPage"));
const ChildrenPage = lazy(() => import("./pages/ChildrenPage"));
const TemperaturePage = lazy(() => import("./pages/TemperaturePage"));
const WeightPage = lazy(() => import("./pages/WeightPage"));
const MedicationPage = lazy(() => import("./pages/MedicationPage"));
const HealthPage = lazy(() => import("./pages/HealthPage"));
const TodoPage = lazy(() => import("./pages/TodoPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const MedicationMastersPage = lazy(() => import("./pages/MedicationMastersPage"));
const TagsPage = lazy(() => import("./pages/TagsPage"));
const TagDetailPage = lazy(() => import("./pages/TagDetailPage"));
const AlertConfigPage = lazy(() => import("./pages/AlertConfigPage"));
const PluginConfigPage = lazy(() => import("./pages/PluginConfigPage"));
const ApiKeyPage = lazy(() => import("./pages/ApiKeyPage"));
const TummyTimePage = lazy(() => import("./pages/TummyTimePage"));
const MilestonesPage = lazy(() => import("./pages/MilestonesPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const AuthSettingsPage = lazy(() => import("./pages/AuthSettingsPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authMode, loading } = useAuth();

  if (loading) return <LoadingSpinner />;

  // disabled + forward modes: no login needed
  if (authMode === "disabled" || authMode === "forward") return <>{children}</>;

  // local/both: require login
  if (!user) return <LoginPage />;

  return <>{children}</>;
}

function AppRoutes() {
  useLocaleSync();

  return (
    <AuthGuard>
      <ChangelogOverlay />
      <Layout>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/sleep" element={<SleepPage />} />
              <Route path="/feeding" element={<FeedingPage />} />
              <Route path="/diaper" element={<DiaperPage />} />
              <Route path="/temperature" element={<TemperaturePage />} />
              <Route path="/weight" element={<WeightPage />} />
              <Route path="/medication" element={<MedicationPage />} />
              <Route path="/health" element={<HealthPage />} />
              <Route path="/todo" element={<TodoPage />} />
              <Route path="/tummy-time" element={<TummyTimePage />} />
              <Route path="/milestones" element={<MilestonesPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/children" element={<ChildrenPage />} />
              <Route path="/admin/medication-masters" element={<MedicationMastersPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/tags/:tagId" element={<TagDetailPage />} />
              <Route path="/admin/alerts" element={<AlertConfigPage />} />
              <Route path="/admin/plugins" element={<PluginConfigPage />} />
              <Route path="/admin/api-keys" element={<ApiKeyPage />} />
              <Route path="/admin/auth" element={<AuthSettingsPage />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Layout>
    </AuthGuard>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
