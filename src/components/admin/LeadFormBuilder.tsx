import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
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
import { GripVertical, Pencil, Plus, RotateCcw, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  LeadFormField,
  LeadFormFieldType,
  useDeleteLeadFormField,
  useLeadFormFields,
  useReorderLeadFormFields,
  useRestoreDefaultLeadForm,
  useUpsertLeadFormField,
} from "@/hooks/useLeadFormFields";
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

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function FieldRow({
  field,
  onEdit,
  onToggle,
  onDelete,
}: {
  field: LeadFormField;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{field.label}</span>
          {field.is_system && (
            <Badge variant="secondary" className="text-[10px]">
              <Lock className="w-2.5 h-2.5 mr-1" />
              Sistema
            </Badge>
          )}
          {field.required && <Badge variant="outline" className="text-[10px]">Obrigatório</Badge>}
          <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[field.type]}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">chave: {field.field_key}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Ativo</span>
          <Switch checked={field.active} onCheckedChange={onToggle} />
        </div>
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={field.is_system}
          onClick={onDelete}
          title={field.is_system ? "Campos padrão não podem ser excluídos" : "Excluir campo"}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

type EditingField = Partial<LeadFormField> & { _optionsText?: string };

export function LeadFormBuilder() {
  const isAdmin = useIsAdmin();
  const { data: fields = [], isLoading } = useLeadFormFields();
  const upsert = useUpsertLeadFormField();
  const del = useDeleteLeadFormField();
  const reorder = useReorderLeadFormFields();
  const restore = useRestoreDefaultLeadForm();

  const [editing, setEditing] = useState<EditingField | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LeadFormField | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!isAdmin) {
    return (
      <div className="p-6 rounded-lg border border-border/60 bg-card text-center text-muted-foreground">
        Somente administradores podem editar o Formulário Padrão.
      </div>
    );
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    const next = arrayMove(fields, oldIdx, newIdx);
    reorder.mutate(next);
  };

  const startNew = () =>
    setEditing({
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
    });

  const startEdit = (f: LeadFormField) =>
    setEditing({ ...f, _optionsText: (f.options || []).join("\n") });

  const save = () => {
    if (!editing) return;
    if (!editing.label?.trim()) return toast.error("Informe o rótulo.");
    const key = (editing.field_key || slugify(editing.label)).trim();
    if (!key) return toast.error("Informe uma chave para o campo.");
    const type = editing.type as LeadFormFieldType;
    const options = TYPES_WITH_OPTIONS.includes(type)
      ? (editing._optionsText || "")
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    upsert.mutate(
      {
        id: editing.id,
        field_key: key,
        label: editing.label,
        type,
        required: !!editing.required,
        active: editing.active ?? true,
        placeholder: editing.placeholder || null,
        help_text: editing.help_text || null,
        default_value: editing.default_value || null,
        options,
        ordem: editing.ordem ?? fields.length,
      },
      { onSuccess: () => setEditing(null) }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-display font-semibold">Formulário Padrão</h2>
          <p className="text-sm text-muted-foreground">
            Este é o formulário usado para cadastrar leads manualmente e em campanhas padrão.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfirmRestore(true)}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Restaurar padrão
          </Button>
          <Button size="sm" onClick={startNew}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo campo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.map((f) => (
                <FieldRow
                  key={f.id}
                  field={f}
                  onEdit={() => startEdit(f)}
                  onToggle={(v) => upsert.mutate({ id: f.id, active: v })}
                  onDelete={() => setConfirmDelete(f)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar campo" : "Novo campo"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Rótulo</Label>
                  <Input
                    value={editing.label ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        label: e.target.value,
                        field_key: editing.id || editing.field_key
                          ? editing.field_key
                          : slugify(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Chave interna</Label>
                  <Input
                    disabled={!!editing.is_system}
                    value={editing.field_key ?? ""}
                    onChange={(e) => setEditing({ ...editing, field_key: slugify(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select
                  value={editing.type ?? "short_text"}
                  disabled={!!editing.is_system}
                  onValueChange={(v) => setEditing({ ...editing, type: v as LeadFormFieldType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Placeholder</Label>
                  <Input
                    value={editing.placeholder ?? ""}
                    onChange={(e) => setEditing({ ...editing, placeholder: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor padrão</Label>
                  <Input
                    value={editing.default_value ?? ""}
                    onChange={(e) => setEditing({ ...editing, default_value: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Texto de ajuda</Label>
                <Textarea
                  rows={2}
                  value={editing.help_text ?? ""}
                  onChange={(e) => setEditing({ ...editing, help_text: e.target.value })}
                />
              </div>
              {TYPES_WITH_OPTIONS.includes((editing.type as LeadFormFieldType) ?? "short_text") && (
                <div className="space-y-1.5">
                  <Label>Opções (uma por linha)</Label>
                  <Textarea
                    rows={4}
                    value={editing._optionsText ?? ""}
                    onChange={(e) => setEditing({ ...editing, _optionsText: e.target.value })}
                  />
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!editing.required}
                    onCheckedChange={(v) => setEditing({ ...editing, required: v })}
                  />
                  <Label>Obrigatório</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={upsert.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campo?</AlertDialogTitle>
            <AlertDialogDescription>
              O campo "{confirmDelete?.label}" será removido do formulário. Os leads já cadastrados mantêm seus valores existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) del.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore confirm */}
      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar formulário padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              Isto irá restabelecer os 7 campos padrão (Nome, Telefone, E-mail, Empresa, Porte, Departamento, Cargo). Campos personalizados que você criou serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                restore.mutate();
                setConfirmRestore(false);
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
