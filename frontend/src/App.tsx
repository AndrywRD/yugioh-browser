import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import DashboardDetailPage from "./pages/DashboardDetailPage";
import DashboardListPage from "./pages/DashboardListPage";
import DataSourcesPage from "./pages/DataSourcesPage";
import LoginPage from "./pages/LoginPage";
import { getCurrentUser, setAuthToken } from "./services/api";
import { useAuthStore } from "./store/useDashboardStore";

export default function App() {
  const token = useAuthStore((state) => state.token);
  const setToken = useAuthStore((state) => state.setToken);

  const sessionQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: getCurrentUser,
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (!token || !sessionQuery.isError) return;

    setToken(null);
    setAuthToken(null);
    localStorage.removeItem("kpi_dashboard_token");
  }, [sessionQuery.isError, setToken, token]);

  const authenticated = Boolean(token) && sessionQuery.isSuccess;

  if (token && sessionQuery.isPending) {
    return (
      <div className="panel" style={{ maxWidth: 420, margin: "80px auto" }}>
        <p className="status">Validating session...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1 className="brand">PulseBoard</h1>
          <p className="brand-subtitle">KPI Intelligence</p>
        </div>

        <nav className="nav-links">
          <Link to="/dashboards">Dashboards</Link>
          <Link to="/data-sources">Data Sources</Link>
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboards" replace />} />
          <Route path="/login" element={<Navigate to="/dashboards" replace />} />
          <Route path="/dashboards" element={<DashboardListPage />} />
          <Route path="/dashboards/:dashboardId" element={<DashboardDetailPage />} />
          <Route path="/data-sources" element={<DataSourcesPage />} />
        </Routes>
      </main>
    </div>
  );
}
