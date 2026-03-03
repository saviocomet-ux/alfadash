import { useMemo, useState } from "react";
import { Lead } from "@/data/parseLeads";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Globe, Layers, Megaphone, Search } from "lucide-react";

interface UtmReportProps {
  leads: Lead[];
}

type UtmDimension = "source" | "medium" | "campaign" | "term";

interface UtmRow {
  label: string;
  count: number;
  percent: number;
}

function buildUtmRows(leads: Lead[], field: UtmDimension): UtmRow[] {
  const map: Record<string, number> = {};
  leads.forEach((l) => {
    const val = l[field] || "(não definido)";
    map[val] = (map[val] || 0) + 1;
  });
  const total = leads.length || 1;
  return Object.entries(map)
    .map(([label, count]) => ({ label, count, percent: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

const dimensionConfig: Record<UtmDimension, { label: string; icon: React.ReactNode }> = {
  source: { label: "Fonte", icon: <Globe className="w-4 h-4" /> },
  medium: { label: "Mídia", icon: <Layers className="w-4 h-4" /> },
  campaign: { label: "Campanha", icon: <Megaphone className="w-4 h-4" /> },
  term: { label: "Termo", icon: <Search className="w-4 h-4" /> },
};

const barColors: string[] = [
  "from-primary to-primary/70",
  "from-accent to-accent/70",
  "from-success to-success/70",
  "from-warning to-warning/70",
  "from-info to-info/70",
];

export function UtmReport({ leads }: UtmReportProps) {
  const [dimension, setDimension] = useState<UtmDimension>("source");

  const rows = useMemo(() => buildUtmRows(leads, dimension), [leads, dimension]);
  const max = rows.length > 0 ? rows[0].count : 1;

  // Summary stats
  const uniqueSources = useMemo(() => new Set(leads.map((l) => l.source || "(não definido)")).size, [leads]);
  const uniqueCampaigns = useMemo(() => new Set(leads.filter((l) => l.campaign).map((l) => l.campaign)).size, [leads]);
  const withUtm = useMemo(() => leads.filter((l) => l.source || l.medium || l.campaign || l.term).length, [leads]);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Relatório UTM</h3>
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{uniqueSources}</strong> fontes</span>
          <span><strong className="text-foreground">{uniqueCampaigns}</strong> campanhas</span>
          <span><strong className="text-foreground">{((withUtm / (leads.length || 1)) * 100).toFixed(0)}%</strong> com UTM</span>
        </div>
      </div>

      <Tabs value={dimension} onValueChange={(v) => setDimension(v as UtmDimension)}>
        <TabsList className="bg-secondary border border-border/50 w-full">
          {(Object.keys(dimensionConfig) as UtmDimension[]).map((dim) => (
            <TabsTrigger
              key={dim}
              value={dim}
              className="flex-1 gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {dimensionConfig[dim].icon}
              {dimensionConfig[dim].label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {rows.map((row, i) => (
          <div key={row.label} className="group">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground truncate mr-2 max-w-[60%]" title={row.label}>
                {row.label}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground font-mono">{row.count}</span>
                <span className="text-muted-foreground font-mono w-12 text-right">{row.percent.toFixed(1)}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barColors[i % barColors.length]} transition-all duration-500`}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum dado UTM encontrado.</p>
        )}
      </div>
    </div>
  );
}
