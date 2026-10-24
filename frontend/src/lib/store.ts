import { create } from 'zustand';
import type { User, Workspace } from './types';

interface AuthState {
  token: string | null;
  user: User | null;
  workspace: Workspace | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  setWorkspace: (workspace: Workspace) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  user: null,
  workspace: null,
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  setUser: (user) => set({ user }),
  setWorkspace: (workspace) => {
    localStorage.setItem('workspace_id', workspace.id);
    set({ workspace });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('workspace_id');
    set({ token: null, user: null, workspace: null });
  },
}));
