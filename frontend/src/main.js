import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { setAuthToken } from "./services/api";
import { useAuthStore } from "./store/useDashboardStore";
const queryClient = new QueryClient();
const existingToken = localStorage.getItem("kpi_dashboard_token");
if (existingToken) {
    setAuthToken(existingToken);
    useAuthStore.getState().setToken(existingToken);
}
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }) }));
