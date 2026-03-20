const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KommoPipeline {
  id: number;
  name: string;
  statuses: { id: number; name: string; sort: number; color: string }[];
}

interface KommoLead {
  id: number;
  name: string;
  price: number;
  responsible_user_id: number;
  status_id: number;
  pipeline_id: number;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  loss_reason?: { id: number; name: string }[] | null;
  _embedded?: {
    tags?: { id: number; name: string }[];
    contacts?: { id: number }[];
    loss_reason?: { id: number; name: string }[];
  };
  custom_fields_values?: {
    field_id: number;
    field_name: string;
    values: { value: string; enum_id?: number }[];
  }[];
}

interface KommoContact {
  id: number;
  name: string;
  custom_fields_values?: {
    field_id: number;
    field_name: string;
    field_code: string;
    values: { value: string; enum_id?: number; enum_code?: string }[];
  }[];
}

interface KommoUser {
  id: number;
  name: string;
  email: string;
}

async function kommoFetch(subdomain: string, token: string, path: string, params?: Record<string, string>) {
  // Support both "mycompany" and "mycompany.kommo.com" formats
  const host = subdomain.includes(".") ? subdomain : `${subdomain}.kommo.com`;
  const url = new URL(`https://${host}/api/v4/${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kommo API ${path} failed [${res.status}]: ${body}`);
  }
  return res.json();
}

async function fetchAllPages(subdomain: string, token: string, path: string, extraParams?: Record<string, string>): Promise<any[]> {
  let page = 1;
  const limit = "250";
  let all: any[] = [];
  while (true) {
    try {
      const data = await kommoFetch(subdomain, token, path, { ...extraParams, limit, page: String(page) });
      const embedded = data?._embedded;
      const key = Object.keys(embedded || {})[0];
      const items = embedded?.[key] || [];
      if (items.length === 0) break;
      all = all.concat(items);
      if (items.length < 250) break;
      page++;
    } catch (e: any) {
      if (e.message?.includes("[204]") || e.message?.includes("[404]")) break;
      throw e;
    }
  }
  return all;
}

