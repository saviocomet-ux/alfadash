import { useMemo, useState } from "react";
import { parseMetaAds, getMetaKpis, getCampaignStats, getAdSetStats } from "@/data/parseMetaAds";
import { KpiCard } from "./KpiCard";
import { DollarSign, Eye, MousePointerClick, Target, Users, BarChart3, MessageCircle, FileText, ArrowUpDown } from "lucide-react";
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
}

export function MetaAdsDashboard({ startDate, endDate }: MetaAdsDashboardProps) {
  const allAds = useMemo(() => parseMetaAds(), []);

  const ads = useMemo(() => {
    if (!startDate && !endDate) return allAds;
    return allAds.filter((a) => {
      if (!a.startDate) return false;
      const d = new Date(a.startDate);
      if (isNaN(d.getTime())) return false;
      if (startDate && d < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (d > endOfDay) return false;
      }
      return true;
    });
  }, [allAds, startDate, endDate]);

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
      {/* KPIs */}
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
          title="Leads (Formulário + Site)"
          value={totalFormLeads}
          subtitle={totalFormLeads > 0 ? `CPL: ${formatBRL(totalFormSpent / totalFormLeads)}` : "Sem dados"}
          icon={<FileText className="w-5 h-5 text-accent" />}
          variant="default"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total de Resultados"
          value={kpis.totalResults}
          subtitle={`CPR médio: ${formatBRL(kpis.avgCPL)}`}
          icon={<Target className="w-5 h-5 text-warning" />}
          variant="warning"
        />
        <KpiCard
          title="Alcance Total"
          value={kpis.totalReach.toLocaleString("pt-BR")}
          subtitle={`${kpis.totalImpressions.toLocaleString("pt-BR")} impressões`}
          icon={<Eye className="w-5 h-5 text-primary" />}
          variant="primary"
        />
        <KpiCard
          title="Cliques"
          value={kpis.totalClicks.toLocaleString("pt-BR")}
          subtitle={`CTR médio: ${kpis.avgCTR.toFixed(2)}%`}
          icon={<MousePointerClick className="w-5 h-5 text-info" />}
          variant="default"
        />
        <KpiCard
          title="Leads de Formulário"
          value={kpis.totalFormLeads}
          subtitle="Via formulário nativo Meta"
          icon={<FileText className="w-5 h-5 text-success" />}
          variant="success"
        />
      </div>

      {/* Result Type Breakdown */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          Resultados por Tipo de Conversão
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {resultTypeStats.map((r) => (
            <div key={r.type} className="rounded-lg border border-border/50 bg-secondary/30 p-4">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mb-2 ${resultTypeBadge[r.type] || "bg-muted text-muted-foreground"}`}>
                {r.label}
              </span>
              <div className="text-2xl font-bold text-foreground">{r.count}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Investido: {formatBRL(r.spent)} · CPR: {formatBRL(r.spent / r.count)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Campaign spend + Status pie */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Investimento por Campanha
        </h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={campaignStats} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tickFormatter={(v) => `R$${v}`} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={180} tick={{ fill: "hsl(210, 40%, 85%)", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="spent" name="Investido" radius={[0, 6, 6, 0]}>
                {campaignStats.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ad Sets table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          Desempenho por Conjunto de Anúncios
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conjunto</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Investido</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultados</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CPL</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliques</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Alcance</th>
              </tr>
            </thead>
            <tbody>
              {adSetStats.map((set) => (
                <tr key={set.name} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-foreground">{set.name}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground font-mono text-xs">{formatBRL(set.spent)}</td>
                  <td className="py-3 px-3 text-right text-foreground">{set.results}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground font-mono text-xs">
                    {set.results > 0 ? formatBRL(set.spent / set.results) : "—"}
                  </td>
                  <td className="py-3 px-3 text-right text-muted-foreground">{set.clicks.toLocaleString("pt-BR")}</td>
                  <td className="py-3 px-3 text-right text-muted-foreground">{set.reach.toLocaleString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All Ads table */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Todos os Anúncios ({ads.length})</h3>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[140px] h-8 text-xs bg-secondary border-border/50">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Anúncio</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Investido</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Result.</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CPR</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliques</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CTR</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CPM</th>
              </tr>
            </thead>
            <tbody>
              {sortedAds.map((ad, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground max-w-[200px] truncate">{ad.adName}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          ad.status === "active"
                            ? "bg-success/15 text-success"
                            : ad.status === "not_delivering"
                            ? "bg-warning/15 text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ad.status === "active" ? "Ativo" : ad.status === "not_delivering" ? "Pausado" : "Inativo"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground font-mono text-xs">{formatBRL(ad.amountSpent)}</td>
                    <td className="py-3 px-3">
                      {ad.resultType ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${resultTypeBadge[ad.resultType] || "bg-muted text-muted-foreground"}`}>
                          {resultTypeLabels[ad.resultType] || ad.resultType}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-foreground">{ad.results || "—"}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground font-mono text-xs">
                      {ad.costPerResult > 0 ? formatBRL(ad.costPerResult) : "—"}
                    </td>
                    <td className="py-3 px-3 text-right text-muted-foreground">{ad.linkClicks || "—"}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground text-xs">{ad.ctr > 0 ? `${ad.ctr.toFixed(2)}%` : "—"}</td>
                    <td className="py-3 px-3 text-right text-muted-foreground font-mono text-xs">{ad.cpm > 0 ? formatBRL(ad.cpm) : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
