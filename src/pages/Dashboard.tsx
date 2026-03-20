import { useMemo, useState } from "react";
import { getStageStats, getSourceStats, getDailyLeads, getTopTerms, Lead } from "@/data/parseLeads";
import { getMetaKpis, MetaAd } from "@/data/parseMetaAds";
import { useMetaAdsApi } from "@/hooks/useMetaAdsApi";
import { useKommoData } from "@/hooks/useKommoData";
import { useGoogleAdsApi } from "@/hooks/useGoogleAdsApi";
import { parseGoogleAdsKeywords, getGoogleAdsKpis } from "@/data/parseGoogleAds";
import { CohortMatrix } from "@/components/dashboard/CohortMatrix";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StageChart } from "@/components/dashboard/StageChart";
import { SourceChart } from "@/components/dashboard/SourceChart";
import { TimelineChart } from "@/components/dashboard/TimelineChart";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import { TopTerms } from "@/components/dashboard/TopTerms";
import { UtmReport } from "@/components/dashboard/UtmReport";
import { SalesBySourceCard } from "@/components/dashboard/SalesBySourceCard";
import { LossReasonsChart } from "@/components/dashboard/LossReasonsChart";
import { MetaAdsDashboard } from "@/components/dashboard/MetaAdsDashboard";
import { GoogleAdsDashboard } from "@/components/dashboard/GoogleAdsDashboard";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { SheetsConfigDialog } from "@/components/dashboard/SheetsConfigDialog";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, TrendingUp, Calendar, Target, Search, Megaphone, CheckCircle, DollarSign, BarChart3, Clock, Wallet, Grid3X3, RefreshCw, Loader2 } from "lucide-react";

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

