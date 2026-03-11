import { useMemo } from "react";
import { Lead } from "@/data/parseLeads";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const COLORS = [
  "hsl(199, 89%, 48%)",
  "hsl(262, 83%, 58%)",
  "hsl(330, 80%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 55%)",
  "hsl(10, 80%, 55%)",
  "hsl(180, 60%, 45%)",
];

const tooltipStyle = {
  backgroundColor: "hsl(222, 47%, 9%)",
  border: "1px solid hsl(222, 30%, 16%)",
  borderRadius: "8px",
  color: "hsl(210, 40%, 96%)",
  fontSize: 12,
};

interface SalesBySourceCardProps {
  leads: Lead[];
}

interface SourceSalesData {
  source: string;
  count: number;
  totalValue: number;
  avgTicket: number;
}

export function SalesBySourceCard({ leads }: SalesBySourceCardProps) {
  const [open, setOpen] = useState(false);

  const wonLeads = useMemo(
    () => leads.filter((l) => l.stage.toLowerCase().startsWith("closed - won")),
    [leads]
  );

  const sourceData = useMemo(() => {
    const map: Record<string, { count: number; totalValue: number }> = {};
    wonLeads.forEach((l) => {
      const src = l.source || "Direto";
      if (!map[src]) map[src] = { count: 0, totalValue: 0 };
      map[src].count++;
      map[src].totalValue += l.value;
    });
    return Object.entries(map)
      .map(([source, stats]): SourceSalesData => ({
        source,
        count: stats.count,
        totalValue: stats.totalValue,
        avgTicket: stats.count > 0 ? stats.totalValue / stats.count : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [wonLeads]);

  const totalValue = sourceData.reduce((s, d) => s + d.totalValue, 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card p-5 border-primary/30 glow-primary transition-all hover:scale-[1.02] duration-300 text-left w-full cursor-pointer"
      >
        <div className="flex items-start justify-between mb-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendas por Fonte</p>
            <p className="text-xl font-bold text-foreground">{wonLeads.length} vendas · {formatBRL(totalValue)}</p>
            <p className="text-xs text-muted-foreground">Clique para detalhes</p>
          </div>
        </div>
        {/* Mini pie chart */}
        <div className="h-[120px] mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={48}
                dataKey="count"
                nameKey="source"
                stroke="none"
                paddingAngle={2}
              >
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${value} vendas`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
          {sourceData.map((s, i) => (
            <div key={s.source} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              {s.source} ({s.count})
            </div>
          ))}
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="text-foreground">Vendas por Fonte</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead className="text-muted-foreground text-xs">Fonte</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Qtd</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Valor Total</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sourceData.map((s) => (
                  <TableRow key={s.source} className="border-border/30">
                    <TableCell className="text-xs text-foreground font-medium">{s.source}</TableCell>
                    <TableCell className="text-xs text-foreground text-right font-mono">{s.count}</TableCell>
                    <TableCell className="text-xs text-foreground text-right font-mono">{formatBRL(s.totalValue)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right font-mono">{formatBRL(s.avgTicket)}</TableCell>
                  </TableRow>
                ))}
                {sourceData.length > 0 && (
                  <TableRow className="border-border/50 bg-secondary/30">
                    <TableCell className="text-xs text-foreground font-bold">Total</TableCell>
                    <TableCell className="text-xs text-foreground text-right font-mono font-bold">{wonLeads.length}</TableCell>
                    <TableCell className="text-xs text-foreground text-right font-mono font-bold">{formatBRL(totalValue)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right font-mono">
                      {formatBRL(wonLeads.length > 0 ? totalValue / wonLeads.length : 0)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
