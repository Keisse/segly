import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, CircleDollarSign, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useMyRole } from "@/hooks/useMyRole";

type Person = { id: string; display_name: string | null; lider_id: string | null };
type Compensation = { user_id: string; base_salary: number | string };
type Commission = { user_id: string; amount: number | string; reference_date: string; status: string };

const money = (value: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
const dateBr = (date: Date) => new Intl.DateTimeFormat("pt-BR").format(date);

export function NextPaymentBanner() {
  const { user } = useAuth();
  const { data: role } = useMyRole();
  const [selectedId, setSelectedId] = useState("all");

  const nextPayment = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }, []);
  const followingMonth = useMemo(() => new Date(nextPayment.getFullYear(), nextPayment.getMonth() + 1, 1), [nextPayment]);
  const nextIso = `${nextPayment.getFullYear()}-${String(nextPayment.getMonth() + 1).padStart(2, "0")}-01`;
  const followingIso = `${followingMonth.getFullYear()}-${String(followingMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: people = [] } = useQuery({
    queryKey: ["next-payment-people", user?.id, role],
    queryFn: async () => {
      if (!user || (role !== "admin" && role !== "lider")) return [];
      let query = supabase.from("profiles").select("id,display_name,lider_id").eq("is_active", true).order("display_name");
      if (role === "lider") query = query.or(`id.eq.${user.id},lider_id.eq.${user.id}`);
      const { data, error } = await query;
      if (error) throw error;

      const ids = (data ?? []).map((person) => person.id);
      if (!ids.length) return [];
      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("user_id").in("user_id", ids);
      if (rolesError) throw rolesError;
      const validIds = new Set((roles ?? []).map((item) => item.user_id));
      return (data ?? []).filter((person) => validIds.has(person.id)) as Person[];
    },
    enabled: !!user && !!role,
  });

  const personIds = useMemo(() => people.map((person) => person.id), [people]);

  const { data: compensations = [] } = useQuery({
    queryKey: ["next-payment-compensation", personIds.join(",")],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("compensation_profiles" as never).select("user_id,base_salary").in("user_id", personIds);
      if (error) throw error;
      return (data ?? []) as unknown as Compensation[];
    },
    enabled: personIds.length > 0,
  });

  const { data: commissions = [] } = useQuery({
    queryKey: ["next-payment-commissions", personIds.join(","), nextIso],
    queryFn: async () => {
      if (!personIds.length) return [];
      const { data, error } = await supabase.from("commission_entries" as never)
        .select("user_id,amount,reference_date,status")
        .in("user_id", personIds)
        .gte("reference_date", nextIso)
        .lt("reference_date", followingIso)
        .in("status", ["earned", "paid"]);
      if (error) throw error;
      return (data ?? []) as unknown as Commission[];
    },
    enabled: personIds.length > 0,
  });

  const forecasts = useMemo(() => people.map((person) => {
    const salary = Number(compensations.find((item) => item.user_id === person.id)?.base_salary || 0);
    const commission = commissions.filter((item) => item.user_id === person.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return { ...person, salary, commission, total: salary + commission };
  }).filter((person) => selectedId === "all" || person.id === selectedId), [people, compensations, commissions, selectedId]);

  const teamTotal = forecasts.reduce((sum, person) => sum + person.total, 0);

  return (
    <div className="mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-4 lg:px-6">
      <Card className="border-primary/30 bg-primary/[0.04] shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-primary">
                <CalendarDays className="h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold uppercase tracking-wide">Próximo pagamento · {dateBr(nextPayment)}</p>
              </div>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Previsão de ganho</h2>
              <p className="mt-1 text-sm text-muted-foreground">Salário atual + comissão prevista para o próximo pagamento.</p>
            </div>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full bg-background sm:w-[260px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda a equipe</SelectItem>
                {people.map((person) => <SelectItem key={person.id} value={person.id}>{person.display_name || "Usuário"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedId === "all" && (
            <div className="mt-4 rounded-lg border bg-background/70 px-4 py-3">
              <p className="text-xs text-muted-foreground">Total previsto da equipe</p>
              <p className="text-2xl font-bold text-primary">{money(teamTotal)}</p>
            </div>
          )}

          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {forecasts.map((person) => (
              <div key={person.id} className="rounded-xl border bg-background p-4">
                <p className="font-semibold">{person.display_name || "Usuário"}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Salário</p><p className="truncate font-semibold">{money(person.salary)}</p></div>
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Comissão</p><p className="truncate font-semibold">{money(person.commission)}</p></div>
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Total</p><p className="truncate font-bold text-primary">{money(person.total)}</p></div>
                </div>
              </div>
            ))}
          </div>

          {forecasts.length === 0 && <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Nenhum colaborador disponível para esta previsão.</div>}

          <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
            <WalletCards className="mt-0.5 h-4 w-4 shrink-0" />
            <p>A comissão prevista considera os lançamentos já liberados para o próximo ciclo. Quando não houver comissão liberada, o total previsto corresponde ao salário atual.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
