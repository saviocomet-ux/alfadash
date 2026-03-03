import Papa from "papaparse";
import leadsCSV from "./leads.csv?raw";

export interface Lead {
  id: string;
  title: string;
  value: number;
  responsible: string;
  createdAt: string;
  modifiedAt: string;
  closedAt: string;
  tags: string[];
  stage: string;
  funnel: string;
  name: string;
  phone: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
}

function parseDate(dateStr: string): string {
  if (!dateStr) return "";
  // Format: "03.03.2026 14:28:06"
  const parts = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
  if (!parts) return dateStr;
  return `${parts[3]}-${parts[2]}-${parts[1]}T${parts[4]}:${parts[5]}:${parts[6]}`;
}

export function getSourceFromTags(tags: string[], utmSource: string): string {
  if (utmSource === "google") return "Google Ads";
  if (utmSource === "ig") return "Instagram";
  if (utmSource === "fb") return "Facebook";
  if (tags.includes("google")) return "Google Ads";
  if (tags.includes("ig")) return "Instagram";
  if (tags.includes("fb")) return "Facebook";
  if (tags.includes("LP")) return "Landing Page";
  return utmSource || "Direto";
}

export function parseLeads(): Lead[] {
  const result = Papa.parse(leadsCSV, {
    header: true,
    skipEmptyLines: true,
  });

  return result.data.map((row: any) => {
    const tags = (row["Tags"] || "")
      .split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    return {
      id: row["ID"] || "",
      title: row["Lead título"] || "",
      value: parseFloat(row["Lead venda R$"]) || 0,
      responsible: row["Usuário responsável"] || "",
      createdAt: parseDate(row["Criado em"] || ""),
      modifiedAt: parseDate(row["modificada em"] || ""),
      closedAt: row["Fechado às"] || "",
      tags,
      stage: row["Etapa do lead"] || "Sem etapa",
      funnel: row["Funil de vendas"] || "",
      name: row["Nome completo"]?.trim() || "Sem nome",
      phone: row["Tel. direto com."] || row["Celular"] || "",
      source: getSourceFromTags(tags, row["utm_source"] || ""),
      medium: row["utm_medium"] || "",
      campaign: row["utm_campaign"] || "",
      term: row["utm_term"] || "",
    };
  });
}

export function getStageStats(leads: Lead[]) {
  const stages: Record<string, number> = {};
  leads.forEach((l) => {
    stages[l.stage] = (stages[l.stage] || 0) + 1;
  });
  return Object.entries(stages)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getSourceStats(leads: Lead[]) {
  const sources: Record<string, number> = {};
  leads.forEach((l) => {
    sources[l.source] = (sources[l.source] || 0) + 1;
  });
  return Object.entries(sources)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getDailyLeads(leads: Lead[]) {
  const daily: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.createdAt) {
      const day = l.createdAt.split("T")[0];
      daily[day] = (daily[day] || 0) + 1;
    }
  });
  return Object.entries(daily)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getTopTerms(leads: Lead[]) {
  const terms: Record<string, number> = {};
  leads.forEach((l) => {
    if (l.term) {
      terms[l.term] = (terms[l.term] || 0) + 1;
    }
  });
  return Object.entries(terms)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
