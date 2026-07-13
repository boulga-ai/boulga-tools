import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  full_name: string;
  phone?: string | null;
  current_tier: string;
  role: string;
};

type AuthState = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ user: null, profile: null, loading: false }),
}));
