import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface SourceChartProps {
  data: { name: string; count: number }[];
}

const sourceColors: Record<string, string> = {
  "Google Ads": "hsl(199, 89%, 48%)",
  "Instagram": "hsl(330, 80%, 60%)",
  "Facebook": "hsl(220, 70%, 55%)",
  "Landing Page": "hsl(142, 71%, 45%)",
  "Direto": "hsl(262, 83%, 58%)",
};

export function SourceChart({ data }: SourceChartProps) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Leads por Fonte</h3>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              dataKey="count"
              nameKey="name"
              stroke="none"
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={sourceColors[entry.name] || `hsl(${index * 60}, 60%, 50%)`} />
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
            <Legend 
              wrapperStyle={{ fontSize: 12, color: "hsl(210, 40%, 85%)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
