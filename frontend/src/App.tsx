/** App root — routing with lazy-loaded pages. */

import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { LoadingSpinner } from "./components/LoadingSpinner";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const SleepPage = lazy(() => import("./pages/SleepPage"));
const FeedingPage = lazy(() => import("./pages/FeedingPage"));
const DiaperPage = lazy(() => import("./pages/DiaperPage"));
const ChildrenPage = lazy(() => import("./pages/ChildrenPage"));
const TemperaturePage = lazy(() => import("./pages/TemperaturePage"));
const WeightPage = lazy(() => import("./pages/WeightPage"));
const MedicationPage = lazy(() => import("./pages/MedicationPage"));
const TodoPage = lazy(() => import("./pages/TodoPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const MedicationMastersPage = lazy(() => import("./pages/MedicationMastersPage"));
const TagsPage = lazy(() => import("./pages/TagsPage"));
const TagDetailPage = lazy(() => import("./pages/TagDetailPage"));

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/feeding" element={<FeedingPage />} />
          <Route path="/diaper" element={<DiaperPage />} />
          <Route path="/temperature" element={<TemperaturePage />} />
          <Route path="/weight" element={<WeightPage />} />
          <Route path="/medication" element={<MedicationPage />} />
          <Route path="/todo" element={<TodoPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/children" element={<ChildrenPage />} />
          <Route path="/admin/medication-masters" element={<MedicationMastersPage />} />
          <Route path="/admin/tags" element={<TagsPage />} />
          <Route path="/admin/tags/:tagId" element={<TagDetailPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
