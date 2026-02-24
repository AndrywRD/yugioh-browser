import { create } from "zustand";

type AuthState = {
  token: string | null;
  setToken: (token: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));

type DashboardState = {
  selectedDashboardId: string | null;
  setSelectedDashboardId: (id: string | null) => void;
};

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedDashboardId: null,
  setSelectedDashboardId: (id) => set({ selectedDashboardId: id }),
}));