function timestampToISO(ts: number | null): string {
  if (!ts) return "";
  return new Date(ts * 1000).toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KOMMO_ACCESS_TOKEN = Deno.env.get("KOMMO_ACCESS_TOKEN");
    if (!KOMMO_ACCESS_TOKEN) throw new Error("KOMMO_ACCESS_TOKEN is not configured");

    const KOMMO_SUBDOMAIN = Deno.env.get("KOMMO_SUBDOMAIN");
    if (!KOMMO_SUBDOMAIN) throw new Error("KOMMO_SUBDOMAIN is not configured");

    const url = new URL(req.url);
    const endpoint = url.searchParams.get("endpoint") || "all";

    // Fetch pipelines (always needed for stage mapping)
    const pipelinesData = await kommoFetch(KOMMO_SUBDOMAIN, KOMMO_ACCESS_TOKEN, "leads/pipelines");
    const pipelines: KommoPipeline[] = pipelinesData?._embedded?.pipelines || [];

    // Build status map: statusId -> { name, pipelineName }
    const statusMap: Record<number, { name: string; pipeline: string }> = {};
    pipelines.forEach((p) => {
      (p.statuses || []).forEach((s) => {
        statusMap[s.id] = { name: s.name, pipeline: p.name };
      });
    });

    if (endpoint === "pipelines") {
      return new Response(JSON.stringify({ pipelines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch users
    const usersData = await kommoFetch(KOMMO_SUBDOMAIN, KOMMO_ACCESS_TOKEN, "users");
    const users: KommoUser[] = usersData?._embedded?.users || [];
    const userMap: Record<number, string> = {};
    users.forEach((u) => { userMap[u.id] = u.name; });

    // Fetch leads with contacts embedded
    const leads = await fetchAllPages(KOMMO_SUBDOMAIN, KOMMO_ACCESS_TOKEN, "leads", {
      with: "contacts,loss_reason",
    }) as KommoLead[];

    // Fetch contacts
    const contacts = await fetchAllPages(KOMMO_SUBDOMAIN, KOMMO_ACCESS_TOKEN, "contacts") as KommoContact[];
    const contactMap: Record<number, KommoContact> = {};
    contacts.forEach((c) => { contactMap[c.id] = c; });

    // Helper to get phone from contact
    function getContactPhone(contactId: number): string {
      const contact = contactMap[contactId];
      if (!contact?.custom_fields_values) return "";
      const phoneField = contact.custom_fields_values.find(
        (f) => f.field_code === "PHONE" || f.field_name?.toLowerCase().includes("telefone") || f.field_name?.toLowerCase().includes("phone")
      );
      return phoneField?.values?.[0]?.value || "";
    }

    function getContactName(contactId: number): string {
      return contactMap[contactId]?.name || "";
    }

    // Get UTM from custom fields
    function getCustomField(lead: KommoLead, fieldName: string): string {
      if (!lead.custom_fields_values) return "";
      const field = lead.custom_fields_values.find(
        (f) => f.field_name?.toLowerCase().includes(fieldName.toLowerCase())
      );
      return field?.values?.[0]?.value || "";
    }

    // Map leads to our format
    const mappedLeads = leads.map((lead) => {
      const status = statusMap[lead.status_id];
      const contactIds = lead._embedded?.contacts?.map((c) => c.id) || [];
      const primaryContactId = contactIds[0];
      const tags = lead._embedded?.tags?.map((t) => t.name) || [];

      // Determine stage name
      let stageName = status?.name || "Sem etapa";
      // Kommo uses status_id 142 for won and 143 for lost (system statuses)
      // But the actual IDs vary, so we check by name patterns
      const stageNameLower = stageName.toLowerCase();
      if (stageNameLower === "fechado e ganho" || stageNameLower === "successfully implemented" || stageNameLower === "closed won") {
        stageName = "Closed - won";
      } else if (stageNameLower === "fechado e perdido" || stageNameLower === "closed lost") {
        const lossReason = lead._embedded?.loss_reason?.[0]?.name || "Sem motivo";
        stageName = `Closed - lost (${lossReason})`;
      }

      const utmSource = getCustomField(lead, "utm_source");
      const utmMedium = getCustomField(lead, "utm_medium");
      const utmCampaign = getCustomField(lead, "utm_campaign");
      const utmTerm = getCustomField(lead, "utm_term");

      // Determine source from tags/utm
      let source = utmSource || "";
      if (!source && tags.some((t) => t.toLowerCase().includes("google"))) source = "google";
      if (!source && tags.some((t) => t.toLowerCase().includes("facebook") || t.toLowerCase() === "fb")) source = "fb";
      if (!source && tags.some((t) => t.toLowerCase().includes("instagram") || t.toLowerCase() === "ig")) source = "ig";

      return {
        id: String(lead.id),
        title: lead.name || "",
        value: lead.price || 0,
        responsible: userMap[lead.responsible_user_id] || "",
        createdAt: timestampToISO(lead.created_at),
        modifiedAt: timestampToISO(lead.updated_at),
        closedAt: timestampToISO(lead.closed_at),
        tags,
        stage: stageName,
        funnel: status?.pipeline || "",
        name: primaryContactId ? getContactName(primaryContactId) : lead.name || "Sem nome",
        phone: primaryContactId ? getContactPhone(primaryContactId) : "",
        source,
        medium: utmMedium,
        campaign: utmCampaign,
        term: utmTerm,
      };
    });

    return new Response(
      JSON.stringify({
        data: mappedLeads,
        count: mappedLeads.length,
        pipelines: pipelines.map((p) => ({ id: p.id, name: p.name, statuses: p.statuses })),
        contactsCount: contacts.length,
        usersCount: users.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Kommo CRM error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
