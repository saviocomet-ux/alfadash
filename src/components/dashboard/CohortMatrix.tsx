import { useMemo } from "react";
import { Lead } from "@/data/parseLeads";
import { MetaAd } from "@/data/parseMetaAds";
import { GoogleAdsKeyword } from "@/data/parseGoogleAds";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getMonthKey(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const m = parseInt(month) - 1;
  return `${monthNames[m]}/${year.slice(2)}`;
}

interface CohortMatrixProps {
  leads: Lead[];
  metaAds: MetaAd[];
  googleKeywords: GoogleAdsKeyword[];
}

interface CohortCell {
  salesCount: number;
  salesValue: number;
}

export function CohortMatrix({ leads, metaAds, googleKeywords }: CohortMatrixProps) {
  const { matrix, creationMonths, closeMonths, rowTotals, colTotals, grandTotal } = useMemo(() => {
    // Build cohort matrix: rows = creation month, cols = close month
    const matrix: Record<string, Record<string, CohortCell>> = {};
    const creationSet = new Set<string>();
    const closeSet = new Set<string>();

    leads.forEach((l) => {
      const createKey = getMonthKey(l.createdAt);
      if (!createKey) return;
      creationSet.add(createKey);

      // Count as lead in creation month
      if (!matrix[createKey]) matrix[createKey] = {};

      // Check if won and has a close date
      if (l.stage.toLowerCase().startsWith("closed - won") && l.closedAt) {
        const closeKey = getMonthKey(l.closedAt);
        if (!closeKey) return;
        closeSet.add(closeKey);

        if (!matrix[createKey][closeKey]) {
          matrix[createKey][closeKey] = { salesCount: 0, salesValue: 0 };
        }
        matrix[createKey][closeKey].salesCount += 1;
        matrix[createKey][closeKey].salesValue += l.value;
      }
    });

    const creationMonths = Array.from(creationSet).sort();
    const closeMonths = Array.from(new Set([...creationSet, ...closeSet])).sort();

    // Row totals (per creation month)
    const rowTotals: Record<string, { leads: number; sales: number; value: number }> = {};
    creationMonths.forEach((cm) => {
      const monthLeads = leads.filter((l) => getMonthKey(l.createdAt) === cm);
      const sales = closeMonths.reduce((s, clm) => s + (matrix[cm]?.[clm]?.salesCount || 0), 0);
      const value = closeMonths.reduce((s, clm) => s + (matrix[cm]?.[clm]?.salesValue || 0), 0);
      rowTotals[cm] = { leads: monthLeads.length, sales, value };
    });

    // Column totals
    const colTotals: Record<string, { sales: number; value: number }> = {};
    closeMonths.forEach((clm) => {
      const sales = creationMonths.reduce((s, cm) => s + (matrix[cm]?.[clm]?.salesCount || 0), 0);
      const value = creationMonths.reduce((s, cm) => s + (matrix[cm]?.[clm]?.salesValue || 0), 0);
      colTotals[clm] = { sales, value };
    });

    const grandTotal = {
      leads: Object.values(rowTotals).reduce((s, r) => s + r.leads, 0),
      sales: Object.values(rowTotals).reduce((s, r) => s + r.sales, 0),
      value: Object.values(rowTotals).reduce((s, r) => s + r.value, 0),
    };

    return { matrix, creationMonths, closeMonths, rowTotals, colTotals, grandTotal };
  }, [leads]);

  // Average days to close per cohort month
  const cohortAvgDays = useMemo(() => {
    const cohortDays: Record<string, number[]> = {};
    leads.forEach((l) => {
      if (!l.stage.toLowerCase().startsWith("closed - won") || !l.closedAt || !l.createdAt) return;
      const createKey = getMonthKey(l.createdAt);
      if (!createKey) return;
      const created = new Date(l.createdAt);
      const closed = new Date(l.closedAt);
      const diffDays = Math.max(0, Math.round((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
      if (!cohortDays[createKey]) cohortDays[createKey] = [];
      cohortDays[createKey].push(diffDays);
    });
    return creationMonths.map((m) => {
      const days = cohortDays[m] || [];
      const avg = days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : 0;
      const min = days.length > 0 ? Math.min(...days) : 0;
      const max = days.length > 0 ? Math.max(...days) : 0;
      return { month: getMonthLabel(m), avg, min, max, count: days.length };
    }).filter((d) => d.count > 0);
  }, [leads, creationMonths]);

  // Find max cell value for heatmap intensity
  const maxCellValue = useMemo(() => {
    let max = 0;
    creationMonths.forEach((cm) => {
      closeMonths.forEach((clm) => {
        const v = matrix[cm]?.[clm]?.salesCount || 0;
        if (v > max) max = v;
      });
    });
    return max;
  }, [matrix, creationMonths, closeMonths]);

  function getCellBg(count: number): string {
    if (count === 0) return "";
    const intensity = Math.min(count / Math.max(maxCellValue, 1), 1);
    return `hsla(142, 71%, 45%, ${0.15 + intensity * 0.45})`;
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Leads</p>
          <p className="text-2xl font-bold text-foreground">{grandTotal.leads}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Vendas</p>
          <p className="text-2xl font-bold text-foreground">{grandTotal.sales}</p>
          <p className="text-xs text-muted-foreground">
            {grandTotal.leads > 0 ? ((grandTotal.sales / grandTotal.leads) * 100).toFixed(1) : 0}% conv.
          </p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Valor Total</p>
          <p className="text-2xl font-bold text-foreground">{formatBRL(grandTotal.value)}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ticket Médio</p>
          <p className="text-2xl font-bold text-foreground">
            {grandTotal.sales > 0 ? formatBRL(grandTotal.value / grandTotal.sales) : "—"}
          </p>
        </div>
      </div>

      {/* Cohort Matrix Table */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-1">Matriz de Cohort</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Linhas = mês de criação do lead · Colunas = mês de fechamento da venda
        </p>
        <div className="overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground text-xs sticky left-0 bg-background z-10">
                    Criação ↓ / Fechamento →
                  </TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Leads</TableHead>
                  {closeMonths.map((m) => (
                    <TableHead key={m} className="text-muted-foreground text-xs text-center min-w-[60px]">
                      {getMonthLabel(m)}
                    </TableHead>
                  ))}
                  <TableHead className="text-muted-foreground text-xs text-right">Total</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creationMonths.map((cm) => {
                  const rt = rowTotals[cm];
                  const convRate = rt.leads > 0 ? ((rt.sales / rt.leads) * 100).toFixed(1) : "0.0";
                  return (
                    <TableRow key={cm} className="border-border/30 hover:bg-secondary/30">
                      <TableCell className="text-xs font-medium text-foreground sticky left-0 bg-background z-10">
                        {getMonthLabel(cm)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground text-right font-mono">{rt.leads}</TableCell>
                      {closeMonths.map((clm) => {
                        const cell = matrix[cm]?.[clm];
                        const count = cell?.salesCount || 0;
                        const value = cell?.salesValue || 0;
                        return (
                          <TableCell
                            key={clm}
                            className="text-xs text-center font-mono p-1"
                            style={{ backgroundColor: getCellBg(count) }}
                          >
                            {count > 0 ? (
                              <UITooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-foreground cursor-default font-semibold">{count}</span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover text-popover-foreground border-border">
                                  <p className="font-semibold">{count} venda{count > 1 ? "s" : ""}</p>
                                  <p className="text-xs text-muted-foreground">{formatBRL(value)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Lead: {getMonthLabel(cm)} → Fechou: {getMonthLabel(clm)}
                                  </p>
                                </TooltipContent>
                              </UITooltip>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-xs text-foreground text-right font-mono font-semibold">
                        {rt.sales}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        <span className={parseFloat(convRate) > 0 ? "text-success" : "text-muted-foreground"}>
                          {convRate}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Column totals */}
                <TableRow className="border-border/50 bg-secondary/30 font-bold">
                  <TableCell className="text-xs font-bold text-foreground sticky left-0 bg-secondary/30 z-10">
                    Total
                  </TableCell>
                  <TableCell className="text-xs text-foreground text-right font-mono font-bold">
                    {grandTotal.leads}
                  </TableCell>
                  {closeMonths.map((clm) => {
                    const ct = colTotals[clm];
                    return (
                      <TableCell key={clm} className="text-xs text-center font-mono font-bold text-foreground">
                        {ct.sales > 0 ? ct.sales : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-xs text-foreground text-right font-mono font-bold">
                    {grandTotal.sales}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">
                    <span className="text-success">
                      {grandTotal.leads > 0 ? ((grandTotal.sales / grandTotal.leads) * 100).toFixed(1) : 0}%
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
