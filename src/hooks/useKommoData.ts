import { useState, useEffect, useCallback } from "react";
import type { Lead } from "@/data/parseLeads";
import { getSourceFromTags } from "@/data/parseLeads";

interface UseKommoDataReturn {
  leads: Lead[] | null;
  loading: boolean;
  error: string | null;
  fetch: () => Promise<void>;
}

export function useKommoData(active: boolean): UseKommoDataReturn {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/kommo-crm?endpoint=all`,
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Erro ${res.status}: ${body}`);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Map source using existing logic
      const mapped: Lead[] = (json.data || []).map((l: any) => ({
        ...l,
        source: getSourceFromTags(l.tags || [], l.source || ""),
      }));

      setLeads(mapped);
    } catch (e: any) {
      console.error("Kommo fetch error:", e);
      setError(e.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      fetchData();
    } else {
      setLeads(null);
      setError(null);
    }
  }, [active, fetchData]);

  return { leads, loading, error, fetch: fetchData };
}
