type AgeDistributionRow = {
  label: string;
  count: number;
};

export function AgeDistributionTable({
  total,
  rows,
  description = "Distribuição das vidas conforme as datas de nascimento.",
}: {
  total: number;
  rows: AgeDistributionRow[];
  description?: string;
}) {
  if (total <= 0 || rows.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex flex-col gap-1 border-b bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Distribuição por faixa etária</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          {total} {total === 1 ? "vida calculada" : "vidas calculadas"}
        </div>
      </div>

      <div className="divide-y">
        {rows.map((row) => {
          const hasLives = row.count > 0;
          return (
            <div
              key={row.label}
              className={`grid grid-cols-[auto_1fr] items-center gap-3 px-4 py-3 transition-colors ${hasLives ? "bg-emerald-500/10" : ""}`}
            >
              <span
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-2 text-sm font-bold tabular-nums ${hasLives ? "border-emerald-500 bg-emerald-500 text-white" : "bg-muted/40 text-muted-foreground"}`}
              >
                {row.count}
              </span>
              <span
                className={`text-sm font-medium sm:text-base ${hasLives ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}
              >
                {row.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
