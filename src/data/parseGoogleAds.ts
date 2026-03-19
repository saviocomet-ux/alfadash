import Papa from "papaparse";
import timelineCSV from "./google-ads-timeline.csv?raw";
import keywordsCSV from "./google-ads-keywords.csv?raw";

export interface GoogleAdsTimeline {
  date: string; // ISO date
  impressions: number;
}

export interface GoogleAdsKeyword {
  status: string;
  keyword: string;
  matchType: string;
  adGroup: string;
  qualityStatus: string;
  statusReasons: string;
  conversions: number;
  costPerConversion: number;
  clicks: number;
  impressions: number;
  ctr: number;
  avgCpc: number;
  cost: number;
  conversionRate: number;
}

const monthMap: Record<string, string> = {
  "jan.": "01", "fev.": "02", "mar.": "03", "abr.": "04",
  "mai.": "05", "jun.": "06", "jul.": "07", "ago.": "08",
  "set.": "09", "out.": "10", "nov.": "11", "dez.": "12",
};

function parsePtBRDate(raw: string): string {
  // "qui., 1 de jan. de 2026" → "2026-01-01"
  const match = raw.match(/(\d{1,2}) de (\w+\.) de (\d{4})/);
  if (!match) return "";
  const day = match[1].padStart(2, "0");
  const month = monthMap[match[2]] || "01";
  const year = match[3];
  return `${year}-${month}-${day}`;
}

function parseBRNumber(val: string): number {
  if (!val || val.trim() === "--" || val.trim() === "") return 0;
  // "1.310" → "1310", "58,77" → "58.77"
  return parseFloat(val.replace(/\./g, "").replace(",", ".")) || 0;
}

function parseBRPercent(val: string): number {
  if (!val || val.trim() === "--" || val.trim() === "") return 0;
  return parseFloat(val.replace("%", "").replace(",", ".")) || 0;
}

export function parseGoogleAdsTimeline(csvOverride?: string | null): GoogleAdsTimeline[] {
  const result = Papa.parse(csvOverride || timelineCSV, { header: true, skipEmptyLines: true });
  return result.data.map((row: any) => ({
    date: parsePtBRDate(row["Data"] || ""),
    impressions: parseInt(row["Impr."] || "0") || 0,
  })).filter((r) => r.date);
}

export function parseGoogleAdsKeywords(csvOverride?: string | null): GoogleAdsKeyword[] {
  const raw = csvOverride || keywordsCSV;
  // Skip first 2 header lines (report title + date range), actual headers on line 3
  // Only skip if using original format (has report header lines)
  const lines = raw.split("\n");
  const needsSkip = !csvOverride && lines.length > 3;
  const dataCSV = needsSkip ? lines.slice(2).join("\n") : raw;
  const result = Papa.parse(dataCSV, { header: true, skipEmptyLines: true });

  return result.data
    .map((row: any) => {
      const keyword = (row["Palavra-chave"] || "").replace(/^"|"$/g, "");
      if (!keyword || keyword.startsWith("Total:")) return null;
      return {
        status: row["Status da palavra-chave"] || "",
        keyword,
        matchType: row["Tipo de corresp."] || "",
        adGroup: row["Grupo de anúncios"] || "",
        qualityStatus: row["Status"] || "",
        statusReasons: row["Motivos do status"] || "",
        conversions: parseBRNumber(row["Conversões"] || "0"),
        costPerConversion: parseBRNumber(row["Custo / conv."] || "0"),
        clicks: parseBRNumber(row["Cliques"] || "0"),
        impressions: parseBRNumber(row["Impr."] || "0"),
        ctr: parseBRPercent(row["CTR"] || "0"),
        avgCpc: parseBRNumber(row["CPC méd."] || "0"),
        cost: parseBRNumber(row["Custo"] || "0"),
        conversionRate: parseBRPercent(row["Taxa de conv."] || "0"),
      };
    })
    .filter(Boolean) as GoogleAdsKeyword[];
}

export function getGoogleAdsKpis(keywords: GoogleAdsKeyword[]) {
  const totalClicks = keywords.reduce((s, k) => s + k.clicks, 0);
  const totalImpressions = keywords.reduce((s, k) => s + k.impressions, 0);
  const totalCost = keywords.reduce((s, k) => s + k.cost, 0);
  const totalConversions = keywords.reduce((s, k) => s + k.conversions, 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
  const costPerConversion = totalConversions > 0 ? totalCost / totalConversions : 0;
  const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  return { totalClicks, totalImpressions, totalCost, totalConversions, avgCTR, avgCPC, costPerConversion, conversionRate };
}

export function getAdGroupStats(keywords: GoogleAdsKeyword[]) {
  const groups: Record<string, { clicks: number; impressions: number; cost: number; conversions: number }> = {};
  keywords.forEach((k) => {
    if (!groups[k.adGroup]) groups[k.adGroup] = { clicks: 0, impressions: 0, cost: 0, conversions: 0 };
    groups[k.adGroup].clicks += k.clicks;
    groups[k.adGroup].impressions += k.impressions;
    groups[k.adGroup].cost += k.cost;
    groups[k.adGroup].conversions += k.conversions;
  });
  return Object.entries(groups)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.cost - a.cost);
}
