import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        if (!dashboardId)
            return;
        const ws = new WebSocket(`${getWebSocketBaseUrl()}/ws/metrics`);
        ws.onmessage = () => {
            dashboardQuery.refetch();
        };
        return () => ws.close();
    }, [dashboardId]);
    if (dashboardQuery.isLoading) {
        return _jsx("p", { className: "status", children: "Loading dashboard..." });
    }
    if (dashboardQuery.isError || !dashboardQuery.data) {
        return _jsx("p", { className: "status error", children: "Unable to load dashboard data." });
    }
    return (_jsxs("section", { children: [_jsxs("header", { className: "page-header", children: [_jsx("h2", { className: "page-title", children: dashboardQuery.data.name }), _jsxs("span", { className: "badge", children: [dashboardQuery.data.widgets.length, " widgets"] })] }), _jsx("div", { className: "panel", children: _jsx("p", { children: dashboardQuery.data.description || "No description" }) }), _jsx(DashboardGrid, { widgets: dashboardQuery.data.widgets })] }));
}
