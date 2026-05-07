import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Send, Sparkles } from "lucide-react";
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
import LeadCaptureForm, { type LeadData } from "@/components/LeadCaptureForm";
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
  const [chatIdx, setChatIdx] = useState(0);
  const [diagResult, setDiagResult] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isChat = campaign?.type === "diagnostico_score";

  const activeOptinKeys = useMemo(
    () => (Object.keys(optinLabels) as Array<keyof OptinFields>),
    []
  );
  const [voucherOpen, setVoucherOpen] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatIdx, step]);

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

  const handleSubmit = async (lead: LeadData) => {
    setSubmitting(true);
    try {
      const leadInsert: any = {
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone,
        empresa: lead.empresa,
        porte_empresa: lead.porte,
        departamento: lead.departamento,
        cargo: lead.cargo,
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
        setDiagResult(leadInsert.resultado_diagnostico);
      }

      const leadId = crypto.randomUUID();
      leadInsert.id = leadId;
      const { error } = await supabase.from("leads").insert(leadInsert);
      if (error) throw error;

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
            lead_id: leadId,
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
    const showScore = isChat && diagResult;
    const pct = Math.round(diagResult?.percentage || 0);
    const level = pct >= 80 ? "Estratégico" : pct >= 50 ? "Consolidação" : "Fundamentação";
    const levelColor = pct >= 80 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400";
    return (
      <>
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-lg text-center">
            {showScore && (
              <div className="mb-6">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Seu score de maturidade</p>
                <div className={`text-6xl font-display font-bold ${levelColor}`}>{pct}%</div>
                <p className={`mt-2 text-sm font-medium ${levelColor}`}>Nível: {level}</p>
                {diagResult.pillarScores?.length > 0 && (
                  <div className="mt-6 space-y-2 text-left">
                    {diagResult.pillarScores.map((p: any) => (
                      <div key={p.pillarId}>
                        <div className="flex justify-between text-xs">
                          <span>{p.pillarName}</span>
                          <span className="text-muted-foreground">{Math.round(p.percentage)}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${p.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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

        {step === "questions" && !isChat && (
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

        {step === "questions" && isChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {questions.length === 0 && (
              <div className="glass-card p-6 text-center text-muted-foreground">
                Esta campanha ainda não tem perguntas.
              </div>
            )}
            <div className="glass-card p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {questions.slice(0, chatIdx + 1).map((q, i) => {
                const answered = answers[q.id] !== undefined;
                const isCurrent = i === chatIdx;
                return (
                  <div key={q.id} className="space-y-3">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 bg-secondary/40 rounded-lg p-3">
                        {q.category && <p className="text-xs text-primary mb-1">{q.category}</p>}
                        <p className="text-sm font-medium">
                          {i + 1}. {q.question_text}
                        </p>
                        {(isCurrent || !answered) && (
                          <div className="mt-3">
                            <QuestionRenderer
                              question={q}
                              index={i}
                              value={answers[q.id]}
                              onChange={(v) => setAnswer(q.id, v)}
                              compact
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {answered && !isCurrent && (
                      <div className="flex justify-end">
                        <div className="bg-primary/15 rounded-lg p-2 text-sm max-w-md">
                          {Array.isArray(answers[q.id]) ? (answers[q.id] as string[]).join(", ") : String(answers[q.id])}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="flex justify-between gap-2">
              <Button
                variant="outline"
                disabled={chatIdx === 0}
                onClick={() => setChatIdx((i) => Math.max(0, i - 1))}
              >
                Voltar
              </Button>
              {chatIdx < questions.length - 1 ? (
                <Button
                  onClick={() => {
                    const q = questions[chatIdx];
                    if (q.is_required && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0))) {
                      toast.error("Responda esta pergunta para continuar.");
                      return;
                    }
                    setChatIdx((i) => i + 1);
                  }}
                >
                  Próxima
                </Button>
              ) : (
                <Button
                  onClick={() => { if (validateQuestions()) setStep("optin"); }}
                >
                  Finalizar diagnóstico
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {step === "optin" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-semibold">Seus dados</h2>
            {campaign.voucher_enabled && campaign.voucher_code && (
              <p className="text-sm text-primary font-medium">
                Preencha todos os campos para receber o seu Voucher.
              </p>
            )}
            <div className="flex justify-center">
              <LeadCaptureForm onSubmit={handleSubmit} />
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setStep("questions")} disabled={submitting}>
                Voltar
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function QuestionRenderer({
  question, index, value, onChange, compact,
}: {
  question: CampaignQuestion;
  index: number;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  compact?: boolean;
}) {
  const t = question.question_type;
  return (
    <div className={compact ? "space-y-3" : "glass-card p-5 space-y-3"}>
      {!compact && (
        <div>
          {question.category && <p className="text-xs text-primary mb-1">{question.category}</p>}
          <p className="font-medium">
            {index + 1}. {question.question_text}
            {question.is_required && <span className="text-destructive"> *</span>}
          </p>
        </div>
      )}
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