const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Dashboard = () => {
  // Google Sheets — only for Google Ads now
  const sheets = useGoogleSheetsData();

  // CRM: always from Kommo API
  const kommo = useKommoData(true);
  const effectiveAllLeads = useMemo(() => kommo.leads || [], [kommo.leads]);

  // Meta Ads: always from API
  const [metaStart, setMetaStart] = useState<Date | undefined>();
  const [metaEnd, setMetaEnd] = useState<Date | undefined>();
  const metaApi = useMetaAdsApi(true, metaStart, metaEnd);
  const metaAds: MetaAd[] = useMemo(() => metaApi.data || [], [metaApi.data]);

  // CRM date filter
  const [crmStart, setCrmStart] = useState<Date | undefined>();
  const [crmEnd, setCrmEnd] = useState<Date | undefined>();

  // Source/campaign filters
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterCampaign, setFilterCampaign] = useState<string>("all");

  // Google date filter & API
  const [googleStart, setGoogleStart] = useState<Date | undefined>();
  const [googleEnd, setGoogleEnd] = useState<Date | undefined>();
  const [useGoogleApi, setUseGoogleApi] = useState(false);
  const googleApi = useGoogleAdsApi(useGoogleApi, googleStart, googleEnd);

  const dateFilteredLeads = useMemo(
    () => filterByDateRange(effectiveAllLeads, (l) => l.createdAt, crmStart, crmEnd),
    [effectiveAllLeads, crmStart, crmEnd]
  );

  // Apply source/campaign filters
  const leads = useMemo(() => {
    let filtered = dateFilteredLeads;
    if (filterSource !== "all") filtered = filtered.filter((l) => l.source === filterSource);
    if (filterCampaign !== "all") filtered = filtered.filter((l) => l.campaign === filterCampaign);
    return filtered;
  }, [dateFilteredLeads, filterSource, filterCampaign]);

  // Unique sources and campaigns for filter dropdowns
  const uniqueSources = useMemo(() => [...new Set(effectiveAllLeads.map((l) => l.source).filter(Boolean))].sort(), [effectiveAllLeads]);
  const uniqueCampaigns = useMemo(() => [...new Set(effectiveAllLeads.map((l) => l.campaign).filter(Boolean))].sort(), [effectiveAllLeads]);

  const stageStats = useMemo(() => getStageStats(leads), [leads]);
  const sourceStats = useMemo(() => getSourceStats(leads), [leads]);
  const dailyLeads = useMemo(() => getDailyLeads(leads), [leads]);
  const topTerms = useMemo(() => getTopTerms(leads), [leads]);

  const agendamentos = leads.filter((l) => l.stage === "AGENDAMENTO").length;
  const negociacoes = leads.filter((l) => l.stage === "NEGOCIAÇÃO").length;
  const wonLeads = leads.filter((l) => l.stage.toLowerCase().startsWith("closed - won"));
  const vendasGanhas = wonLeads.length;
  const valorVendasGanhas = wonLeads.reduce((sum, l) => sum + l.value, 0);
  const safePercent = (n: number) => leads.length > 0 ? ((n / leads.length) * 100).toFixed(1) : "0";

  // Meta Ads KPIs from API data
  const metaKpis = useMemo(() => getMetaKpis(metaAds), [metaAds]);
  
  // Google Ads from Sheets/CSV
  const googleKeywords = useMemo(() => parseGoogleAdsKeywords(sheets.googleAdsKeywordsCSV), [sheets.googleAdsKeywordsCSV]);
  const googleKpis = useMemo(() => getGoogleAdsKpis(googleKeywords), [googleKeywords]);
  const totalInvestido = metaKpis.totalSpent + googleKpis.totalCost;

  // Tempo médio de fechamento
  const tempoMedioFechamento = useMemo(() => {
    const tempos = wonLeads
      .filter((l) => l.createdAt && l.modifiedAt)
      .map((l) => {
        const created = new Date(l.createdAt);
        const modified = new Date(l.modifiedAt);
        return (modified.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((d) => d >= 0);
    return tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0;
  }, [wonLeads]);

  const roi = totalInvestido > 0 ? ((valorVendasGanhas - totalInvestido) / totalInvestido) * 100 : 0;
  const roas = totalInvestido > 0 ? valorVendasGanhas / totalInvestido : 0;

  const hasFilters = filterSource !== "all" || filterCampaign !== "all";

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
          <div className="flex items-center gap-4">
            <SheetsConfigDialog
              config={sheets.config}
              onSave={sheets.updateConfig}
              loading={sheets.loading}
              onRefetch={sheets.refetch}
            />
            <div className="text-xs text-muted-foreground font-mono">
              Atualizado em {new Date().toLocaleDateString("pt-BR")}
            </div>
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
            <TabsTrigger value="google" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Search className="w-4 h-4" />
              Google Ads
            </TabsTrigger>
            <TabsTrigger value="cohort" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
              <Grid3X3 className="w-4 h-4" />
              Cohort
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crm" className="space-y-6">
            {/* CRM Header: Date Filter + Refresh */}
            <div className="flex flex-wrap items-center gap-4">
              <DateRangeFilter
                startDate={crmStart}
                endDate={crmEnd}
                onStartChange={setCrmStart}
                onEndChange={setCrmEnd}
                onClear={() => { setCrmStart(undefined); setCrmEnd(undefined); }}
              />
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => kommo.fetch()}
                  disabled={kommo.loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors disabled:opacity-50"
                  title="Atualizar dados do Kommo"
                >
                  {kommo.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {kommo.loading ? "Atualizando..." : "Atualizar CRM"}
                </button>
              </div>
            </div>
            {kommo.error && (
              <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg">
                Erro ao buscar dados do Kommo: {kommo.error}
              </div>
            )}
            {kommo.loading && effectiveAllLeads.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando dados do CRM...
              </div>
            )}

            {/* Source & Campaign Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Fonte:</span>
                <Select value={filterSource} onValueChange={setFilterSource}>
                  <SelectTrigger className="w-[180px] h-8 text-xs bg-secondary border-border/50">
                    <SelectValue placeholder="Todas as fontes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fontes</SelectItem>
                    {uniqueSources.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Campanha:</span>
                <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                  <SelectTrigger className="w-[220px] h-8 text-xs bg-secondary border-border/50">
                    <SelectValue placeholder="Todas as campanhas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as campanhas</SelectItem>
                    {uniqueCampaigns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setFilterSource("all"); setFilterCampaign("all"); }}
                  className="text-xs text-destructive hover:text-destructive/80 underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Total de Leads" value={leads.length} subtitle={effectiveAllLeads.length !== leads.length ? `de ${effectiveAllLeads.length} no total` : "Dados ao vivo do CRM"} icon={<Users className="w-5 h-5 text-primary" />} variant="primary" />
              <KpiCard title="Agendamentos" value={agendamentos} subtitle={`${safePercent(agendamentos)}% do total`} icon={<Calendar className="w-5 h-5 text-success" />} variant="success" />
              <KpiCard title="Negociações" value={negociacoes} subtitle={`${safePercent(negociacoes)}% do total`} icon={<Target className="w-5 h-5 text-warning" />} variant="warning" />
              <KpiCard title="Vendas Ganhas" value={vendasGanhas} subtitle={formatBRL(valorVendasGanhas)} icon={<CheckCircle className="w-5 h-5 text-info" />} variant="default" />
            </div>

            {/* ROI / ROAS / Investido / Tempo Médio / Vendas por Fonte */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                title="Total Investido"
                value={formatBRL(totalInvestido)}
                subtitle={`Meta: ${formatBRL(metaKpis.totalSpent)} · Google: ${formatBRL(googleKpis.totalCost)}`}
                icon={<Wallet className="w-5 h-5 text-warning" />}
                variant="warning"
              />
              <KpiCard
                title="Valor Vendas Ganhas"
                value={formatBRL(valorVendasGanhas)}
                subtitle={`${vendasGanhas} vendas fechadas`}
                icon={<DollarSign className="w-5 h-5 text-success" />}
                variant="success"
              />
              <KpiCard
                title="Tempo Médio Fechamento"
                value={`${tempoMedioFechamento.toFixed(1)} dias`}
                subtitle={`Baseado em ${wonLeads.length} vendas ganhas`}
                icon={<Clock className="w-5 h-5 text-primary" />}
                variant="primary"
              />
              <KpiCard
                title="ROI"
                value={`${roi.toFixed(1)}%`}
                subtitle={`Investido: ${formatBRL(totalInvestido)}`}
                icon={<TrendingUp className="w-5 h-5 text-primary" />}
                variant="primary"
              />
              <KpiCard
                title="ROAS"
                value={`${roas.toFixed(2)}x`}
                subtitle={`Retorno por R$1 investido`}
                icon={<BarChart3 className="w-5 h-5 text-warning" />}
                variant="warning"
              />
              <SalesBySourceCard leads={leads} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StageChart data={stageStats} />
              <SourceChart data={sourceStats} />
            </div>
            <LossReasonsChart leads={leads} />
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
              <MetaAdsDashboard
                startDate={metaStart}
                endDate={metaEnd}
                data={metaAds}
                loading={metaApi.loading}
                error={metaApi.error}
                onRefresh={() => {
                  const since = metaStart ? metaStart.toISOString().split("T")[0] : undefined;
                  const until = metaEnd ? metaEnd.toISOString().split("T")[0] : undefined;
                  metaApi.fetchFromApi(since, until);
                }}
              />
            </div>
          </TabsContent>
          <TabsContent value="google">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <DateRangeFilter
                  startDate={googleStart}
                  endDate={googleEnd}
                  onStartChange={setGoogleStart}
                  onEndChange={setGoogleEnd}
                  onClear={() => { setGoogleStart(undefined); setGoogleEnd(undefined); }}
                />
                <div className="flex items-center gap-2 ml-auto">
                  <Switch id="google-api-toggle" checked={useGoogleApi} onCheckedChange={setUseGoogleApi} />
                  <Label htmlFor="google-api-toggle" className="text-xs font-medium text-muted-foreground">
                    Google Ads API (ao vivo)
                  </Label>
                  {useGoogleApi && (
                    <button
                      onClick={() => googleApi.fetch()}
                      disabled={googleApi.loading}
                      className="ml-2 p-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
                      title="Atualizar dados do Google Ads"
                    >
                      {googleApi.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  )}
                </div>
              </div>
              {googleApi.error && (
                <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg">
                  Erro ao buscar dados do Google Ads: {googleApi.error}
                </div>
              )}
              {useGoogleApi && googleApi.loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando dados do Google Ads...
                </div>
              )}
              <GoogleAdsDashboard
                startDate={googleStart}
                endDate={googleEnd}
                keywordsCsvOverride={sheets.googleAdsKeywordsCSV}
                timelineCsvOverride={sheets.googleAdsTimelineCSV}
                apiData={useGoogleApi ? googleApi.data : null}
              />
            </div>
          </TabsContent>
          <TabsContent value="cohort">
            <CohortMatrix leads={effectiveAllLeads} metaAds={metaAds} googleKeywords={googleKeywords} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
