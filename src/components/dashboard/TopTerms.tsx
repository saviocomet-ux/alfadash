interface TopTermsProps {
  data: { term: string; count: number }[];
}

export function TopTerms({ data }: TopTermsProps) {
  const max = Math.max(...data.map((d) => d.count));

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Top Palavras-chave</h3>
      <div className="space-y-3">
        {data.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground truncate mr-2">{item.term}</span>
              <span className="text-muted-foreground font-mono">{item.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
