import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StageChartProps {
  data: { name: string; count: number }[];
}

const stageColors: Record<string, string> = {
  "Qualificação": "hsl(199, 89%, 48%)",
  "AGENDAMENTO": "hsl(142, 71%, 45%)",
  "NEGOCIAÇÃO": "hsl(38, 92%, 50%)",
  "Incoming leads": "hsl(262, 83%, 58%)",
  "Sem etapa": "hsl(215, 20%, 55%)",
};

export function StageChart({ data }: StageChartProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Etapa</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 16%)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "hsl(215, 20%, 55%)", fontSize: 12 }} />
            <YAxis 
              type="category" 
              dataKey="name" 
              tick={{ fill: "hsl(210, 40%, 85%)", fontSize: 12 }} 
              width={120}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222, 47%, 9%)",
                border: "1px solid hsl(222, 30%, 16%)",
                borderRadius: "8px",
                color: "hsl(210, 40%, 96%)",
              }}
            />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={28}>
              {data.map((entry, index) => (
                <Cell key={index} fill={stageColors[entry.name] || "hsl(215, 20%, 55%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
