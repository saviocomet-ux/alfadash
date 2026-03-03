import { useMemo } from "react";
import { parseLeads, getStageStats, getSourceStats, getDailyLeads, getTopTerms } from "@/data/parseLeads";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StageChart } from "@/components/dashboard/StageChart";
import { SourceChart } from "@/components/dashboard/SourceChart";
import { TimelineChart } from "@/components/dashboard/TimelineChart";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { TopTerms } from "@/components/dashboard/TopTerms";
import { Users, TrendingUp, Calendar, Target, Zap } from "lucide-react";

const Dashboard = () => {
  const leads = useMemo(() => parseLeads(), []);
  const stageStats = useMemo(() => getStageStats(leads), [leads]);
  const sourceStats = useMemo(() => getSourceStats(leads), [leads]);
  const dailyLeads = useMemo(() => getDailyLeads(leads), [leads]);
  const topTerms = useMemo(() => getTopTerms(leads), [leads]);

  const agendamentos = leads.filter((l) => l.stage === "AGENDAMENTO").length;
  const negociacoes = leads.filter((l) => l.stage === "NEGOCIAÇÃO").length;
  const googleLeads = leads.filter((l) => l.source === "Google Ads").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Agência Alfa</h1>
              <p className="text-xs text-muted-foreground">Dashboard CRM</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            Atualizado em {new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total de Leads"
            value={leads.length}
            subtitle="Todos os leads importados"
            icon={<Users className="w-5 h-5 text-primary" />}
            variant="primary"
          />
          <KpiCard
            title="Agendamentos"
            value={agendamentos}
            subtitle={`${((agendamentos / leads.length) * 100).toFixed(1)}% do total`}
            icon={<Calendar className="w-5 h-5 text-success" />}
            variant="success"
          />
          <KpiCard
            title="Negociações"
            value={negociacoes}
            subtitle={`${((negociacoes / leads.length) * 100).toFixed(1)}% do total`}
            icon={<Target className="w-5 h-5 text-warning" />}
            variant="warning"
          />
          <KpiCard
            title="Google Ads"
            value={googleLeads}
            subtitle={`${((googleLeads / leads.length) * 100).toFixed(1)}% do total`}
            icon={<TrendingUp className="w-5 h-5 text-info" />}
            variant="default"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StageChart data={stageStats} />
          <SourceChart data={sourceStats} />
        </div>

        {/* Timeline + Keywords */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TimelineChart data={dailyLeads} />
          </div>
          <TopTerms data={topTerms} />
        </div>

        {/* Table */}
        <LeadsTable leads={leads} />
      </main>
    </div>
  );
};

export default Dashboard;
