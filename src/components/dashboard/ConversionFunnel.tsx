import { useMemo } from "react";
import { Lead } from "@/data/parseLeads";
import { Users, Calendar, Target, Trophy, ArrowDown } from "lucide-react";

interface ConversionFunnelProps {
  leads: Lead[];
}

interface FunnelStep {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

export function ConversionFunnel({ leads }: ConversionFunnelProps) {
  const steps: FunnelStep[] = useMemo(() => {
    const total = leads.length;
    const agendamentos = leads.filter((l) => l.stage === "AGENDAMENTO").length;
    const negociacoes = leads.filter((l) => l.stage === "NEGOCIAÇÃO").length;
    const vendas = leads.filter((l) => l.stage.toLowerCase().startsWith("closed - won")).length;

    return [
      { label: "Total Leads", count: total, icon: <Users className="w-5 h-5" />, colorClass: "text-primary", bgClass: "bg-primary/15" },
      { label: "Agendamento", count: agendamentos, icon: <Calendar className="w-5 h-5" />, colorClass: "text-success", bgClass: "bg-success/15" },
      { label: "Negociação", count: negociacoes, icon: <Target className="w-5 h-5" />, colorClass: "text-warning", bgClass: "bg-warning/15" },
      { label: "Venda Ganha", count: vendas, icon: <Trophy className="w-5 h-5" />, colorClass: "text-accent", bgClass: "bg-accent/15" },
    ];
  }, [leads]);

  const maxCount = steps[0].count || 1;

  return (
    <div className="glass-card p-5 space-y-2">
      <h3 className="text-sm font-semibold text-foreground mb-4">Funil de Conversão</h3>

      <div className="flex flex-col items-center gap-1">
        {steps.map((step, i) => {
          const widthPercent = Math.max(((step.count / maxCount) * 100), 18);
          const conversionRate = i > 0 && steps[i - 1].count > 0
            ? ((step.count / steps[i - 1].count) * 100).toFixed(1)
            : null;

          return (
            <div key={step.label} className="w-full flex flex-col items-center">
              {i > 0 && (
                <div className="flex flex-col items-center py-1">
                  <ArrowDown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] font-mono text-muted-foreground">{conversionRate}%</span>
                </div>
              )}
              <div
                className={`${step.bgClass} border border-border/30 rounded-xl px-4 py-3 flex items-center justify-between transition-all duration-500`}
                style={{ width: `${widthPercent}%`, minWidth: "200px" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className={step.colorClass}>{step.icon}</div>
                  <span className="text-sm font-medium text-foreground">{step.label}</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${step.colorClass}`}>{step.count}</span>
                  {i > 0 && (
                    <span className="text-[10px] text-muted-foreground block font-mono">
                      {((step.count / maxCount) * 100).toFixed(1)}% do total
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
