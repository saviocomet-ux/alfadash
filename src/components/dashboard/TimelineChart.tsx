import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineChartProps {
  data: { date: string; count: number }[];
}

export function TimelineChart({ data }: TimelineChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR }),
  }));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Dia</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formatted} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" />
            <XAxis dataKey="label" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 9%)",
                border: "1px solid hsl(222, 30%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(199, 89%, 48%)"
              strokeWidth={2}
              fill="url(#colorLeads)"
              name="Leads"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
