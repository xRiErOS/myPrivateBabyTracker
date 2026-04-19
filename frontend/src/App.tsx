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

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sleep" element={<SleepPage />} />
          <Route path="/feeding" element={<FeedingPage />} />
          <Route path="/diaper" element={<DiaperPage />} />
          <Route path="/children" element={<ChildrenPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
