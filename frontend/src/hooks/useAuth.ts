"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function useAuth() {
  const router = useRouter();
  const { user, profile, loading, setUser, setProfile, setLoading, reset } = useAuthStore();

  async function refetchProfile() {
    try {
      const res = await apiFetch("/api/v1/users/me");
      if (res.ok) setProfile(await res.json());
    } catch {
      // Le backend peut etre indisponible ponctuellement ; l'utilisateur reste connecte.
    }
  }

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) refetchProfile();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        refetchProfile();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push("/login");
    router.refresh();
  }

  return { user, profile, loading, signOut, refetchProfile };
}
