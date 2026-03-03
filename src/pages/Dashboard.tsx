import { useMemo, useState } from "react";
import { parseLeads, getStageStats, getSourceStats, getDailyLeads, getTopTerms, Lead } from "@/data/parseLeads";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StageChart } from "@/components/dashboard/StageChart";
import { SourceChart } from "@/components/dashboard/SourceChart";
import { TimelineChart } from "@/components/dashboard/TimelineChart";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { TopTerms } from "@/components/dashboard/TopTerms";
import { UtmReport } from "@/components/dashboard/UtmReport";
import { MetaAdsDashboard } from "@/components/dashboard/MetaAdsDashboard";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, TrendingUp, Calendar, Target, Search, Megaphone, CheckCircle } from "lucide-react";

function filterByDateRange<T>(items: T[], getDate: (item: T) => string, start?: Date, end?: Date): T[] {
  if (!start && !end) return items;
  return items.filter((item) => {
    const dateStr = getDate(item);
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (start && d < start) return false;
    if (end) {
      const endOfDay = new Date(end);
      endOfDay.setHours(23, 59, 59, 999);
      if (d > endOfDay) return false;
    }
    return true;
  });
}

const Dashboard = () => {
  const allLeads = useMemo(() => parseLeads(), []);

  // CRM date filter
  const [crmStart, setCrmStart] = useState<Date | undefined>();
  const [crmEnd, setCrmEnd] = useState<Date | undefined>();

  // Meta date filter
  const [metaStart, setMetaStart] = useState<Date | undefined>();
  const [metaEnd, setMetaEnd] = useState<Date | undefined>();

  const leads = useMemo(
    () => filterByDateRange(allLeads, (l) => l.createdAt, crmStart, crmEnd),
    [allLeads, crmStart, crmEnd]
  );

  const stageStats = useMemo(() => getStageStats(leads), [leads]);
  const sourceStats = useMemo(() => getSourceStats(leads), [leads]);
  const dailyLeads = useMemo(() => getDailyLeads(leads), [leads]);
  const topTerms = useMemo(() => getTopTerms(leads), [leads]);

  const agendamentos = leads.filter((l) => l.stage === "AGENDAMENTO").length;
  const negociacoes = leads.filter((l) => l.stage === "NEGOCIAÇÃO").length;
  const vendasGanhas = leads.filter((l) => l.stage.toLowerCase().startsWith("closed - won")).length;
  const safePercent = (n: number) => leads.length > 0 ? ((n / leads.length) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Search className="w-4 h-4 text-primary-foreground" />
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
      <main className="max-w-[1440px] mx-auto px-6 py-6">
        <Tabs defaultValue="crm" className="space-y-6">
          <TabsList className="bg-secondary border border-border/50">
            <TabsTrigger value="crm" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Users className="w-4 h-4" />
              CRM Leads
            </TabsTrigger>
            <TabsTrigger value="meta" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Megaphone className="w-4 h-4" />
              Meta Ads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="space-y-6">
            {/* Date Filter */}
            <DateRangeFilter
              startDate={crmStart}
              endDate={crmEnd}
              onStartChange={setCrmStart}
              onEndChange={setCrmEnd}
              onClear={() => { setCrmStart(undefined); setCrmEnd(undefined); }}
            />

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Total de Leads" value={leads.length} subtitle={allLeads.length !== leads.length ? `de ${allLeads.length} no total` : "Todos os leads importados"} icon={<Users className="w-5 h-5 text-primary" />} variant="primary" />
              <KpiCard title="Agendamentos" value={agendamentos} subtitle={`${safePercent(agendamentos)}% do total`} icon={<Calendar className="w-5 h-5 text-success" />} variant="success" />
              <KpiCard title="Negociações" value={negociacoes} subtitle={`${safePercent(negociacoes)}% do total`} icon={<Target className="w-5 h-5 text-warning" />} variant="warning" />
              <KpiCard title="Vendas Ganhas" value={vendasGanhas} subtitle={`${safePercent(vendasGanhas)}% do total`} icon={<CheckCircle className="w-5 h-5 text-info" />} variant="default" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StageChart data={stageStats} />
              <SourceChart data={sourceStats} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <TimelineChart data={dailyLeads} />
              </div>
              <TopTerms data={topTerms} />
            </div>
            <UtmReport leads={leads} />
            <LeadsTable leads={leads} />
          </TabsContent>

          <TabsContent value="meta">
            <div className="space-y-6">
              <DateRangeFilter
                startDate={metaStart}
                endDate={metaEnd}
                onStartChange={setMetaStart}
                onEndChange={setMetaEnd}
                onClear={() => { setMetaStart(undefined); setMetaEnd(undefined); }}
              />
              <MetaAdsDashboard startDate={metaStart} endDate={metaEnd} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
