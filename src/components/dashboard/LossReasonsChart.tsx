import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Lead } from "@/data/parseLeads";

interface LossReasonsChartProps {
  leads: Lead[];
}

const COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(25, 95%, 53%)",
  "hsl(45, 93%, 47%)",
  "hsl(262, 83%, 58%)",
  "hsl(199, 89%, 48%)",
  "hsl(330, 80%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(215, 20%, 55%)",
];

function extractLossReason(stage: string): string | null {
  const match = stage.match(/^Closed\s*-\s*lost\s*\((.+)\)$/i);
  if (match) return match[1].trim();
  if (/^Closed\s*-\s*lost$/i.test(stage)) return "Sem motivo informado";
  return null;
}

export function LossReasonsChart({ leads }: LossReasonsChartProps) {
  const data = useMemo(() => {
    const reasons: Record<string, number> = {};
    leads.forEach((l) => {
      const reason = extractLossReason(l.stage);
      if (reason) {
        reasons[reason] = (reasons[reason] || 0) + 1;
      }
    });
    return Object.entries(reasons)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [leads]);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Motivos de Perda</h3>
        <p className="text-muted-foreground text-sm">Nenhum lead perdido encontrado.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-2">Motivos de Perda</h3>
      <p className="text-xs text-muted-foreground mb-4">{total} leads perdidos</p>
      <div className="flex flex-col lg:flex-row items-center gap-4">
        <div className="h-[260px] w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                dataKey="count"
                nameKey="name"
                stroke="none"
                paddingAngle={3}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 9%)",
                  border: "1px solid hsl(222, 30%, 16%)",
                  borderRadius: "8px",
                  color: "hsl(210, 40%, 96%)",
                }}
                itemStyle={{ color: "hsl(210, 40%, 96%)" }}
                labelStyle={{ color: "hsl(210, 40%, 96%)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full lg:w-1/2 space-y-2">
          {data.map((item, index) => {
            const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0";
            return (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-foreground flex-1 truncate" title={item.name}>
                  {item.name}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {item.count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
