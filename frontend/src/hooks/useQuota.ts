"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export type QuotaState = {
  period: string;
  words_remaining: number;
  words_limit: number;
  downloads_remaining: number;
  downloads_limit: number;
};

export function useQuota() {
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await apiFetch("/api/v1/quota");
      if (res.ok) {
        setQuota(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { quota, loading, refetch };
}
