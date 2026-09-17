import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  Building2,
  Check,
  HeartPulse,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  AGE_BANDS,
  calculateQuotes,
  demoCatalog,
  demoProfile,
  type QuoteProfile,
} from "@/features/future/quoteEngine";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const SeglyFuturePage = () => {
  const [profile, setProfile] = useState<QuoteProfile>(demoProfile);
  const [selected, setSelected] = useState<string | null>(null);
  const quotes = useMemo(() => calculateQuotes(profile), [profile]);

  const ageSummary = useMemo(() => {
    const summary = Object.fromEntries(AGE_BANDS.map((band) => [band, 0])) as Record<string, number>;
    profile.ages.forEach((age) => {
      const quote = quotes[0];
      if (!quote) return;
      const band = Object.entries(quote.ageBreakdown).find(([, row]) => row.lives > 0 && age >= 0)?.[0];
      void band;
    });
    profile.ages.forEach((age) => {
      const match = age <= 18 ? "0-18" : age <= 23 ? "19-23" : age <= 28 ? "24-28" : age <= 33 ? "29-33" : age <= 38 ? "34-38" : age <= 43 ? "39-43" : age <= 48 ? "44-48" : age <= 53 ? "49-53" : age <= 58 ? "54-58" : "59+";
      summary[match] += 1;
    });
    return summary;
  }, [profile.ages, quotes]);

  const ageTotal = profile.ages.length;
  const dominantAgeBand = AGE_BANDS.reduce((best, band) => ageSummary[band] > ageSummary[best] ? band : best, AGE_BANDS[0]);
  const maxAgeBandCount = Math.max(1, ...AGE_BANDS.map((band) => ageSummary[band]));

  const topQuote = quotes[0];
  const cheapest = [...quotes].sort((a, b) => a.monthlyTotal - b.monthlyTotal)[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-sky-200">
              <Sparkles className="h-3.5 w-3.5" /> Segly Decisor
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Multicálculo como infraestrutura. Inteligência como diferencial.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              Laboratório isolado do Segly atual. Os valores abaixo são demonstrativos e o motor roda com tabelas locais, sem API, IA ou escrita no banco.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-slate-400">Fonte atual</div>
              <div className="mt-1 font-semibold">SeglyTable</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <div className="text-emerald-200">Status</div>
              <div className="mt-1 font-semibold text-emerald-100">Experimental</div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-7">
        <section className="grid gap-4 md:grid-cols-4">
          <Metric icon={Building2} label="Empresa" value={profile.companyName} />
          <Metric icon={Users} label="Vidas" value={String(profile.ages.length)} />
          <Metric icon={Layers3} label="Planos compatíveis" value={String(quotes.length)} />
          <Metric icon={Activity} label="Menor mensalidade" value={cheapest ? money.format(cheapest.monthlyTotal) : "—"} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-sky-600" />
              <h2 className="font-semibold">Perfil da cotação</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">Altere o perfil para ver o motor recalcular instantaneamente.</p>

            <div className="mt-5 space-y-4">
              <Field label="Empresa">
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400" value={profile.companyName} onChange={(e) => setProfile({ ...profile, companyName: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="UF">
                  <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })}>
                    <option>MG</option><option>SP</option><option>RJ</option><option>PR</option><option>SC</option>
                  </select>
                </Field>
                <Field label="Cidade">
                  <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                </Field>
              </div>
              <Field label="Idades das vidas">
                <textarea
                  className="min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                  value={profile.ages.join(", ")}
                  onChange={(e) => {
                    const ages = e.target.value.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 120);
                    setProfile({ ...profile, ages });
                  }}
                />
              </Field>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Distribuição por faixa etária</div>
                  <div className="mt-1 text-xs text-slate-400">Visualização rápida das vidas da cotação</div>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-slate-200">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</div>
                  <div className="text-lg font-bold text-slate-900">{ageTotal}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-sky-50 px-3 py-2.5 text-xs text-sky-900 ring-1 ring-sky-100">
                <span className="font-medium text-sky-700">Maior concentração:</span>{" "}
                <strong>{ageTotal > 0 ? dominantAgeBand : "—"}</strong>
              </div>

              <div className="mt-4 space-y-2.5">
                {AGE_BANDS.map((band) => {
                  const count = ageSummary[band];
                  const active = count > 0;
                  const width = `${Math.max(active ? 12 : 0, (count / maxAgeBandCount) * 100)}%`;
                  return (
                    <div key={band} className={`rounded-xl border px-3 py-2.5 transition ${active ? "border-sky-200 bg-white shadow-sm" : "border-slate-200/70 bg-slate-50/70"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-medium ${active ? "text-slate-700" : "text-slate-400"}`}>{band}</span>
                        <span className={`min-w-7 rounded-lg px-2 py-1 text-center text-xs font-bold ${active ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-400"}`}>{count}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full transition-all ${active ? "bg-sky-500" : "bg-slate-200"}`} style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2"><Search className="h-5 w-5 text-sky-600" /><h2 className="font-semibold">Resultado do motor</h2></div>
                  <p className="mt-1 text-sm text-slate-500">Preço calculado por faixa etária; IA não participa do cálculo.</p>
                </div>
                <div className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">{demoCatalog.length} produtos no catálogo demo</div>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {quotes.map((quote, index) => (
                  <button
                    key={quote.plan.id}
                    onClick={() => setSelected(quote.plan.id)}
                    className={`text-left rounded-2xl border p-4 transition ${selected === quote.plan.id ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200 hover:border-slate-300"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{quote.plan.provider}</div>
                        <div className="mt-1 text-lg font-bold">{quote.plan.name}</div>
                      </div>
                      {index === 0 && <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">MAIOR ADERÊNCIA</span>}
                    </div>
                    <div className="mt-5 text-2xl font-bold">{money.format(quote.monthlyTotal)}<span className="text-xs font-medium text-slate-400"> /mês</span></div>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                      <span className="text-slate-500">Aderência</span><strong className="text-emerald-700">{quote.fitScore}%</strong>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <Line>{quote.plan.accommodation}</Line>
                      <Line>{quote.plan.copay}</Line>
                      <Line>{quote.plan.coverage}</Line>
                      <Line>Rede {quote.plan.networkScore}/100</Line>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-violet-600" /><h2 className="font-semibold">Camada de inteligência</h2></div>
                <p className="mt-2 text-sm leading-6 text-slate-500">Ainda não conectada. Aqui entra a IA depois que o cálculo confiável já terminou.</p>
                <div className="mt-4 space-y-3">
                  <FutureAction title="Explicar o resultado" text="Transformar preço, rede e regras em linguagem simples para o corretor." />
                  <FutureAction title="Comparar cenários" text="Mostrar o que se ganha e perde ao trocar acomodação, rede ou coparticipação." />
                  <FutureAction title="Sugerir próxima ação" text="Usar histórico e preferências da empresa para orientar a conversa comercial." />
                </div>
                <button disabled className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-400">
                  <Sparkles className="h-4 w-4" /> Analisar com Segly IA — próximo passo
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold">Arquitetura plugável</h2></div>
                <p className="mt-2 text-sm text-slate-500">O restante do Segly não precisa saber de onde veio o preço.</p>
                <div className="mt-5 space-y-3">
                  <ProviderRow name="SeglyTableProvider" status="Ativo no laboratório" active />
                  <ProviderRow name="ApprovitaProvider" status="Futuro" />
                  <ProviderRow name="OperadoraAPIProvider" status="Futuro" />
                  <ProviderRow name="NovoProvider" status="Preparado" />
                </div>
                <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  Trocar a fonte de preços no futuro não exige reconstruir leads, vidas, proposta ou pipeline.
                </div>
              </div>
            </div>
          </div>
        </section>

        {topQuote && (
          <section className="rounded-3xl bg-slate-900 p-6 text-white">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-sky-300">Próxima evolução</div>
                <h2 className="mt-2 text-2xl font-bold">Importar a primeira tabela comercial real.</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Quando tivermos uma tabela real, substituímos os dados demo mantendo o mesmo motor. Depois conectamos benefícios/rede e só então adicionamos IA como copiloto.</p>
              </div>
              <div className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900">Tabela real <ArrowRight className="h-4 w-4" /> Catálogo Segly</div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <Icon className="h-5 w-5 text-sky-600" />
    <div className="mt-3 text-xs font-medium text-slate-500">{label}</div>
    <div className="mt-1 truncate text-xl font-bold">{value}</div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label>
);

const Line = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /><span>{children}</span></div>
);

const FutureAction = ({ title, text }: { title: string; text: string }) => (
  <div className="rounded-2xl border border-slate-200 p-3.5"><div className="text-sm font-semibold">{title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{text}</div></div>
);

const ProviderRow = ({ name, status, active = false }: { name: string; status: string; active?: boolean }) => (
  <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-3.5 py-3">
    <div className="text-sm font-medium">{name}</div>
    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{status}</span>
  </div>
);

export default SeglyFuturePage;
