import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sheets-config";

export interface SheetsConfig {
  googleAdsKeywordsUrl: string;
  googleAdsTimelineUrl: string;
}

const DEFAULT_CONFIG: SheetsConfig = {
  googleAdsKeywordsUrl: "",
  googleAdsTimelineUrl: "",
};

export function getSheetsConfig(): SheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveSheetsConfig(config: SheetsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function hasAnySheetsUrl(config: SheetsConfig): boolean {
  return !!(config.googleAdsKeywordsUrl || config.googleAdsTimelineUrl);
}

async function fetchCSV(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    console.error("Failed to fetch sheet:", url, err);
    return null;
  }
}

interface SheetData {
  googleAdsKeywordsCSV: string | null;
  googleAdsTimelineCSV: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  config: SheetsConfig;
  updateConfig: (config: SheetsConfig) => void;
}

export function useGoogleSheetsData(): SheetData {
  const [config, setConfig] = useState<SheetsConfig>(getSheetsConfig);
  const [googleAdsKeywordsCSV, setGoogleAdsKeywordsCSV] = useState<string | null>(null);
  const [googleAdsTimelineCSV, setGoogleAdsTimelineCSV] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const cfg = getSheetsConfig();
    if (!hasAnySheetsUrl(cfg)) return;

    setLoading(true);
    setError(null);
    try {
      const [keywords, timeline] = await Promise.all([
        fetchCSV(cfg.googleAdsKeywordsUrl),
        fetchCSV(cfg.googleAdsTimelineUrl),
      ]);
      setGoogleAdsKeywordsCSV(keywords);
      setGoogleAdsTimelineCSV(timeline);
    } catch (e: any) {
      setError(e.message || "Erro ao buscar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateConfig = useCallback((newConfig: SheetsConfig) => {
    saveSheetsConfig(newConfig);
    setConfig(newConfig);
    setTimeout(() => fetchAll(), 100);
  }, [fetchAll]);

  return {
    googleAdsKeywordsCSV,
    googleAdsTimelineCSV,
    loading,
    error,
    refetch: fetchAll,
    config,
    updateConfig,
  };
}
