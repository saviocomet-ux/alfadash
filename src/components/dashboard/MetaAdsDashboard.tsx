import { useMemo, useState } from "react";
import { getMetaKpis, getCampaignStats, getAdSetStats, MetaAd } from "@/data/parseMetaAds";
import { KpiCard } from "./KpiCard";
import { DollarSign, Eye, MousePointerClick, Target, Users, BarChart3, MessageCircle, FileText, ArrowUpDown, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 80%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 55%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(222, 47%, 9%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: "8px",
  color: "hsl(210, 40%, 96%)",
  fontSize: 12,
};

const formatBRL = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const resultTypeLabels: Record<string, string> = {
  "Contactos no site": "Mensagem (Site)",
  "Leads no site": "Lead (Site)",
  "Leads (formulário)": "Lead (Formulário)",
  "Cliques na ligação": "Clique no Link",
  "Visitas ao perfil do Instagram": "Visita ao Perfil",
};

const resultTypeBadge: Record<string, string> = {
  "Contactos no site": "bg-primary/15 text-primary",
  "Leads no site": "bg-success/15 text-success",
  "Leads (formulário)": "bg-accent/15 text-accent",
  "Cliques na ligação": "bg-warning/15 text-warning",
  "Visitas ao perfil do Instagram": "bg-info/15 text-info",
};

interface MetaAdsDashboardProps {
  startDate?: Date;
  endDate?: Date;
  data: MetaAd[];
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function MetaAdsDashboard({ startDate, endDate, data, loading, error, onRefresh }: MetaAdsDashboardProps) {
  const ads = data;

  const kpis = useMemo(() => getMetaKpis(ads), [ads]);
  const campaignStats = useMemo(() => getCampaignStats(ads), [ads]);
  const adSetStats = useMemo(() => getAdSetStats(ads), [ads]);

  const activeAds = ads.filter((a) => a.status === "active").length;

  // Result type breakdown
  const resultTypeStats = useMemo(() => {
    const types: Record<string, { count: number; spent: number }> = {};
    ads.forEach((a) => {
      if (a.resultType && a.results > 0) {
        if (!types[a.resultType]) types[a.resultType] = { count: 0, spent: 0 };
        types[a.resultType].count += a.results;
        types[a.resultType].spent += a.amountSpent;
      }
    });
    return Object.entries(types)
      .map(([type, stats]) => ({ type, label: resultTypeLabels[type] || type, ...stats }))
      .sort((a, b) => b.count - a.count);
  }, [ads]);

  const messagingResults = resultTypeStats.find((r) => r.type === "Contactos no site");
  const formLeadResults = resultTypeStats.filter((r) => r.type === "Leads no site" || r.type === "Leads (formulário)");
  const totalFormLeads = formLeadResults.reduce((s, r) => s + r.count, 0);
  const totalFormSpent = formLeadResults.reduce((s, r) => s + r.spent, 0);

  const [sortField, setSortField] = useState<string>("amountSpent");
  const sortOptions: { value: string; label: string }[] = [
    { value: "amountSpent", label: "Investido" },
    { value: "results", label: "Resultados" },
    { value: "costPerResult", label: "CPR" },
    { value: "linkClicks", label: "Cliques" },
    { value: "ctr", label: "CTR" },
    { value: "cpm", label: "CPM" },
  ];

  const sortedAds = useMemo(() => {
    return [...ads].sort((a: any, b: any) => (b[sortField] || 0) - (a[sortField] || 0));
  }, [ads, sortField]);

  return (
    <div className="space-y-6">
      {/* Refresh button + status */}
      <div className="flex items-center gap-3 flex-wrap">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Buscando..." : "Atualizar dados"}
          </button>
        )}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            {error}
          </div>
        )}
        {loading && ads.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando dados do Meta Ads...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Total Investido"
          value={formatBRL(kpis.totalSpent)}
          subtitle={`${ads.length} anúncios (${activeAds} ativos)`}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          variant="primary"
        />
        <KpiCard
          title="Mensagens (Site)"
          value={messagingResults?.count || 0}
          subtitle={messagingResults ? `CPL: ${formatBRL(messagingResults.spent / messagingResults.count)}` : "Sem dados"}
          icon={<MessageCircle className="w-5 h-5 text-success" />}
          variant="success"
        />
        <KpiCard
          title="Leads (Formulário)"
          value={totalFormLeads}
          subtitle={totalFormLeads > 0 ? `CPL: ${formatBRL(totalFormSpent / totalFormLeads)}` : "Sem dados"}
          icon={<FileText className="w-5 h-5 text-accent" />}
          variant="default"
        />
        <KpiCard
          title="Alcance Total"
          value={kpis.totalReach.toLocaleString("pt-BR")}
          subtitle={`${kpis.totalImpressions.toLocaleString("pt-BR")} impressões`}
          icon={<Users className="w-5 h-5 text-primary" />}
          variant="primary"
        />
        <KpiCard
          title="Cliques"
          value={kpis.totalClicks.toLocaleString("pt-BR")}
          subtitle={`CTR: ${kpis.avgCTR.toFixed(2)}%`}
          icon={<MousePointerClick className="w-5 h-5 text-warning" />}
          variant="warning"
        />
        <KpiCard
          title="CPM Médio"
          value={formatBRL(kpis.totalImpressions > 0 ? (kpis.totalSpent / kpis.totalImpressions) * 1000 : 0)}
          subtitle="Custo por mil impressões"
          icon={<Eye className="w-5 h-5 text-info" />}
          variant="default"
        />
      </div>

      {/* Result Type Breakdown */}
      {resultTypeStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Resultados por Tipo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resultTypeStats.map((r) => (
              <div key={r.type} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${resultTypeBadge[r.type] || "bg-muted text-muted-foreground"}`}>
                    {r.label}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">{r.count}</span>
                  <p className="text-[10px] text-muted-foreground">{formatBRL(r.spent)} · CPR: {r.count > 0 ? formatBRL(r.spent / r.count) : "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Spend Chart */}
      {campaignStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Investimento por Campanha</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campaignStats} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="campaign"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  width={200}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatBRL(value), "Investido"]}
                />
                <Bar dataKey="spent" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {campaignStats.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Ad Set Table */}
      {adSetStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Performance por Conjunto de Anúncios</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Conjunto</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Investido</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Resultados</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cliques</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Alcance</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Impressões</th>
                </tr>
              </thead>
              <tbody>
                {adSetStats.map((s, i) => (
                  <tr key={i} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                    <td className="py-2 px-2 text-foreground font-medium">{s.adSet}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{formatBRL(s.spent)}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{s.results}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{s.clicks.toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{s.reach.toLocaleString("pt-BR")}</td>
                    <td className="py-2 px-2 text-right text-foreground font-mono">{s.impressions.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* All Ads Table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Todos os Anúncios</h3>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[130px] h-7 text-xs bg-secondary border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Anúncio</th>
                <th className="text-left py-2 px-2 text-muted-foreground font-medium">Campanha</th>
                <th className="text-center py-2 px-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Investido</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Resultado</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">CPR</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cliques</th>
                <th className="text-right py-2 px-2 text-muted-foreground font-medium">CTR</th>
              </tr>
            </thead>
            <tbody>
              {sortedAds.map((ad, i) => (
                <tr key={i} className="border-b border-border/20 hover:bg-secondary/30 transition-colors">
                  <td className="py-2 px-2 text-foreground font-medium max-w-[200px] truncate" title={ad.adName}>{ad.adName}</td>
                  <td className="py-2 px-2 text-muted-foreground max-w-[150px] truncate" title={ad.campaign}>{ad.campaign}</td>
                  <td className="py-2 px-2 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${ad.status === "active" ? "bg-success" : ad.status === "not_delivering" ? "bg-warning" : "bg-muted-foreground/50"}`} />
                  </td>
                  <td className="py-2 px-2 text-right text-foreground font-mono">{formatBRL(ad.amountSpent)}</td>
                  <td className="py-2 px-2 text-right text-foreground font-mono">
                    {ad.results > 0 ? ad.results : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground font-mono">
                    {ad.costPerResult > 0 ? formatBRL(ad.costPerResult) : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-foreground font-mono">{ad.linkClicks || "—"}</td>
                  <td className="py-2 px-2 text-right text-foreground font-mono">{ad.ctr > 0 ? `${ad.ctr.toFixed(2)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
