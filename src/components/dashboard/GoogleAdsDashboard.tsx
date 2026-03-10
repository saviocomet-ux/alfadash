import { useMemo } from "react";
import { parseGoogleAdsTimeline, parseGoogleAdsKeywords, getGoogleAdsKpis, getAdGroupStats } from "@/data/parseGoogleAds";
import { KpiCard } from "./KpiCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, MousePointerClick, Eye, DollarSign, Target, TrendingUp } from "lucide-react";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const tooltipStyle = {
  backgroundColor: "hsl(222, 47%, 9%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: "8px",
  color: "hsl(210, 40%, 96%)",
};

interface GoogleAdsDashboardProps {
  startDate?: Date;
  endDate?: Date;
}

export function GoogleAdsDashboard({ startDate, endDate }: GoogleAdsDashboardProps) {
  const allTimeline = useMemo(() => parseGoogleAdsTimeline(), []);
  const keywords = useMemo(() => parseGoogleAdsKeywords(), []);

  const timeline = useMemo(() => {
    if (!startDate && !endDate) return allTimeline;
    return allTimeline.filter((t) => {
      const d = new Date(t.date);
      if (startDate && d < startDate) return false;
      if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (d > e) return false; }
      return true;
    });
  }, [allTimeline, startDate, endDate]);

  const kpis = useMemo(() => getGoogleAdsKpis(keywords), [keywords]);
  const adGroupStats = useMemo(() => getAdGroupStats(keywords), [keywords]);

  const timelineFormatted = useMemo(
    () => timeline.map((d) => ({
      ...d,
      label: d.date ? format(parseISO(d.date), "dd/MM", { locale: ptBR }) : "",
    })),
    [timeline]
  );

  // Top keywords by clicks (with data)
  const topKeywords = useMemo(
    () => [...keywords].filter((k) => k.clicks > 0).sort((a, b) => b.clicks - a.clicks).slice(0, 15),
    [keywords]
  );

  const activeCount = keywords.filter((k) => k.status === "Ativado").length;
  const qualifiedCount = keywords.filter((k) => k.qualityStatus === "Qualificado").length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Impressões"
          value={kpis.totalImpressions.toLocaleString("pt-BR")}
          subtitle={`${activeCount} palavras ativas`}
          icon={<Eye className="w-5 h-5 text-primary" />}
          variant="primary"
        />
        <KpiCard
          title="Cliques"
          value={kpis.totalClicks.toLocaleString("pt-BR")}
          subtitle={`CTR: ${kpis.avgCTR.toFixed(2)}%`}
          icon={<MousePointerClick className="w-5 h-5 text-success" />}
          variant="success"
        />
        <KpiCard
          title="Custo Total"
          value={formatBRL(kpis.totalCost)}
          subtitle={`CPC méd: ${formatBRL(kpis.avgCPC)}`}
          icon={<DollarSign className="w-5 h-5 text-warning" />}
          variant="warning"
        />
        <KpiCard
          title="Conversões"
          value={kpis.totalConversions.toLocaleString("pt-BR")}
          subtitle={`Taxa: ${kpis.conversionRate.toFixed(1)}% · CPL: ${formatBRL(kpis.costPerConversion)}`}
          icon={<Target className="w-5 h-5 text-primary" />}
          variant="default"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Palavras Qualificadas"
          value={qualifiedCount}
          subtitle={`de ${keywords.length} palavras-chave`}
          icon={<Search className="w-5 h-5 text-success" />}
          variant="success"
        />
        <KpiCard
          title="CPC Médio"
          value={formatBRL(kpis.avgCPC)}
          subtitle="Custo por clique"
          icon={<TrendingUp className="w-5 h-5 text-primary" />}
          variant="primary"
        />
        <KpiCard
          title="Custo / Conversão"
          value={formatBRL(kpis.costPerConversion)}
          subtitle={`${kpis.totalConversions} conversões totais`}
          icon={<DollarSign className="w-5 h-5 text-warning" />}
          variant="warning"
        />
      </div>

      {/* Timeline Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Impressões por Dia</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineFormatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorGoogleImpr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
              <XAxis dataKey="label" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="impressions"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                fill="url(#colorGoogleImpr)"
                name="Impressões"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ad Group Performance */}
      {adGroupStats.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Investimento por Grupo de Anúncios</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adGroupStats} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
                <XAxis type="number" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} tickFormatter={(v) => formatBRL(v)} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 10 }}
                  tickFormatter={(v) => v.length > 35 ? v.slice(0, 35) + "…" : v}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatBRL(value)} />
                <Bar dataKey="cost" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Custo" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Keywords Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          Top Palavras-chave por Cliques
        </h3>
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground text-xs">Palavra-chave</TableHead>
                <TableHead className="text-muted-foreground text-xs">Grupo</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Cliques</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Impr.</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">CTR</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">CPC</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Custo</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Conv.</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Taxa Conv.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topKeywords.map((k, i) => (
                <TableRow key={i} className="border-border/30 hover:bg-secondary/50">
                  <TableCell className="text-xs text-foreground font-medium max-w-[200px] truncate">{k.keyword}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{k.adGroup}</TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono">{k.clicks}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right font-mono">{k.impressions.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right font-mono">{k.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right font-mono">{formatBRL(k.avgCpc)}</TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono">{formatBRL(k.cost)}</TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono">{k.conversions}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right font-mono">{k.conversionRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
