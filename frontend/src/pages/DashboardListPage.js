import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { createDashboard, listDashboards } from "../services/api";
export default function DashboardListPage() {
    const queryClient = useQueryClient();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const dashboardsQuery = useQuery({ queryKey: ["dashboards"], queryFn: listDashboards });
    const createMutation = useMutation({
        mutationFn: createDashboard,
        onSuccess: () => {
            setName("");
            setDescription("");
            queryClient.invalidateQueries({ queryKey: ["dashboards"] });
        },
    });
    const onSubmit = (event) => {
        event.preventDefault();
        if (!name.trim())
            return;
        createMutation.mutate({ name, description });
    };
    return (_jsxs("section", { children: [_jsx("header", { className: "page-header", children: _jsx("h2", { className: "page-title", children: "Dashboards" }) }), _jsx("div", { className: "panel", children: _jsxs("form", { className: "form-inline", onSubmit: onSubmit, children: [_jsx("input", { className: "input", value: name, onChange: (e) => setName(e.target.value), placeholder: "Dashboard name" }), _jsx("input", { className: "input", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Description" }), _jsx("button", { className: "button", type: "submit", children: "Create" })] }) }), _jsxs("div", { className: "panel", children: [dashboardsQuery.isLoading && _jsx("p", { className: "status", children: "Loading dashboards..." }), dashboardsQuery.isError && _jsx("p", { className: "status error", children: "Unable to load dashboards." }), _jsx("div", { className: "grid grid-3", children: (dashboardsQuery.data ?? []).map((dashboard) => (_jsxs("article", { className: "card", children: [_jsx("h3", { children: dashboard.name }), _jsx("p", { className: "status", children: dashboard.description || "No description" }), _jsxs("p", { className: "status", children: ["Refresh: ", dashboard.refresh_interval, "s"] }), _jsx(Link, { to: `/dashboards/${dashboard.id}`, children: "Open dashboard" })] }, dashboard.id))) })] })] }));
}
