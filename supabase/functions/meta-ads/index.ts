import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_BASE = "https://graph.facebook.com/v21.0";

// Fields we want from the Meta Marketing API
const AD_FIELDS = [
  "campaign_name",
  "adset_name",
  "ad_name",
  "reach",
  "impressions",
  "frequency",
  "actions",
  "cost_per_action_type",
  "spend",
  "cpm",
  "inline_link_clicks",
  "cpc",
  "inline_link_click_ctr",
  "date_start",
  "date_stop",
].join(",");

const CAMPAIGN_FIELDS = [
  "campaign_name",
  "reach",
  "impressions",
  "spend",
  "actions",
  "cost_per_action_type",
  "inline_link_clicks",
  "cpc",
  "inline_link_click_ctr",
  "cpm",
  "frequency",
].join(",");

interface MetaInsight {
  campaign_name: string;
  adset_name?: string;
  ad_name?: string;
  status?: string;
  reach: string;
  impressions: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  spend: string;
  cpm: string;
  inline_link_clicks?: string;
  cpc?: string;
  inline_link_click_ctr?: string;
  date_start: string;
  date_stop: string;
}

function getActionValue(actions: Array<{ action_type: string; value: string }> | undefined, type: string): number {
  if (!actions) return 0;
  const action = actions.find((a) => a.action_type === type);
  return action ? parseInt(action.value) || 0 : 0;
}

function getCostPerAction(costs: Array<{ action_type: string; value: string }> | undefined, type: string): number {
  if (!costs) return 0;
  const cost = costs.find((a) => a.action_type === type);
  return cost ? parseFloat(cost.value) || 0 : 0;
}

function transformInsight(row: MetaInsight) {
  const results = getActionValue(row.actions, "lead") +
    getActionValue(row.actions, "onsite_conversion.messaging_conversation_started_7d") +
    getActionValue(row.actions, "onsite_conversion.lead_grouped");
  const formLeads = getActionValue(row.actions, "lead");
  const messagingLeads = getActionValue(row.actions, "onsite_conversion.messaging_conversation_started_7d");

  // Determine primary result type
  let resultType = "";
  if (messagingLeads > 0) resultType = "Contactos no site";
  else if (formLeads > 0) resultType = "Leads (formulário)";
  else if (getActionValue(row.actions, "onsite_conversion.lead_grouped") > 0) resultType = "Leads no site";
  else if (parseInt(row.inline_link_clicks || "0") > 0) resultType = "Cliques na ligação";

  const costPerResult = results > 0 ? parseFloat(row.spend) / results : 0;

  return {
    campaign: row.campaign_name || "",
    adSet: row.adset_name || "",
    adName: row.ad_name || "",
    status: row.status === "ACTIVE" ? "active" : row.status === "PAUSED" ? "not_delivering" : "inactive",
    reach: parseInt(row.reach) || 0,
    impressions: parseInt(row.impressions) || 0,
    frequency: parseFloat(row.frequency || "0") || 0,
    resultType,
    results,
    costPerResult,
    amountSpent: parseFloat(row.spend) || 0,
    cpm: parseFloat(row.cpm) || 0,
    linkClicks: parseInt(row.inline_link_clicks || "0") || 0,
    cpc: parseFloat(row.cpc || "0") || 0,
    ctr: parseFloat(row.inline_link_click_ctr || "0") || 0,
    formLeads,
    startDate: row.date_start || "",
  };
}

async function fetchAllPages(url: string): Promise<any[]> {
  let allData: any[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Meta API error [${response.status}]: ${errorBody}`);
    }
    const json = await response.json();
    if (json.data) {
      allData = allData.concat(json.data);
    }
    nextUrl = json.paging?.next || null;
  }

  return allData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("META_ACCESS_TOKEN");
    if (!accessToken) {
      throw new Error("META_ACCESS_TOKEN is not configured");
    }

    let adAccountId = Deno.env.get("META_AD_ACCOUNT_ID");
    if (!adAccountId) {
      throw new Error("META_AD_ACCOUNT_ID is not configured");
    }
    // Ensure act_ prefix
    if (!adAccountId.startsWith("act_")) {
      adAccountId = `act_${adAccountId}`;
    }

    // Parse query params for date range
    const url = new URL(req.url);
    const since = url.searchParams.get("since"); // YYYY-MM-DD
    const until = url.searchParams.get("until"); // YYYY-MM-DD
    const level = url.searchParams.get("level") || "ad"; // ad, adset, campaign

    // Build time_range param
    let timeRange = "";
    if (since && until) {
      timeRange = `&time_range={"since":"${since}","until":"${until}"}`;
    }

    const fields = level === "campaign" ? CAMPAIGN_FIELDS : AD_FIELDS;
    const apiUrl = `${META_API_BASE}/${adAccountId}/insights?fields=${fields}&level=${level}&limit=500${timeRange}&access_token=${accessToken}`;

    const data = await fetchAllPages(apiUrl);

    // Also fetch ad statuses if level is "ad"
    let adStatuses: Record<string, string> = {};
    if (level === "ad") {
      try {
        const adsUrl = `${META_API_BASE}/${adAccountId}/ads?fields=name,status&limit=500&access_token=${accessToken}`;
        const adsData = await fetchAllPages(adsUrl);
        adsData.forEach((ad: any) => {
          adStatuses[ad.name] = ad.status;
        });
      } catch (e) {
        console.warn("Could not fetch ad statuses:", e);
      }
    }

    const transformed = data.map((row: MetaInsight) => {
      const t = transformInsight(row);
      // Apply real status from ads endpoint
      if (level === "ad" && t.adName && adStatuses[t.adName]) {
        const s = adStatuses[t.adName];
        t.status = s === "ACTIVE" ? "active" : s === "PAUSED" ? "not_delivering" : "inactive";
      }
      return t;
    });

    return new Response(JSON.stringify({ data: transformed, count: transformed.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Meta Ads API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
