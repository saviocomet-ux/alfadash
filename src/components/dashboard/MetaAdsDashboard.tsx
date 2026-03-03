import { useMemo } from "react";
import { parseMetaAds, getMetaKpis, getCampaignStats, getAdSetStats } from "@/data/parseMetaAds";
import { KpiCard } from "./KpiCard";
import { DollarSign, Eye, MousePointerClick, Target, Users, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

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

export function MetaAdsDashboard() {
  const ads = useMemo(() => parseMetaAds(), []);
  const kpis = useMemo(() => getMetaKpis(ads), [ads]);
  const campaignStats = useMemo(() => getCampaignStats(ads), [ads]);
  const adSetStats = useMemo(() => getAdSetStats(ads), [ads]);

  const activeAds = ads.filter((a) => a.status === "active").length;
  const statusData = [
    { name: "Ativo", count: ads.filter((a) => a.status === "active").length },
    { name: "Inativo", count: ads.filter((a) => a.status === "inactive").length },
    { name: "Pausado", count: ads.filter((a) => a.status === "not_delivering").length },
  ].filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Investido"
          value={formatBRL(kpis.totalSpent)}
          subtitle={`${ads.length} anúncios (${activeAds} ativos)`}
          icon={<DollarSign className="w-5 h-5 text-primary" />}
          variant="primary"
        />
        <KpiCard
          title="Resultados"
          value={kpis.totalResults}
          subtitle={`CPL médio: ${formatBRL(kpis.avgCPL)}`}
          icon={<Target className="w-5 h-5 text-success" />}
          variant="success"
        />
        <KpiCard
          title="Alcance Total"
          value={kpis.totalReach.toLocaleString("pt-BR")}
          subtitle={`${kpis.totalImpressions.toLocaleString("pt-BR")} impressões`}
          icon={<Eye className="w-5 h-5 text-warning" />}
          variant="warning"
        />
        <KpiCard
          title="Cliques"
          value={kpis.totalClicks.toLocaleString("pt-BR")}
          subtitle={`CTR médio: ${kpis.avgCTR.toFixed(2)}%`}
          icon={<MousePointerClick className="w-5 h-5 text-info" />}
          variant="default"
        />
      </div>

      {/* Campaign spend + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-card p-5">
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

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Status dos Anúncios</h3>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="name" stroke="none" paddingAngle={3}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {statusData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                {d.name} ({d.count})
              </div>
            ))}
          </div>
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
        <h3 className="text-sm font-semibold text-foreground mb-4">Todos os Anúncios ({ads.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Anúncio</th>
                <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Investido</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Result.</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CPR</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliques</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CTR</th>
                <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">CPM</th>
              </tr>
            </thead>
            <tbody>
              {ads
                .sort((a, b) => b.amountSpent - a.amountSpent)
                .map((ad, i) => (
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
