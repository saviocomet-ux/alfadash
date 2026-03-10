import { useMemo, useState } from "react";
import { Lead } from "@/data/parseLeads";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  const maxValue = Math.max(...sourceData.map((d) => d.totalValue), 1);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-card p-5 border-primary/30 glow-primary transition-all hover:scale-[1.02] duration-300 text-left w-full cursor-pointer"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Vendas por Fonte</p>
            <p className="text-3xl font-bold text-foreground">{sourceData.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{wonLeads.length} vendas · Clique para detalhes</p>
          </div>
          <div className="p-2.5 rounded-lg bg-primary/10">
            <svg className="w-5 h-5 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </div>
        {/* Mini bar preview */}
        <div className="mt-3 space-y-1.5">
          {sourceData.slice(0, 3).map((s) => (
            <div key={s.source} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">{s.source}</span>
                <span className="text-foreground font-mono">{s.count}</span>
              </div>
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                  style={{ width: `${(s.totalValue / maxValue) * 100}%` }}
                />
              </div>
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
                    <TableCell className="text-xs text-foreground text-right font-mono font-bold">{formatBRL(sourceData.reduce((s, d) => s + d.totalValue, 0))}</TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right font-mono">
                      {formatBRL(wonLeads.length > 0 ? sourceData.reduce((s, d) => s + d.totalValue, 0) / wonLeads.length : 0)}
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
