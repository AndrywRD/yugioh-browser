import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import DashboardGrid from "../components/Dashboard/DashboardGrid";
import { getDashboardData, getWebSocketBaseUrl } from "../services/api";

export default function DashboardDetailPage() {
  const { dashboardId = "" } = useParams();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", dashboardId],
    queryFn: () => getDashboardData(dashboardId),
    enabled: Boolean(dashboardId),
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!dashboardId) return;
    const ws = new WebSocket(`${getWebSocketBaseUrl()}/ws/metrics`);
    ws.onmessage = () => {
      dashboardQuery.refetch();
    };
    return () => ws.close();
  }, [dashboardId]);

  if (dashboardQuery.isLoading) {
    return <p className="status">Loading dashboard...</p>;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <p className="status error">Unable to load dashboard data.</p>;
  }

  return (
    <section>
      <header className="page-header">
        <h2 className="page-title">{dashboardQuery.data.name}</h2>
        <span className="badge">{dashboardQuery.data.widgets.length} widgets</span>
      </header>

      <div className="panel">
        <p>{dashboardQuery.data.description || "No description"}</p>
      </div>

      <DashboardGrid widgets={dashboardQuery.data.widgets} />
    </section>
  );
}
