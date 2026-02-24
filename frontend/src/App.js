import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        if (!token || !sessionQuery.isError)
            return;
        setToken(null);
        setAuthToken(null);
        localStorage.removeItem("kpi_dashboard_token");
    }, [sessionQuery.isError, setToken, token]);
    const authenticated = Boolean(token) && sessionQuery.isSuccess;
    if (token && sessionQuery.isPending) {
        return (_jsx("div", { className: "panel", style: { maxWidth: 420, margin: "80px auto" }, children: _jsx("p", { className: "status", children: "Validating session..." }) }));
    }
    if (!authenticated) {
        return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }));
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { children: [_jsx("h1", { className: "brand", children: "PulseBoard" }), _jsx("p", { className: "brand-subtitle", children: "KPI Intelligence" })] }), _jsxs("nav", { className: "nav-links", children: [_jsx(Link, { to: "/dashboards", children: "Dashboards" }), _jsx(Link, { to: "/data-sources", children: "Data Sources" })] })] }), _jsx("main", { className: "main-content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboards", replace: true }) }), _jsx(Route, { path: "/login", element: _jsx(Navigate, { to: "/dashboards", replace: true }) }), _jsx(Route, { path: "/dashboards", element: _jsx(DashboardListPage, {}) }), _jsx(Route, { path: "/dashboards/:dashboardId", element: _jsx(DashboardDetailPage, {}) }), _jsx(Route, { path: "/data-sources", element: _jsx(DataSourcesPage, {}) })] }) })] }));
}
