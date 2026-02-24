import axios from "axios";

const DEFAULT_API_BASE = "http://localhost:8000/api/v1";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_API_BASE;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

export function getWebSocketBaseUrl() {
  const envWsBase = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim();
  if (envWsBase) {
    return envWsBase.replace(/\/+$/, "");
  }

  try {
    const parsedApi = new URL(API_BASE);
    const wsProtocol = parsedApi.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${parsedApi.host}`;
  } catch {
    return "ws://localhost:8000";
  }
}

export function setAuthToken(token: string | null) {
  if (!token) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  refresh_interval: number;
  is_public: boolean;
  is_favorite: boolean;
}

export interface DashboardData {
  id: string;
  name: string;
  description?: string;
  widgets: Array<{
    id: string;
    name: string;
    type: string;
    position: { x: number; y: number; width: number; height: number };
    config: Record<string, unknown>;
    data: {
      metric_name?: string;
      metric_value?: number;
      timestamp?: string;
    };
  }>;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  description?: string;
  is_active: boolean;
  last_sync_status?: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ access_token: string }>("/auth/login", { email, password });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get<AuthenticatedUser>("/auth/me");
  return data;
}

export async function listDashboards() {
  const { data } = await api.get<Dashboard[]>("/dashboards");
  return data;
}

export async function createDashboard(payload: { name: string; description?: string }) {
  const { data } = await api.post<Dashboard>("/dashboards", {
    name: payload.name,
    description: payload.description,
    layout: { widgets: [] },
    refresh_interval: 300,
  });
  return data;
}

export async function getDashboardData(dashboardId: string) {
  const { data } = await api.get<DashboardData>(`/dashboards/${dashboardId}/data`);
  return data;
}

export async function listDataSources() {
  const { data } = await api.get<DataSource[]>("/data-sources");
  return data;
}

export async function createDataSource(payload: {
  name: string;
  type: string;
  description?: string;
  config?: Record<string, unknown>;
}) {
  const { data } = await api.post<DataSource>("/data-sources", {
    ...payload,
    config: payload.config ?? {},
  });
  return data;
}

export async function uploadCsvDataSource(payload: { name: string; file: File; description?: string }) {
  const formData = new FormData();
  formData.append("name", payload.name);
  if (payload.description) {
    formData.append("description", payload.description);
  }
  formData.append("file", payload.file);

  const { data } = await api.post<DataSource>("/data-sources/upload-csv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function syncDataSource(id: string) {
  const { data } = await api.post(`/data-sources/${id}/sync`);
  return data;
}
