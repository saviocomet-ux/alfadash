const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_ADS_API_VERSION = "v19";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get access token: ${body}`);
  }
  const data: TokenResponse = await res.json();
  return data.access_token;
}

async function googleAdsQuery(
  accessToken: string,
  developerToken: string,
  customerId: string,
  query: string
): Promise<any[]> {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API error [${res.status}]: ${body}`);
  }
  const data = await res.json();
  // searchStream returns array of batches, each with results
  const results: any[] = [];
  if (Array.isArray(data)) {
    data.forEach((batch: any) => {
      if (batch.results) results.push(...batch.results);
    });
  }
  return results;
}

function microsToCurrency(micros: string | number): number {
  return Number(micros) / 1_000_000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("GoogleAdsClienteID");
    const clientSecret = Deno.env.get("GoogleAdsClientSecret");
    const refreshToken = Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN");
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
    const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID");

    if (!clientId || !clientSecret || !refreshToken || !developerToken || !customerId) {
      throw new Error("Missing Google Ads credentials. Required: GoogleAdsClienteID, GoogleAdsClientSecret, GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID");
    }

    // Remove hyphens from customer ID
    const cleanCustomerId = customerId.replace(/-/g, "");

    const url = new URL(req.url);
    const since = url.searchParams.get("since") || "";
    const until = url.searchParams.get("until") || "";
    const report = url.searchParams.get("report") || "all"; // keywords, campaign, timeline, all

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const dateFilter = since && until
      ? `segments.date BETWEEN '${since}' AND '${until}'`
      : `segments.date DURING LAST_90_DAYS`;

    const responseData: Record<string, any> = {};

    // Keywords report
    if (report === "keywords" || report === "all") {
      const kwQuery = `
        SELECT
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group.name,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM keyword_view
        WHERE ${dateFilter}
        ORDER BY metrics.clicks DESC
        LIMIT 500
      `;
      const kwResults = await googleAdsQuery(accessToken, developerToken, cleanCustomerId, kwQuery);
      responseData.keywords = kwResults.map((r: any) => ({
        keyword: r.adGroupCriterion?.keyword?.text || "",
        matchType: r.adGroupCriterion?.keyword?.matchType || "",
        status: r.adGroupCriterion?.status || "",
        adGroup: r.adGroup?.name || "",
        campaign: r.campaign?.name || "",
        impressions: Number(r.metrics?.impressions || 0),
        clicks: Number(r.metrics?.clicks || 0),
        ctr: Number(r.metrics?.ctr || 0) * 100,
        avgCpc: microsToCurrency(r.metrics?.averageCpc || 0),
        cost: microsToCurrency(r.metrics?.costMicros || 0),
        conversions: Number(r.metrics?.conversions || 0),
        costPerConversion: microsToCurrency(r.metrics?.costPerConversion || 0),
        conversionRate: Number(r.metrics?.clicks || 0) > 0
          ? (Number(r.metrics?.conversions || 0) / Number(r.metrics?.clicks || 0)) * 100
          : 0,
      }));
    }

    // Campaign report
    if (report === "campaign" || report === "all") {
      const campQuery = `
        SELECT
          campaign.name,
          campaign.status,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions
        FROM campaign
        WHERE ${dateFilter}
        ORDER BY metrics.cost_micros DESC
      `;
      const campResults = await googleAdsQuery(accessToken, developerToken, cleanCustomerId, campQuery);
      responseData.campaigns = campResults.map((r: any) => ({
        name: r.campaign?.name || "",
        status: r.campaign?.status || "",
        impressions: Number(r.metrics?.impressions || 0),
        clicks: Number(r.metrics?.clicks || 0),
        ctr: Number(r.metrics?.ctr || 0) * 100,
        avgCpc: microsToCurrency(r.metrics?.averageCpc || 0),
        cost: microsToCurrency(r.metrics?.costMicros || 0),
        conversions: Number(r.metrics?.conversions || 0),
      }));
    }

    // Timeline (daily impressions)
    if (report === "timeline" || report === "all") {
      const timeQuery = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions
        FROM campaign
        WHERE ${dateFilter}
        ORDER BY segments.date ASC
      `;
      const timeResults = await googleAdsQuery(accessToken, developerToken, cleanCustomerId, timeQuery);

      // Aggregate by date
      const dateMap: Record<string, { impressions: number; clicks: number; cost: number; conversions: number }> = {};
      timeResults.forEach((r: any) => {
        const date = r.segments?.date || "";
        if (!date) return;
        if (!dateMap[date]) dateMap[date] = { impressions: 0, clicks: 0, cost: 0, conversions: 0 };
        dateMap[date].impressions += Number(r.metrics?.impressions || 0);
        dateMap[date].clicks += Number(r.metrics?.clicks || 0);
        dateMap[date].cost += microsToCurrency(r.metrics?.costMicros || 0);
        dateMap[date].conversions += Number(r.metrics?.conversions || 0);
      });

      responseData.timeline = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, stats]) => ({ date, ...stats }));
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Google Ads error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
