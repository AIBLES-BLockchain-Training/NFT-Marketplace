import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  isConnectModalOpen: boolean;
  isSidebarOpen: boolean;

  setTheme: (theme: 'light' | 'dark') => void;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  isConnectModalOpen: false,
  isSidebarOpen: false,

  setTheme: (theme) => set({ theme }),
  openConnectModal: () => set({ isConnectModalOpen: true }),
  closeConnectModal: () => set({ isConnectModalOpen: false }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));
