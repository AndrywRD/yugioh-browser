import { create } from "zustand";
export const useAuthStore = create((set) => ({
    token: null,
    setToken: (token) => set({ token }),
}));
export const useDashboardStore = create((set) => ({
    selectedDashboardId: null,
    setSelectedDashboardId: (id) => set({ selectedDashboardId: id }),
}));
