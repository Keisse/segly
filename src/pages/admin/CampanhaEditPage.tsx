import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Copy, Upload, Globe, EyeOff, ExternalLink, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCampaign, useCampaignQuestions, useCampaigns, useCreateCampaign,
  useUpdateCampaign, useSaveCampaignQuestions,
} from "@/hooks/useCampaigns";
import { supabase } from "@/integrations/supabase/client";
import {
  campaignTypeLabels, defaultOptinFields, questionTypeLabels, slugify,
  type Campaign, type CampaignQuestion, type CampaignQuestionType, type CampaignType,
  type OptinFields,
} from "@/types/campaign";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type LocalQuestion = Partial<CampaignQuestion> & { localId: string };

const optinLabels: Record<keyof OptinFields, string> = {
  nome: "Nome", email: "Email", telefone: "WhatsApp", empresa: "Empresa",
  porte_empresa: "Porte da Empresa", departamento: "Departamento", cargo: "Cargo",
};

export default function CampanhaEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const { data: existing } = useCampaign(id || "");
  const { data: existingQuestions } = useCampaignQuestions(id || "");
  const { data: allCampaigns = [] } = useCampaigns();

  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const saveQuestions = useSaveCampaignQuestions();

  const [form, setForm] = useState<Partial<Campaign>>({
    name: "", slug: "", description: "", type: "diagnostico_score",
    status: "inativa", tag: "", public_title: "", public_subtitle: "",
    image_url: "", optin_fields: defaultOptinFields, thank_you_message: "",
  });
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [importFromId, setImportFromId] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (existing) {
      setForm(existing);
      setSlugManuallyEdited(true);
    }
  }, [existing]);

  useEffect(() => {
    if (existingQuestions) {
      setQuestions(existingQuestions.map((q) => ({ ...q, localId: q.id })));
    }
  }, [existingQuestions]);

  const updateForm = (patch: Partial<Campaign>) =>
    setForm((f) => ({ ...f, ...patch }));

  const handleNameChange = (name: string) => {
    updateForm({ name });
    if (!slugManuallyEdited && isNew) updateForm({ name, slug: slugify(name) });
  };

  const handleImport = async () => {
    if (!importFromId) return;
    const { data } = await supabase
      .from("campaign_questions")
      .select("*")
      .eq("campaign_id", importFromId)
      .order("sort_order");
    if (data) {
      setQuestions(
        data.map((q: any, i) => ({
          localId: `imp-${Date.now()}-${i}`,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          scale_min: q.scale_min,
          scale_max: q.scale_max,
          is_required: q.is_required,
          category: q.category,
        }))
      );
      toast.success(`${data.length} perguntas importadas`);
    }
  };

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      {
        localId: `new-${Date.now()}`,
        question_text: "",
        question_type: "multiple_choice",
        options: [],
        is_required: true,
      },
    ]);
  };

  const updateQuestion = (localId: string, patch: Partial<LocalQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.localId === localId ? { ...q, ...patch } : q)));

  const removeQuestion = (localId: string) =>
    setQuestions((qs) => qs.filter((q) => q.localId !== localId));

  const duplicateQuestion = (localId: string) =>
    setQuestions((qs) => {
      const idx = qs.findIndex((q) => q.localId === localId);
      if (idx < 0) return qs;
      const copy = { ...qs[idx], localId: `dup-${Date.now()}` };
      return [...qs.slice(0, idx + 1), copy, ...qs.slice(idx + 1)];
    });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setQuestions((qs) => {
        const oldIdx = qs.findIndex((q) => q.localId === active.id);
        const newIdx = qs.findIndex((q) => q.localId === over.id);
        return arrayMove(qs, oldIdx, newIdx);
      });
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }
    let campaignId = id;
    if (isNew) {
      const created = await create.mutateAsync(form);
      campaignId = created.id;
    } else {
      await update.mutateAsync({ id: id!, ...form });
    }
    if (campaignId) {
      await saveQuestions.mutateAsync({ campaignId, questions });
      navigate(`/admin/campanhas/${campaignId}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("campaign-images").upload(path, file);
    if (error) {
      toast.error("Erro no upload");
      return;
    }
    const { data } = supabase.storage.from("campaign-images").getPublicUrl(path);
    updateForm({ image_url: data.publicUrl });
    toast.success("Imagem enviada");
  };

  return (
    <div className="py-6 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/campanhas")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-bold">
                {isNew ? "Nova Campanha" : form.name}
              </h1>
              {!isNew && form.slug && (
                <p className="text-xs text-muted-foreground font-mono">/c/{form.slug}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="w-4 h-4" /> Visualizar
            </Button>
            {!isNew && form.status === "ativa" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(`/c/${form.slug}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4" /> Ver página
              </Button>
            )}
            {!isNew && (
              form.status === "ativa" ? (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={update.isPending}
                  onClick={async () => {
                    await update.mutateAsync({ id: id!, status: "inativa" });
                    updateForm({ status: "inativa" });
                    toast.success("Campanha despublicada");
                  }}
                >
                  <EyeOff className="w-4 h-4" /> Despublicar
                </Button>
              ) : (
                <Button
                  variant="default"
                  className="gap-2"
                  disabled={update.isPending}
                  onClick={async () => {
                    if (!form.slug) {
                      toast.error("Defina um slug antes de publicar");
                      return;
                    }
                    await update.mutateAsync({ id: id!, status: "ativa" });
                    updateForm({ status: "ativa" });
                    toast.success("Campanha publicada em /c/" + form.slug);
                  }}
                >
                  <Globe className="w-4 h-4" /> Publicar
                </Button>
              )
            )}
            <Button onClick={handleSave} disabled={create.isPending || update.isPending} variant="secondary" className="gap-2">
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="geral">
          <TabsList>
            <TabsTrigger value="geral">Configurações Gerais</TabsTrigger>
            <TabsTrigger value="perguntas">Perguntas</TabsTrigger>
            <TabsTrigger value="aparencia">Aparência e Optin</TabsTrigger>
          </TabsList>

          {/* Aba 1 */}
          <TabsContent value="geral" className="space-y-4">
            <div className="glass-card p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nome da campanha *</Label>
                  <Input value={form.name || ""} onChange={(e) => handleNameChange(e.target.value)} />
                </div>
                <div>
                  <Label>Slug da URL *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.slug || ""}
                      onChange={(e) => { setSlugManuallyEdited(true); updateForm({ slug: slugify(e.target.value) }); }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Copiar URL"
                      onClick={() => {
                        const url = `${window.location.origin}/c/${form.slug || ""}`;
                        navigator.clipboard.writeText(url);
                        toast.success("URL copiada");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">URL: {window.location.origin}/c/{form.slug || "..."}</p>
                </div>
              </div>
              <div>
                <Label>Descrição interna</Label>
                <Textarea value={form.description || ""} onChange={(e) => updateForm({ description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => updateForm({ type: v as CampaignType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(campaignTypeLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tag automática</Label>
                  <Input value={form.tag || ""} onChange={(e) => updateForm({ tag: e.target.value })} placeholder="ex: origem:agro" />
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={form.status === "ativa"}
                        onCheckedChange={(v) => updateForm({ status: v ? "ativa" : "inativa" })}
                      />
                      <span className="text-sm">{form.status === "ativa" ? "Ativa" : "Inativa"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba 2 */}
          <TabsContent value="perguntas" className="space-y-4">
            <div className="glass-card p-4 flex flex-wrap items-center gap-3">
              <Button onClick={addQuestion} size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar pergunta
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Select value={importFromId} onValueChange={setImportFromId}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Importar de outra campanha..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCampaigns.filter((c) => c.id !== id).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleImport} disabled={!importFromId}>
                  Importar
                </Button>
              </div>
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={questions.map((q) => q.localId)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <QuestionCard
                      key={q.localId} question={q} index={i}
                      onChange={(p) => updateQuestion(q.localId, p)}
                      onRemove={() => removeQuestion(q.localId)}
                      onDuplicate={() => duplicateQuestion(q.localId)}
                    />
                  ))}
                  {questions.length === 0 && (
                    <div className="glass-card p-8 text-center text-muted-foreground">
                      Nenhuma pergunta. Clique em "Adicionar pergunta" para começar.
                    </div>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          {/* Aba 3 */}
          <TabsContent value="aparencia" className="space-y-4">
            <div className="glass-card p-6 space-y-4">
              <div>
                <Label>Título exibido na página pública</Label>
                <Input value={form.public_title || ""} onChange={(e) => updateForm({ public_title: e.target.value })} />
              </div>
              <div>
                <Label>Subtítulo / descrição pública</Label>
                <Textarea value={form.public_subtitle || ""} onChange={(e) => updateForm({ public_subtitle: e.target.value })} />
              </div>
              <div>
                <Label>Imagem ou logo</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.image_url && <img src={form.image_url} alt="" className="h-16" />}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <Button asChild variant="outline" size="sm" type="button">
                      <span><Upload className="w-4 h-4 mr-2" />Upload</span>
                    </Button>
                  </label>
                  {form.image_url && (
                    <Button variant="ghost" size="sm" onClick={() => updateForm({ image_url: "" })}>Remover</Button>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Campos do formulário de optin</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(Object.keys(optinLabels) as Array<keyof OptinFields>).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.optin_fields?.[k] ?? true}
                        onCheckedChange={(v) =>
                          updateForm({ optin_fields: { ...(form.optin_fields || defaultOptinFields), [k]: !!v } })
                        }
                      />
                      {optinLabels[k]}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Mensagem de agradecimento</Label>
                <Textarea
                  value={form.thank_you_message || ""}
                  onChange={(e) => updateForm({ thank_you_message: e.target.value })}
                />
              </div>
              <div className="border-t border-border/50 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Voucher / Cupom</Label>
                    <p className="text-xs text-muted-foreground">Oferecer um cupom de desconto ao concluir.</p>
                  </div>
                  <Switch
                    checked={!!form.voucher_enabled}
                    onCheckedChange={(v) => updateForm({ voucher_enabled: v })}
                  />
                </div>
                {form.voucher_enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Código do voucher</Label>
                      <Input
                        value={form.voucher_code || ""}
                        onChange={(e) => updateForm({ voucher_code: e.target.value })}
                        placeholder="ex: BEMVINDO10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Descrição do voucher</Label>
                      <Input
                        value={form.voucher_description || ""}
                        onChange={(e) => updateForm({ voucher_description: e.target.value })}
                        placeholder="ex: 10% de desconto no primeiro mês"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function QuestionCard({
  question, index, onChange, onRemove, onDuplicate,
}: {
  question: LocalQuestion;
  index: number;
  onChange: (p: Partial<LocalQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.localId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const needsOptions = ["multiple_choice", "checkbox", "dropdown"].includes(question.question_type || "");
  const isScale = question.question_type === "scale";

  const updateOption = (i: number, patch: { text?: string; value?: number }) => {
    const opts = [...(question.options || [])];
    opts[i] = { ...opts[i], ...patch };
    onChange({ options: opts });
  };
  const addOption = () => onChange({ options: [...(question.options || []), { text: "", value: 0 }] });
  const removeOption = (i: number) =>
    onChange({ options: (question.options || []).filter((_, idx) => idx !== i) });

  return (
    <div ref={setNodeRef} style={style} className="glass-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-2 cursor-grab text-muted-foreground">
          <GripVertical className="w-5 h-5" />
        </button>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pergunta {index + 1}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar"><Copy className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={onRemove} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>
          <Textarea
            placeholder="Texto da pergunta"
            value={question.question_text || ""}
            onChange={(e) => onChange({ question_text: e.target.value })}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select
                value={question.question_type}
                onValueChange={(v) => onChange({ question_type: v as CampaignQuestionType })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(questionTypeLabels).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Switch checked={question.is_required ?? true} onCheckedChange={(v) => onChange({ is_required: v })} />
              <span className="text-xs">Obrigatória</span>
            </div>
          </div>

          {isScale && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Mínimo</Label>
                <Input type="number" value={question.scale_min ?? 1}
                  onChange={(e) => onChange({ scale_min: parseInt(e.target.value) || 1 })} />
              </div>
              <div>
                <Label className="text-xs">Máximo</Label>
                <Input type="number" value={question.scale_max ?? 5}
                  onChange={(e) => onChange({ scale_max: parseInt(e.target.value) || 5 })} />
              </div>
            </div>
          )}

          {needsOptions && (
            <div className="space-y-2">
              <Label className="text-xs">Opções de resposta</Label>
              {(question.options || []).map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Texto" value={opt.text}
                    onChange={(e) => updateOption(i, { text: e.target.value })} className="flex-1" />
                  <Input placeholder="Valor" type="number" value={opt.value ?? 0}
                    onChange={(e) => updateOption(i, { value: parseFloat(e.target.value) || 0 })}
                    className="w-24" />
                  <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addOption} className="gap-2">
                <Plus className="w-3 h-3" /> Adicionar opção
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
