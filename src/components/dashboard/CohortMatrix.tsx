import { useMemo } from "react";
import { Lead } from "@/data/parseLeads";
import { MetaAd } from "@/data/parseMetaAds";
import { GoogleAdsKeyword } from "@/data/parseGoogleAds";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart, CartesianGrid } from "recharts";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatPercent = (v: number) => `${v.toFixed(1)}%`;

const tooltipStyle = {
  backgroundColor: "hsl(222, 47%, 9%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: "8px",
  color: "hsl(210, 40%, 96%)",
  fontSize: 12,
};

interface CohortMatrixProps {
  leads: Lead[];
  metaAds: MetaAd[];
  googleKeywords: GoogleAdsKeyword[];
}

interface CohortRow {
  month: string;         // "2025-07", "2025-08", etc.
  monthLabel: string;    // "Jul/25", "Ago/25"
  leadsCount: number;
  salesCount: number;
  salesValue: number;
  conversionRate: number;
  invested: number;
  roi: number;
  cac: number;
  avgTicket: number;
}

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const m = parseInt(month) - 1;
  return `${monthNames[m]}/${year.slice(2)}`;
}

export function CohortMatrix({ leads, metaAds, googleKeywords }: CohortMatrixProps) {
  const cohortData = useMemo(() => {
    // Group leads by creation month
    const monthLeads: Record<string, Lead[]> = {};
    leads.forEach((l) => {
      const key = getMonthKey(l.createdAt);
      if (!key) return;
      if (!monthLeads[key]) monthLeads[key] = [];
      monthLeads[key].push(l);
    });

    // Group Meta Ads spend by month
    const metaSpendByMonth: Record<string, number> = {};
    metaAds.forEach((a) => {
      if (!a.startDate) return;
      const key = getMonthKey(a.startDate);
      if (!key) return;
      metaSpendByMonth[key] = (metaSpendByMonth[key] || 0) + a.amountSpent;
    });

    // Google Ads total cost (no date on keywords, distribute evenly across months with leads)
    const googleTotal = googleKeywords.reduce((s, k) => s + k.cost, 0);

    const allMonths = Object.keys(monthLeads).sort();
    const googlePerMonth = allMonths.length > 0 ? googleTotal / allMonths.length : 0;

    const rows: CohortRow[] = allMonths.map((month) => {
      const mLeads = monthLeads[month] || [];
      const won = mLeads.filter((l) => l.stage.toLowerCase().startsWith("closed - won"));
      const salesValue = won.reduce((s, l) => s + l.value, 0);
      const metaSpent = metaSpendByMonth[month] || 0;
      const invested = metaSpent + googlePerMonth;
      const conversionRate = mLeads.length > 0 ? (won.length / mLeads.length) * 100 : 0;
      const roi = invested > 0 ? ((salesValue - invested) / invested) * 100 : 0;
      const cac = won.length > 0 ? invested / won.length : 0;
      const avgTicket = won.length > 0 ? salesValue / won.length : 0;

      return {
        month,
        monthLabel: getMonthLabel(month),
        leadsCount: mLeads.length,
        salesCount: won.length,
        salesValue,
        conversionRate,
        invested,
        roi,
        cac,
        avgTicket,
      };
    });

    return rows;
  }, [leads, metaAds, googleKeywords]);

  const totals = useMemo(() => {
    const t = cohortData.reduce(
      (acc, r) => ({
        leads: acc.leads + r.leadsCount,
        sales: acc.sales + r.salesCount,
        salesValue: acc.salesValue + r.salesValue,
        invested: acc.invested + r.invested,
      }),
      { leads: 0, sales: 0, salesValue: 0, invested: 0 }
    );
    return {
      ...t,
      conversionRate: t.leads > 0 ? (t.sales / t.leads) * 100 : 0,
      roi: t.invested > 0 ? ((t.salesValue - t.invested) / t.invested) * 100 : 0,
      cac: t.sales > 0 ? t.invested / t.sales : 0,
      avgTicket: t.sales > 0 ? t.salesValue / t.sales : 0,
    };
  }, [cohortData]);

  const chartData = useMemo(
    () => cohortData.map((r) => ({
      name: r.monthLabel,
      leads: r.leadsCount,
      vendas: r.salesCount,
      taxa: r.conversionRate,
    })),
    [cohortData]
  );

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-foreground">{totals.leads}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Vendas</p>
          <p className="text-2xl font-bold text-foreground">{totals.sales}</p>
          <p className="text-xs text-muted-foreground">{formatPercent(totals.conversionRate)} conv.</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CAC Médio</p>
          <p className="text-2xl font-bold text-foreground">{formatBRL(totals.cac)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ROI Geral</p>
          <p className={`text-2xl font-bold ${totals.roi >= 0 ? "text-success" : "text-destructive"}`}>
            {formatPercent(totals.roi)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Leads vs Vendas por Mês</h3>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
              <XAxis dataKey="name" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: "hsl(210, 40%, 96%)" }} labelStyle={{ color: "hsl(210, 40%, 96%)" }} />
              <Bar yAxisId="left" dataKey="leads" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} name="Leads" opacity={0.7} />
              <Bar yAxisId="left" dataKey="vendas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Vendas" />
              <Line yAxisId="right" type="monotone" dataKey="taxa" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Taxa Conv. (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cohort Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Matriz de Cohort Mensal</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead className="text-muted-foreground text-xs">Mês</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Leads</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Vendas</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Taxa Conv.</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Valor Vendas</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Ticket Médio</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">Investido</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">CAC</TableHead>
                <TableHead className="text-muted-foreground text-xs text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortData.map((r) => (
                <TableRow key={r.month} className="border-border/30 hover:bg-secondary/50">
                  <TableCell className="text-xs font-medium text-foreground">{r.monthLabel}</TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono">{r.leadsCount}</TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono">{r.salesCount}</TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    <span className={r.conversionRate > 0 ? "text-success" : "text-muted-foreground"}>
                      {formatPercent(r.conversionRate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono">{formatBRL(r.salesValue)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right font-mono">{r.salesCount > 0 ? formatBRL(r.avgTicket) : "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right font-mono">{formatBRL(r.invested)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    <span className={r.salesCount > 0 ? "text-warning" : "text-muted-foreground"}>
                      {r.salesCount > 0 ? formatBRL(r.cac) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    <span className={r.roi >= 0 ? "text-success" : "text-destructive"}>
                      {r.invested > 0 ? formatPercent(r.roi) : "—"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals */}
              <TableRow className="border-border/50 bg-secondary/30 font-bold">
                <TableCell className="text-xs font-bold text-foreground">Total</TableCell>
                <TableCell className="text-xs text-foreground text-right font-mono font-bold">{totals.leads}</TableCell>
                <TableCell className="text-xs text-foreground text-right font-mono font-bold">{totals.sales}</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">
                  <span className="text-success">{formatPercent(totals.conversionRate)}</span>
                </TableCell>
                <TableCell className="text-xs text-foreground text-right font-mono font-bold">{formatBRL(totals.salesValue)}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-right font-mono">{formatBRL(totals.avgTicket)}</TableCell>
                <TableCell className="text-xs text-muted-foreground text-right font-mono font-bold">{formatBRL(totals.invested)}</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">
                  <span className="text-warning">{formatBRL(totals.cac)}</span>
                </TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">
                  <span className={totals.roi >= 0 ? "text-success" : "text-destructive"}>{formatPercent(totals.roi)}</span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
