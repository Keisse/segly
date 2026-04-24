import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, FileText, Link as LinkIcon, FileAudio, FileVideo, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

type KType = "text" | "pdf" | "docx" | "link" | "audio" | "video";

interface KItem {
  id: string;
  title: string;
  type: KType;
  content: string | null;
  source_url: string | null;
  file_url: string | null;
  created_at: string;
}

const typeIcon = {
  text: FileText, pdf: FileText, docx: FileText, link: LinkIcon, audio: FileAudio, video: FileVideo,
};

const BaseConhecimentoPage = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<KType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState<KItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["knowledge-base"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as KItem[];
    },
  });

  const reset = () => {
    setTitle(""); setContent(""); setLink(""); setFile(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Informe o título"); return; }
    setSubmitting(true);
    try {
      let payload: any = { title, type: tab };

      if (tab === "text") {
        if (!content.trim()) throw new Error("Cole o conteúdo");
        payload.content = content;
      } else if (tab === "link") {
        if (!link.trim()) throw new Error("Informe a URL");
        payload.source_url = link;
        // Extrair conteúdo do link via edge function
        const { data, error } = await supabase.functions.invoke("knowledge-process", {
          body: { type: "link", url: link },
        });
        if (error) throw error;
        payload.content = data?.content || "";
      } else {
        if (!file) throw new Error("Selecione um arquivo");
        // Upload
        const path = `${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("knowledge-base").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("knowledge-base").getPublicUrl(path);
        payload.file_url = path;

        // Extrair conteúdo (PDF/DOCX/áudio/vídeo)
        if (tab === "audio" || tab === "video") {
          toast.info("Transcrevendo áudio/vídeo... pode levar alguns minutos");
          const { data, error } = await supabase.functions.invoke("knowledge-process", {
            body: { type: tab, path },
          });
          if (error) throw error;
          payload.content = data?.content || "";
        } else if (tab === "pdf" || tab === "docx") {
          const { data, error } = await supabase.functions.invoke("knowledge-process", {
            body: { type: tab, path },
          });
          if (error) throw error;
          payload.content = data?.content || "";
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;

      const { error } = await supabase.from("knowledge_base").insert(payload);
      if (error) throw error;

      toast.success("Material adicionado");
      reset(); setOpen(false);
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = useMutation({
    mutationFn: async (item: KItem) => {
      if (item.file_url) {
        await supabase.storage.from("knowledge-base").remove([item.file_url]);
      }
      const { error } = await supabase.from("knowledge_base").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["knowledge-base"] });
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Base de Conhecimento</h1>
          <p className="text-sm text-muted-foreground">
            Materiais usados como referência na geração de novas perguntas pela IA.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Adicionar material</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novo material</DialogTitle></DialogHeader>
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Tabs value={tab} onValueChange={(v) => setTab(v as KType)}>
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="text">Texto</TabsTrigger>
                <TabsTrigger value="pdf">PDF</TabsTrigger>
                <TabsTrigger value="docx">DOCX</TabsTrigger>
                <TabsTrigger value="link">Link</TabsTrigger>
                <TabsTrigger value="audio">Áudio</TabsTrigger>
                <TabsTrigger value="video">Vídeo</TabsTrigger>
              </TabsList>
              <TabsContent value="text">
                <Textarea rows={10} placeholder="Cole o conteúdo aqui" value={content} onChange={(e) => setContent(e.target.value)} />
              </TabsContent>
              <TabsContent value="link">
                <Input placeholder="https://..." value={link} onChange={(e) => setLink(e.target.value)} />
              </TabsContent>
              <TabsContent value="pdf">
                <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </TabsContent>
              <TabsContent value="docx">
                <Input type="file" accept=".docx,.doc" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </TabsContent>
              <TabsContent value="audio">
                <Input type="file" accept="audio/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground mt-2">Será transcrito automaticamente.</p>
              </TabsContent>
              <TabsContent value="video">
                <Input type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                <p className="text-xs text-muted-foreground mt-2">A faixa de áudio será transcrita.</p>
              </TabsContent>
            </Tabs>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items?.map((i) => {
            const Icon = typeIcon[i.type];
            return (
              <Card key={i.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  <Badge variant="secondary" className="text-xs uppercase">{i.type}</Badge>
                </div>
                <h3 className="font-medium">{i.title}</h3>
                {i.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{i.content}</p>
                )}
                {i.source_url && (
                  <a href={i.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary truncate block">
                    {i.source_url}
                  </a>
                )}
                <div className="flex gap-2 pt-2">
                  {i.content && (
                    <Button size="sm" variant="ghost" onClick={() => setViewing(i)}>
                      <Eye className="h-3 w-3 mr-1" /> Ver
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm("Remover?")) remove.mutate(i);
                  }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            );
          })}
          {items?.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">Nenhum material adicionado.</p>
          )}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle>{viewing?.title}</DialogTitle></DialogHeader>
          <pre className="text-xs whitespace-pre-wrap">{viewing?.content}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BaseConhecimentoPage;
