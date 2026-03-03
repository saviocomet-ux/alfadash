import Papa from "papaparse";
import metaCSV from "./meta-ads.csv?raw";

export interface MetaAd {
  campaign: string;
  adSet: string;
  adName: string;
  status: string;
  reach: number;
  impressions: number;
  frequency: number;
  resultType: string;
  results: number;
  costPerResult: number;
  amountSpent: number;
  cpm: number;
  linkClicks: number;
  cpc: number;
  ctr: number;
  formLeads: number;
  startDate: string;
}

export function parseMetaAds(): MetaAd[] {
  const result = Papa.parse(metaCSV, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row: any) => ({
    campaign: row["Nome da campanha"] || "",
    adSet: row["Nome do conjunto de anúncios"] || "",
    adName: row["Nome do anúncio"] || "",
    status: row["Estado de apresentação"] || "",
    reach: parseInt(row["Alcance"]) || 0,
    impressions: parseInt(row["Impressões"]) || 0,
    frequency: parseFloat(row["Frequência"]) || 0,
    resultType: row["Tipo de resultado"] || "",
    results: parseInt(row["Resultados"]) || 0,
    costPerResult: parseFloat(row["Custo por resultado"]) || 0,
    amountSpent: parseFloat(row["Montante gasto (BRL)"]) || 0,
    cpm: parseFloat(row["CPM (Custo por 1000 impressões)"]) || 0,
    linkClicks: parseInt(row["Cliques na ligação"]) || 0,
    cpc: parseFloat(row["CPC (Custo por clique na ligação)"]) || 0,
    ctr: parseFloat(row["CTR (Taxa de cliques na ligação)"]) || 0,
    formLeads: parseInt(row["Leads (formulário)"]) || 0,
    startDate: row["Começa a"] || "",
  }));
}

export function getMetaKpis(ads: MetaAd[]) {
  const totalSpent = ads.reduce((s, a) => s + a.amountSpent, 0);
  const totalReach = ads.reduce((s, a) => s + a.reach, 0);
  const totalImpressions = ads.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = ads.reduce((s, a) => s + a.linkClicks, 0);
  const totalResults = ads.reduce((s, a) => s + a.results, 0);
  const totalFormLeads = ads.reduce((s, a) => s + a.formLeads, 0);
  const avgCPL = totalResults > 0 ? totalSpent / totalResults : 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return { totalSpent, totalReach, totalImpressions, totalClicks, totalResults, totalFormLeads, avgCPL, avgCTR };
}

export function getCampaignStats(ads: MetaAd[]) {
  const campaigns: Record<string, { spent: number; results: number; clicks: number; reach: number; impressions: number }> = {};
  ads.forEach((a) => {
    if (!campaigns[a.campaign]) campaigns[a.campaign] = { spent: 0, results: 0, clicks: 0, reach: 0, impressions: 0 };
    campaigns[a.campaign].spent += a.amountSpent;
    campaigns[a.campaign].results += a.results;
    campaigns[a.campaign].clicks += a.linkClicks;
    campaigns[a.campaign].reach += a.reach;
    campaigns[a.campaign].impressions += a.impressions;
  });
  return Object.entries(campaigns)
    .map(([name, stats]) => ({ name: name.length > 40 ? name.slice(0, 40) + "…" : name, fullName: name, ...stats }))
    .sort((a, b) => b.spent - a.spent);
}

export function getAdSetStats(ads: MetaAd[]) {
  const sets: Record<string, { spent: number; results: number; clicks: number; reach: number }> = {};
  ads.forEach((a) => {
    if (!sets[a.adSet]) sets[a.adSet] = { spent: 0, results: 0, clicks: 0, reach: 0 };
    sets[a.adSet].spent += a.amountSpent;
    sets[a.adSet].results += a.results;
    sets[a.adSet].clicks += a.linkClicks;
    sets[a.adSet].reach += a.reach;
  });
  return Object.entries(sets)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.spent - a.spent);
}
