import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface GoogleAdsApiKeyword {
  keyword: string;
  matchType: string;
  status: string;
  adGroup: string;
  campaign: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  cost: number;
  conversions: number;
  costPerConversion: number;
  conversionRate: number;
  // Compatibility fields
  qualityStatus: string;
  statusReasons: string;
}

export interface GoogleAdsApiTimeline {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface GoogleAdsApiData {
  keywords: GoogleAdsApiKeyword[];
  timeline: GoogleAdsApiTimeline[];
  campaigns: any[];
}

export function useGoogleAdsApi(enabled: boolean, startDate?: Date, endDate?: Date) {
  const [data, setData] = useState<GoogleAdsApiData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { report: "all" };
      if (startDate) params.since = format(startDate, "yyyy-MM-dd");
      if (endDate) params.until = format(endDate, "yyyy-MM-dd");

      const queryString = new URLSearchParams(params).toString();
      const { data: result, error: fnError } = await supabase.functions.invoke(
        `google-ads?${queryString}`,
        { method: "GET" }
      );

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      // Add compatibility fields to keywords
      const keywords = (result.keywords || []).map((k: any) => ({
        ...k,
        qualityStatus: k.status === "ENABLED" ? "Qualificado" : k.status,
        statusReasons: "",
      }));

      setData({
        keywords,
        timeline: result.timeline || [],
        campaigns: result.campaigns || [],
      });
    } catch (err: any) {
      console.error("Google Ads API error:", err);
      setError(err.message || "Erro ao buscar dados do Google Ads");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (enabled) fetchData();
  }, [enabled, fetchData]);

  return { data, loading, error, fetch: fetchData };
}
