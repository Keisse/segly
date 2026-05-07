import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useCampaignBySlug, useCampaignQuestions } from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignQuestion, OptinFields } from "@/types/campaign";
import { toast } from "sonner";

type AnswerValue = string | string[] | number;

const optinLabels: Record<keyof OptinFields, string> = {
  nome: "Nome completo", email: "Email corporativo", telefone: "WhatsApp",
  empresa: "Empresa", porte_empresa: "Porte da empresa",
  departamento: "Departamento", cargo: "Cargo",
};

export default function CampaignPublicPage() {
  const { slug = "" } = useParams();
  const { data: campaign, isLoading } = useCampaignBySlug(slug);
  const { data: questions = [] } = useCampaignQuestions(campaign?.id || "");

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [optin, setOptin] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"questions" | "optin" | "done">("questions");
  const [submitting, setSubmitting] = useState(false);

  const activeOptinKeys = useMemo(
    () => (Object.keys(optinLabels) as Array<keyof OptinFields>),
    []
  );
  const [voucherOpen, setVoucherOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <h1 className="text-2xl font-display font-bold mb-2">Campanha indisponível</h1>
          <p className="text-muted-foreground mb-4">
            Esta campanha não está disponível no momento.
          </p>
          <Button asChild><Link to="/">Voltar</Link></Button>
        </div>
      </div>
    );
  }

  const setAnswer = (qId: string, val: AnswerValue) =>
    setAnswers((a) => ({ ...a, [qId]: val }));

  const validateQuestions = (): boolean => {
    for (const q of questions) {
      if (!q.is_required) continue;
      const v = answers[q.id];
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) {
        toast.error(`Responda: ${q.question_text}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    // validate optin
    for (const k of activeOptinKeys) {
      if (!optin[k] || optin[k].trim() === "") {
        toast.error(`Preencha: ${optinLabels[k]}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const leadInsert: any = {
        nome: optin.nome || "Anônimo",
        email: optin.email || "",
        telefone: optin.telefone || "",
        empresa: optin.empresa || "",
        porte_empresa: optin.porte_empresa || "",
        departamento: optin.departamento || "",
        cargo: optin.cargo || "",
        fonte: "inbound",
        campaign_id: campaign.id,
        campaign_slug: campaign.slug,
        campaign_name: campaign.name,
      };

      // compute score for diagnostico_score
      if (campaign.type === "diagnostico_score") {
        const byCategory: Record<string, { sum: number; count: number }> = {};
        let total = 0; let count = 0;
        for (const q of questions) {
          const v = answers[q.id];
          let val = 0;
          if (typeof v === "number") val = v;
          else if (typeof v === "string") {
            const opt = q.options.find((o) => o.text === v);
            val = opt?.value ?? 0;
          } else if (Array.isArray(v)) {
            val = v.reduce((s, t) => s + (q.options.find((o) => o.text === t)?.value ?? 0), 0);
          }
          if (q.category) {
            byCategory[q.category] = byCategory[q.category] || { sum: 0, count: 0 };
            byCategory[q.category].sum += val;
            byCategory[q.category].count += 1;
          }
          total += val; count += 1;
        }
        const avg = count > 0 ? total / count : 0;
        leadInsert.resultado_diagnostico = {
          totalScore: total,
          maxScore: count * 5,
          percentage: count > 0 ? (avg / 5) * 100 : 0,
          pillarScores: Object.entries(byCategory).map(([name, v], i) => ({
            pillarId: i + 1,
            pillarName: name,
            icon: "📊",
            score: v.sum,
            maxScore: v.count * 5,
            percentage: v.count > 0 ? (v.sum / v.count / 5) * 100 : 0,
          })),
          answers: {},
        };
      }

      const leadId = crypto.randomUUID();
      leadInsert.id = leadId;
      const { error } = await supabase.from("leads").insert(leadInsert);
      if (error) throw error;
      const lead = { id: leadId };

      // insert responses
      const responses = questions
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => {
          const v = answers[q.id];
          const text = Array.isArray(v) ? v.join(", ") : String(v);
          let numVal: number | null = null;
          if (typeof v === "number") numVal = v;
          else if (typeof v === "string") {
            const opt = q.options.find((o) => o.text === v);
            if (opt?.value !== undefined) numVal = opt.value;
          }
          return {
            lead_id: lead.id,
            campaign_id: campaign.id,
            question_id: q.id,
            answer_text: text,
            answer_value: numVal,
          };
        });
      if (responses.length > 0) {
        await supabase.from("campaign_responses").insert(responses);
      }
      setStep("done");
      if (campaign.voucher_enabled && campaign.voucher_code) {
        setVoucherOpen(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "done") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-lg text-center">
            <h1 className="text-3xl font-display font-bold mb-3">Obrigado!</h1>
            <p className="text-muted-foreground whitespace-pre-line">
              {campaign.thank_you_message || "Suas respostas foram enviadas com sucesso."}
            </p>
            {campaign.voucher_enabled && campaign.voucher_code && (
              <Button className="mt-6" onClick={() => setVoucherOpen(true)}>
                Ver meu cupom
              </Button>
            )}
          </motion.div>
        </div>
        <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
          <DialogContent className="text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl">Seu cupom de desconto</DialogTitle>
              {campaign.voucher_description && (
                <DialogDescription>{campaign.voucher_description}</DialogDescription>
              )}
            </DialogHeader>
            <div className="my-4 rounded-lg border-2 border-dashed border-primary bg-primary/10 p-6">
              <p className="text-3xl font-mono font-bold text-primary tracking-widest">
                {campaign.voucher_code}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(campaign.voucher_code || "");
                toast.success("Cupom copiado!");
              }}
            >
              Copiar código
            </Button>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          {campaign.image_url && <img src={campaign.image_url} alt="" className="h-20 mx-auto" />}
          <h1 className="text-3xl md:text-4xl font-display font-bold">
            {campaign.public_title || campaign.name}
          </h1>
          {campaign.public_subtitle && (
            <p className="text-muted-foreground max-w-2xl mx-auto">{campaign.public_subtitle}</p>
          )}
        </motion.header>

        {step === "questions" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {questions.map((q, i) => (
              <QuestionRenderer key={q.id} question={q} index={i} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} />
            ))}
            {questions.length === 0 && (
              <div className="glass-card p-6 text-center text-muted-foreground">
                Esta campanha ainda não tem perguntas.
              </div>
            )}
            <Button
              size="lg" className="w-full"
              onClick={() => { if (validateQuestions()) setStep("optin"); }}
            >
              Continuar
            </Button>
          </motion.div>
        )}

        {step === "optin" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Seus dados</h2>
            {activeOptinKeys.map((k) => (
              <div key={k}>
                <Label>{optinLabels[k]} *</Label>
                <Input
                  type={k === "email" ? "email" : "text"}
                  value={optin[k] || ""}
                  onChange={(e) => setOptin((o) => ({ ...o, [k]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("questions")}>Voltar</Button>
              <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function QuestionRenderer({
  question, index, value, onChange,
}: {
  question: CampaignQuestion;
  index: number;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const t = question.question_type;
  return (
    <div className="glass-card p-5 space-y-3">
      <div>
        {question.category && <p className="text-xs text-primary mb-1">{question.category}</p>}
        <p className="font-medium">
          {index + 1}. {question.question_text}
          {question.is_required && <span className="text-destructive"> *</span>}
        </p>
      </div>

      {t === "multiple_choice" && (
        <RadioGroup value={(value as string) || ""} onValueChange={onChange}>
          {question.options.map((o, i) => (
            <label key={i} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/30">
              <RadioGroupItem value={o.text} />
              <span>{o.text}</span>
            </label>
          ))}
        </RadioGroup>
      )}

      {t === "yes_no" && (
        <RadioGroup value={(value as string) || ""} onValueChange={onChange} className="flex gap-4">
          {["Sim", "Não"].map((v) => (
            <label key={v} className="flex items-center gap-2 cursor-pointer">
              <RadioGroupItem value={v} /><span>{v}</span>
            </label>
          ))}
        </RadioGroup>
      )}

      {t === "checkbox" && (
        <div className="space-y-2">
          {question.options.map((o, i) => {
            const arr = (value as string[]) || [];
            const checked = arr.includes(o.text);
            return (
              <label key={i} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-secondary/30">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => onChange(c ? [...arr, o.text] : arr.filter((x) => x !== o.text))}
                />
                <span>{o.text}</span>
              </label>
            );
          })}
        </div>
      )}

      {t === "dropdown" && (
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
          <SelectContent>
            {question.options.map((o, i) => (
              <SelectItem key={i} value={o.text}>{o.text}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {t === "scale" && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: (question.scale_max ?? 5) - (question.scale_min ?? 1) + 1 }, (_, i) => {
            const n = (question.scale_min ?? 1) + i;
            return (
              <button key={n} onClick={() => onChange(n)}
                className={`w-10 h-10 rounded border ${value === n ? "bg-primary text-primary-foreground" : "border-border hover:bg-secondary/50"}`}>
                {n}
              </button>
            );
          })}
        </div>
      )}

      {t === "nps" && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 11 }, (_, n) => (
            <button key={n} onClick={() => onChange(n)}
              className={`w-9 h-9 rounded text-sm border ${value === n ? "bg-primary text-primary-foreground" : "border-border hover:bg-secondary/50"}`}>
              {n}
            </button>
          ))}
        </div>
      )}

      {t === "short_text" && (
        <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
      )}
      {t === "long_text" && (
        <Textarea value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}
