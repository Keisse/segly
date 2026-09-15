import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/phone";

const formatCpfCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

type FormState = {
  empresa: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  proprietario: string;
  email: string;
  planoSaudeOperadora: string;
  acomodacao: string;
  coparticipacao: string;
  planoOdontologico: string;
  tipoPlano: string;
  quantidadePessoas: string;
  datasNascimento: string;
  comentarios: string;
};

const initialForm: FormState = {
  empresa: "",
  cnpj: "",
  responsavel: "",
  telefone: "",
  proprietario: "",
  email: "",
  planoSaudeOperadora: "",
  acomodacao: "",
  coparticipacao: "",
  planoOdontologico: "",
  tipoPlano: "",
  quantidadePessoas: "",
  datasNascimento: "",
  comentarios: "",
};

const NovoLeadPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const required: Array<[keyof FormState, string]> = [
      ["cnpj", "CNPJ ou CPF"],
      ["responsavel", "Nome do responsável"],
      ["telefone", "Telefone do responsável"],
      ["proprietario", "O responsável pela empresa é o proprietário?"],
      ["email", "E-mail"],
      ["planoSaudeOperadora", "Tem plano de Saúde? Qual operadora?"],
      ["acomodacao", "Acomodação"],
      ["coparticipacao", "Tem coparticipação?"],
      ["planoOdontologico", "Tem plano odontológico?"],
      ["tipoPlano", "Plano familiar ou empresarial?"],
      ["datasNascimento", "Data de nascimento de todos"],
    ];

    for (const [key, label] of required) {
      if (!String(form[key] ?? "").trim()) {
        toast.error(`Preencha: ${label}`);
        return false;
      }
    }

    const phoneDigits = form.telefone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      toast.error("Informe um telefone válido com DDD.");
      return false;
    }

    const documentDigits = form.cnpj.replace(/\D/g, "");
    if (documentDigits.length !== 11 && documentDigits.length !== 14) {
      toast.error("Informe um CPF com 11 dígitos ou CNPJ com 14 dígitos.");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Informe um e-mail válido.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("Usuário não autenticado.");

      const { data: profile, error: profileError } = await supabase.from("profiles").select("organization_id, display_name").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      const p = profile as { organization_id: string | null; display_name: string | null } | null;
      if (!p?.organization_id) throw new Error("Organização não configurada.");

      const customFields = {
        cnpj: form.cnpj,
        responsavel_proprietario: form.proprietario,
        plano_saude_operadora: form.planoSaudeOperadora,
        acomodacao: form.acomodacao,
        coparticipacao: form.coparticipacao,
        plano_odontologico: form.planoOdontologico,
        tipo_plano: form.tipoPlano,
        quantidade_pessoas: form.quantidadePessoas || null,
        datas_nascimento: form.datasNascimento,
        comentarios: form.comentarios || null,
      };

      const { data: inserted, error } = await supabase.from("leads").insert({
        nome: form.responsavel.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        empresa: form.empresa.trim(),
        porte_empresa: "",
        departamento: "",
        cargo: "",
        custom_fields: customFields,
        organization_id: p.organization_id,
        owner_id: user.id,
        fonte: "manual",
      } as never).select("id, historico").single();
      if (error) throw error;

      const row = inserted as { id: string; historico?: unknown[] };
      const actor = p.display_name || user.email || "usuário";
      const history = Array.isArray(row.historico) ? row.historico : [];
      const entry = {
        tipo: "manual",
        descricao: `Lead cadastrado manualmente por ${actor}`,
        data: new Date().toISOString(),
        autor: actor,
      };
      const { error: historyError } = await supabase.from("leads").update({ historico: [...history, entry] } as never).eq("id", row.id);
      if (historyError) throw historyError;

      toast.success("Lead cadastrado com sucesso!");
      navigate(`/admin/lead/${row.id}`);
    } catch (error) {
      console.error("Erro ao cadastrar lead:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar lead.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div><h1 className="text-2xl font-display font-bold">Cadastrar Lead</h1><p className="text-sm text-muted-foreground">Dados para elaboração do estudo.</p></div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader><CardTitle>Dados para elaboração do estudo</CardTitle><CardDescription>Os campos marcados com * são obrigatórios.</CardDescription></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="empresa">Nome da Empresa ou Pessoa Física</Label><Input id="empresa" value={form.empresa} onChange={(e) => set("empresa", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="cnpj">CNPJ ou CPF *</Label><Input id="cnpj" value={form.cnpj} onChange={(e) => set("cnpj", formatCpfCnpj(e.target.value))} placeholder="CPF ou CNPJ" inputMode="numeric" /></div>
              <div className="space-y-2"><Label htmlFor="responsavel">Nome do responsável *</Label><Input id="responsavel" value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="telefone-responsavel">Telefone do responsável *</Label><Input id="telefone-responsavel" type="tel" value={form.telefone} onChange={(e) => set("telefone", formatPhone(e.target.value))} placeholder="(11) 99999-9999" /></div>
            </div>

            <div className="space-y-3">
              <Label>O responsável pela empresa é o proprietário? *</Label>
              <RadioGroup value={form.proprietario} onValueChange={(v) => set("proprietario", v)} className="flex gap-6">
                <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="proprietario-sim" /><Label htmlFor="proprietario-sim">Sim</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="proprietario-nao" /><Label htmlFor="proprietario-nao">Não</Label></div>
              </RadioGroup>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="email">E-mail *</Label><Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="plano-saude">Tem plano de Saúde? Qual operadora? *</Label><Input id="plano-saude" value={form.planoSaudeOperadora} onChange={(e) => set("planoSaudeOperadora", e.target.value)} /></div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <Label>Acomodação *</Label>
                <RadioGroup value={form.acomodacao} onValueChange={(v) => set("acomodacao", v)} className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2"><RadioGroupItem value="Enfermaria" id="acomodacao-enfermaria" /><Label htmlFor="acomodacao-enfermaria">Enfermaria</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="Apartamento" id="acomodacao-apartamento" /><Label htmlFor="acomodacao-apartamento">Apartamento</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <Label>Tem coparticipação? *</Label>
                <RadioGroup value={form.coparticipacao} onValueChange={(v) => set("coparticipacao", v)} className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="coparticipacao-sim" /><Label htmlFor="coparticipacao-sim">Sim</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="coparticipacao-nao" /><Label htmlFor="coparticipacao-nao">Não</Label></div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="odontologico">Tem plano odontológico? *</Label><Input id="odontologico" value={form.planoOdontologico} onChange={(e) => set("planoOdontologico", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="tipo-plano">Plano familiar ou empresarial? *</Label><Input id="tipo-plano" value={form.tipoPlano} onChange={(e) => set("tipoPlano", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="quantidade">Quantas Pessoas?</Label><Input id="quantidade" type="number" min={1} value={form.quantidadePessoas} onChange={(e) => set("quantidadePessoas", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="nascimentos">Data de nascimento de todos *</Label><Input id="nascimentos" value={form.datasNascimento} onChange={(e) => set("datasNascimento", e.target.value)} placeholder="Ex.: 10/02/1985, 22/07/1990" /></div>
            </div>

            <div className="space-y-2"><Label htmlFor="comentarios">Comentários</Label><Textarea id="comentarios" rows={4} value={form.comentarios} onChange={(e) => set("comentarios", e.target.value)} /></div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/leads")}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Cadastrar Lead</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default NovoLeadPage;
