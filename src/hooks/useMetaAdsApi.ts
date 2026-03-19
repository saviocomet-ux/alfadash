import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MetaAd } from "@/data/parseMetaAds";

interface UseMetaAdsApiReturn {
  data: MetaAd[] | null;
  loading: boolean;
  error: string | null;
  fetchFromApi: (since?: string, until?: string) => Promise<void>;
  isApiEnabled: boolean;
}

export function useMetaAdsApi(): UseMetaAdsApiReturn {
  const [data, setData] = useState<MetaAd[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromApi = useCallback(async (since?: string, until?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { level: "ad" };
      if (since) params.since = since;
      if (until) params.until = until;

      const queryString = new URLSearchParams(params).toString();
      
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/meta-ads?${queryString}`,
        {
          headers: {
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data);
    } catch (err: any) {
      console.error("Meta Ads API error:", err);
      setError(err.message || "Erro ao buscar dados da API Meta");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    fetchFromApi,
    isApiEnabled: true,
  };
}
