import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { SheetsConfig, hasAnySheetsUrl } from "@/hooks/useGoogleSheetsData";
import { toast } from "sonner";

interface SheetsConfigDialogProps {
  config: SheetsConfig;
  onSave: (config: SheetsConfig) => void;
  loading: boolean;
  onRefetch: () => void;
}

export function SheetsConfigDialog({ config, onSave, loading, onRefetch }: SheetsConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SheetsConfig>(config);
  const isConnected = hasAnySheetsUrl(config);

  const handleSave = () => {
    onSave(form);
    toast.success("Configuração salva! Buscando dados da planilha...");
    setOpen(false);
  };

  const handleClear = () => {
    const empty: SheetsConfig = { googleAdsKeywordsUrl: "", googleAdsTimelineUrl: "" };
    setForm(empty);
    onSave(empty);
    toast.info("Configuração limpa. Usando dados estáticos.");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isConnected && (
        <button
          onClick={onRefetch}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-success hover:text-success/80 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Atualizando..." : "Atualizar"}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {isConnected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            ) : (
              <Settings className="w-3.5 h-3.5" />
            )}
            {isConnected ? "Sheets conectado" : "Conectar Google Sheets"}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Google Ads — Google Sheets</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="glass-card p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong className="text-foreground">Como configurar:</strong></p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Abra a planilha no Google Sheets</li>
                    <li>Vá em <strong>Arquivo → Compartilhar → Publicar na web</strong></li>
                    <li>Selecione a <strong>aba</strong> desejada e formato <strong>CSV</strong></li>
                    <li>Clique <strong>Publicar</strong> e copie o link</li>
                    <li>Cole o link no campo correspondente abaixo</li>
                  </ol>
                  <p className="mt-2 text-muted-foreground/80">
                    <strong>Nota:</strong> CRM e Meta Ads agora usam API direta. Sheets é usado apenas para Google Ads.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Google Ads — Palavras-chave</label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  value={form.googleAdsKeywordsUrl}
                  onChange={(e) => setForm({ ...form, googleAdsKeywordsUrl: e.target.value })}
                  className="text-xs bg-secondary border-border/50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1 block">Google Ads — Timeline</label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                  value={form.googleAdsTimelineUrl}
                  onChange={(e) => setForm({ ...form, googleAdsTimelineUrl: e.target.value })}
                  className="text-xs bg-secondary border-border/50"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleClear} className="text-xs text-destructive">
                Limpar tudo
              </Button>
              <Button size="sm" onClick={handleSave} className="text-xs">
                Salvar e Buscar Dados
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
