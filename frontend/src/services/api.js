import axios from "axios";
const DEFAULT_API_BASE = "http://localhost:8000/api/v1";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE;
export const api = axios.create({
    baseURL: API_BASE,
    timeout: 20000,
});
export function getWebSocketBaseUrl() {
    const envWsBase = import.meta.env.VITE_WS_BASE_URL?.trim();
    if (envWsBase) {
        return envWsBase.replace(/\/+$/, "");
    }
    try {
        const parsedApi = new URL(API_BASE);
        const wsProtocol = parsedApi.protocol === "https:" ? "wss:" : "ws:";
        return `${wsProtocol}//${parsedApi.host}`;
    }
    catch {
        return "ws://localhost:8000";
    }
}
export function setAuthToken(token) {
    if (!token) {
        delete api.defaults.headers.common.Authorization;
        return;
    }
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
}
export async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
}
export async function getCurrentUser() {
    const { data } = await api.get("/auth/me");
    return data;
}
export async function listDashboards() {
    const { data } = await api.get("/dashboards");
    return data;
}
export async function createDashboard(payload) {
    const { data } = await api.post("/dashboards", {
        name: payload.name,
        description: payload.description,
        layout: { widgets: [] },
        refresh_interval: 300,
    });
    return data;
}
export async function getDashboardData(dashboardId) {
    const { data } = await api.get(`/dashboards/${dashboardId}/data`);
    return data;
}
export async function listDataSources() {
    const { data } = await api.get("/data-sources");
    return data;
}
export async function createDataSource(payload) {
    const { data } = await api.post("/data-sources", {
        ...payload,
        config: payload.config ?? {},
    });
    return data;
}
export async function uploadCsvDataSource(payload) {
    const formData = new FormData();
    formData.append("name", payload.name);
    if (payload.description) {
        formData.append("description", payload.description);
    }
    formData.append("file", payload.file);
    const { data } = await api.post("/data-sources/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
}
export async function syncDataSource(id) {
    const { data } = await api.post(`/data-sources/${id}/sync`);
    return data;
}
