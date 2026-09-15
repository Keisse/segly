import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Lock, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  type LeadFormField,
  type LeadFormFieldType,
  useDeleteLeadFormField,
  useLeadFormFields,
  useReorderLeadFormFields,
  useUpsertLeadFormField,
} from "@/hooks/useLeadFormFields";
import {
  type LeadForm,
  useCreateLeadForm,
  useDeleteLeadForm,
  useLeadForms,
  useUpdateLeadForm,
} from "@/hooks/useLeadForms";
import { useIsAdmin } from "@/hooks/useMyRole";
import { toast } from "sonner";

const TYPE_LABELS: Record<LeadFormFieldType, string> = {
  short_text: "Texto curto",
  long_text: "Texto longo",
  email: "E-mail",
  phone: "Telefone",
  number: "Número",
  date: "Data",
  select: "Lista suspensa",
  multiselect: "Múltipla escolha",
  checkbox: "Checkbox",
  company: "Empresa",
};

const TYPES_WITH_OPTIONS: LeadFormFieldType[] = ["select", "multiselect"];
const CORE_KEYS = new Set(["empresa", "cnpj", "nome", "telefone", "email"]);

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function FieldRow({ field, onEdit, onToggle, onDelete }: {
  field: LeadFormField;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const protectedField = CORE_KEYS.has(field.field_key) || field.is_system;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isDragging ? "border-primary shadow-lg" : "border-border/60"}`}>
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground touch-none select-none p-2 -m-2"
        aria-label={`Arrastar ${field.label}`}
        title="Arraste para alterar a ordem"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{field.label}</span>
          {protectedField && <Badge variant="secondary" className="text-[10px]"><Lock className="w-2.5 h-2.5 mr-1" />Principal</Badge>}
          {field.required && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
          <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[field.type]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">chave: {field.field_key}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ativo</span>
          <Switch checked={field.active} disabled={protectedField} onCheckedChange={onToggle} />
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="w-4 h-4" /></Button>
        <Button variant="ghost" size="icon" disabled={protectedField} onClick={onDelete} title={protectedField ? "Campos principais não podem ser excluídos" : "Excluir campo"}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

type EditingField = Partial<LeadFormField> & { _optionsText?: string };

export function LeadFormBuilder() {
  const isAdmin = useIsAdmin();
  const { data: forms = [], isLoading: loadingForms } = useLeadForms();
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) || forms.find((form) => form.is_default) || forms[0] || null,
    [forms, selectedFormId],
  );
  const { data: fields = [], isLoading: loadingFields } = useLeadFormFields({ formId: selectedForm?.id ?? null });
  const [orderedFields, setOrderedFields] = useState<LeadFormField[]>([]);
  const createForm = useCreateLeadForm();
  const updateForm = useUpdateLeadForm();
  const deleteForm = useDeleteLeadForm();
  const upsert = useUpsertLeadFormField();
  const del = useDeleteLeadFormField();
  const reorder = useReorderLeadFormFields();

  const [createOpen, setCreateOpen] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormDescription, setNewFormDescription] = useState("");
  const [editing, setEditing] = useState<EditingField | null>(null);
  const [confirmDeleteField, setConfirmDeleteField] = useState<LeadFormField | null>(null);
  const [confirmDeleteForm, setConfirmDeleteForm] = useState<LeadForm | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
  );

  useEffect(() => {
    setOrderedFields(fields);
  }, [fields]);

  if (!isAdmin) return <div className="p-6 rounded-lg border border-border/60 bg-card text-center text-muted-foreground">Somente administradores podem editar os Formulários Padrão.</div>;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || reorder.isPending) return;
    const oldIdx = orderedFields.findIndex((f) => f.id === active.id);
    const newIdx = orderedFields.findIndex((f) => f.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;

    const next = arrayMove(orderedFields, oldIdx, newIdx).map((field, index) => ({ ...field, ordem: index }));
    setOrderedFields(next);
    reorder.mutate(next, {
      onError: () => setOrderedFields(fields),
    });
  };

  const startNewField = () => {
    if (!selectedForm) return;
    setEditing({
      form_id: selectedForm.id,
      label: "",
      field_key: "",
      type: "short_text",
      required: false,
      active: true,
      placeholder: "",
      help_text: "",
      default_value: "",
      options: [],
      _optionsText: "",
      is_system: false,
      ordem: orderedFields.length,
    });
  };

  const saveField = () => {
    if (!editing || !selectedForm) return;
    if (!editing.label?.trim()) return toast.error("Informe o rótulo.");
    const protectedField = !!editing.field_key && CORE_KEYS.has(editing.field_key);
    const key = protectedField ? editing.field_key! : (editing.field_key || slugify(editing.label)).trim();
    if (!key) return toast.error("Informe uma chave para o campo.");
    const type = editing.type as LeadFormFieldType;
    const options = TYPES_WITH_OPTIONS.includes(type)
      ? (editing._optionsText || "").split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
    upsert.mutate({
      id: editing.id,
      form_id: selectedForm.id,
      field_key: key,
      label: editing.label.trim(),
      type,
      required: protectedField ? true : !!editing.required,
      active: protectedField ? true : editing.active ?? true,
      placeholder: editing.placeholder || null,
      help_text: editing.help_text || null,
      default_value: editing.default_value || null,
      options,
      ordem: editing.ordem ?? orderedFields.length,
    }, { onSuccess: () => setEditing(null) });
  };

  const handleCreateForm = () => {
    if (!newFormName.trim()) return toast.error("Informe o nome do formulário.");
    createForm.mutate({ name: newFormName, description: newFormDescription }, {
      onSuccess: (form) => {
        setSelectedFormId(form.id);
        setCreateOpen(false);
        setNewFormName("");
        setNewFormDescription("");
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-semibold">Formulários Padrão</h2>
          <p className="text-sm text-muted-foreground">Crie formulários de cadastro e escolha qual deles aparece em Cadastrar Lead.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Novo formulário</Button>
      </div>

      {loadingForms ? <p className="text-sm text-muted-foreground">Carregando formulários…</p> : (
        <div className="grid gap-3 md:grid-cols-2">
          {forms.map((form) => (
            <button key={form.id} type="button" onClick={() => setSelectedFormId(form.id)} className={`text-left rounded-xl border p-4 transition ${selectedForm?.id === form.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{form.name}</span>
                    {form.is_default && <Badge><Star className="w-3 h-3 mr-1" />Padrão</Badge>}
                    {!form.active && <Badge variant="outline">Inativo</Badge>}
                  </div>
                  {form.description && <p className="text-xs text-muted-foreground mt-1">{form.description}</p>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedForm && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold">{selectedForm.name}</h3>
              <p className="text-xs text-muted-foreground">Os 5 campos principais são obrigatórios em todo formulário e não podem ser removidos. Arraste pelo ícone à esquerda para mudar a ordem.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {!selectedForm.is_default && <Button variant="outline" size="sm" onClick={() => updateForm.mutate({ id: selectedForm.id, patch: { is_default: true, active: true } })}><Star className="w-4 h-4 mr-1.5" />Marcar como padrão</Button>}
              <Button variant="outline" size="sm" onClick={() => updateForm.mutate({ id: selectedForm.id, patch: { active: !selectedForm.active } })}>{selectedForm.active ? "Desativar" : "Ativar"}</Button>
              <Button variant="outline" size="sm" disabled={selectedForm.is_default} onClick={() => setConfirmDeleteForm(selectedForm)}><Trash2 className="w-4 h-4 mr-1.5" />Excluir formulário</Button>
              <Button size="sm" onClick={startNewField}><Plus className="w-4 h-4 mr-1.5" />Novo campo</Button>
            </div>
          </div>

          {loadingFields ? <p className="text-sm text-muted-foreground">Carregando campos…</p> : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className={`space-y-2 ${reorder.isPending ? "opacity-80" : ""}`}>
                  {orderedFields.map((field) => <FieldRow key={field.id} field={field} onEdit={() => setEditing({ ...field, _optionsText: (field.options || []).join("\n") })} onToggle={(active) => upsert.mutate({ id: field.id, active })} onDelete={() => setConfirmDeleteField(field)} />)}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Novo formulário</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Nome</Label><Input value={newFormName} onChange={(e) => setNewFormName(e.target.value)} placeholder="Ex.: Cadastro PME" /></div>
            <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={3} value={newFormDescription} onChange={(e) => setNewFormDescription(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">Empresa/Pessoa Física, CNPJ/CPF, Responsável, Telefone e E-mail serão adicionados automaticamente.</p>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={handleCreateForm} disabled={createForm.isPending}>Criar formulário</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar campo" : "Novo campo"}</DialogTitle></DialogHeader>
          {editing && (() => {
            const protectedField = !!editing.field_key && CORE_KEYS.has(editing.field_key);
            return <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Rótulo</Label><Input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value, field_key: editing.id || editing.field_key ? editing.field_key : slugify(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Chave interna</Label><Input disabled={protectedField || !!editing.is_system} value={editing.field_key ?? ""} onChange={(e) => setEditing({ ...editing, field_key: slugify(e.target.value) })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Tipo</Label><Select value={editing.type ?? "short_text"} disabled={protectedField || !!editing.is_system} onValueChange={(value) => setEditing({ ...editing, type: value as LeadFormFieldType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TYPE_LABELS).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Placeholder</Label><Input value={editing.placeholder ?? ""} onChange={(e) => setEditing({ ...editing, placeholder: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Valor padrão</Label><Input value={editing.default_value ?? ""} onChange={(e) => setEditing({ ...editing, default_value: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Texto de ajuda</Label><Textarea rows={2} value={editing.help_text ?? ""} onChange={(e) => setEditing({ ...editing, help_text: e.target.value })} /></div>
              {TYPES_WITH_OPTIONS.includes((editing.type as LeadFormFieldType) ?? "short_text") && <div className="space-y-1.5"><Label>Opções (uma por linha)</Label><Textarea rows={4} value={editing._optionsText ?? ""} onChange={(e) => setEditing({ ...editing, _optionsText: e.target.value })} /></div>}
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2"><Switch disabled={protectedField} checked={protectedField ? true : !!editing.required} onCheckedChange={(required) => setEditing({ ...editing, required })} /><Label>Obrigatório</Label></div>
                <div className="flex items-center gap-2"><Switch disabled={protectedField} checked={protectedField ? true : editing.active ?? true} onCheckedChange={(active) => setEditing({ ...editing, active })} /><Label>Ativo</Label></div>
              </div>
            </div>;
          })()}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={saveField} disabled={upsert.isPending}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteField} onOpenChange={(open) => !open && setConfirmDeleteField(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir campo?</AlertDialogTitle><AlertDialogDescription>O campo “{confirmDeleteField?.label}” será removido apenas deste formulário. Os valores já salvos nos leads não serão apagados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (confirmDeleteField) del.mutate(confirmDeleteField.id); setConfirmDeleteField(null); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteForm} onOpenChange={(open) => !open && setConfirmDeleteForm(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir formulário?</AlertDialogTitle><AlertDialogDescription>O formulário “{confirmDeleteForm?.name}” e sua configuração serão removidos. Os leads cadastrados por ele continuam preservados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { if (confirmDeleteForm) deleteForm.mutate(confirmDeleteForm); setConfirmDeleteForm(null); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
