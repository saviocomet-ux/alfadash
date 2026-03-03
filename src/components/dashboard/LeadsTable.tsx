import { useState } from "react";
import { Lead } from "@/data/parseLeads";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

interface LeadsTableProps {
  leads: Lead[];
}

const stageBadge: Record<string, string> = {
  "Qualificação": "bg-primary/15 text-primary",
  "AGENDAMENTO": "bg-success/15 text-success",
  "NEGOCIAÇÃO": "bg-warning/15 text-warning",
  "Incoming leads": "bg-accent/15 text-accent",
};

export function LeadsTable({ leads }: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"createdAt" | "name" | "stage">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const perPage = 15;

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search) ||
      l.stage.toLowerCase().includes(search.toLowerCase()) ||
      l.source.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortField] || "";
    const bVal = b[sortField] || "";
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch {
      return d;
    }
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Todos os Leads ({filtered.length})</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 pr-4 py-2 rounded-lg bg-secondary text-sm text-foreground placeholder:text-muted-foreground border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary w-64"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("name")}>
                Nome <SortIcon field="name" />
              </th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Telefone</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("stage")}>
                Etapa <SortIcon field="stage" />
              </th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fonte</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Termo</th>
              <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer" onClick={() => toggleSort("createdAt")}>
                Data <SortIcon field="createdAt" />
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((lead) => (
              <tr key={lead.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                <td className="py-3 px-3 font-medium text-foreground">{lead.name}</td>
                <td className="py-3 px-3 text-muted-foreground font-mono text-xs">{lead.phone.replace(/'/g, "")}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${stageBadge[lead.stage] || "bg-muted text-muted-foreground"}`}>
                    {lead.stage}
                  </span>
                </td>
                <td className="py-3 px-3 text-muted-foreground">{lead.source}</td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{lead.term || "—"}</td>
                <td className="py-3 px-3 text-muted-foreground text-xs">{formatDate(lead.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>Página {page + 1} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-40 transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-40 transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
