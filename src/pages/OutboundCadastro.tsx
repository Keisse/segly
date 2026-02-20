import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import allevoLogo from "@/assets/allevo-logo.png";

export interface OutboundLeadData {
  nome: string;
  email: string;
}

const freeEmailDomains = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.br",
  "live.com", "msn.com", "aol.com", "icloud.com", "mail.com",
  "protonmail.com", "zoho.com", "ymail.com", "gmx.com",
  "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br",
];

const OutboundCadastro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ nome: "", email: "" });
  const [errors, setErrors] = useState<Partial<Record<"nome" | "email", string>>>({});

  const utmParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_term: params.get("utm_term") || undefined,
      utm_content: params.get("utm_content") || undefined,
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório";

    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "E-mail inválido";
      } else {
        const [prefix, domainFull] = formData.email.split("@");
        const domainParts = domainFull?.split(".");
        const domainName = domainParts?.[0] || "";
        if (prefix.length < 3) {
          newErrors.email = "O prefixo do e-mail deve ter no mínimo 3 caracteres";
        } else if (domainName.length < 3) {
          newErrors.email = "O domínio do e-mail deve ter no mínimo 3 caracteres";
        } else if (freeEmailDomains.includes(domainFull.toLowerCase())) {
          newErrors.email = "Use um e-mail corporativo (não são aceitos Gmail, Outlook, Yahoo, etc.)";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    navigate("/diagnostico", {
      state: {
        leadData: {
          nome: formData.nome,
          telefone: "",
          email: formData.email,
          empresa: "",
          porte: "",
          departamento: "",
          cargo: "",
        },
        utmParams,
        fonte: "outbound",
      },
    });
  };

  const handleChange = (field: "nome" | "email", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full flex flex-col items-center">
        <motion.img
          src={allevoLogo}
          alt="Allevo for Business"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="h-12 md:h-14 mb-8"
        />

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 text-center"
        >
          Diagnóstico de Execução de{" "}
          <span className="text-primary">Alta Performance</span>
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-base text-muted-foreground mb-8 leading-relaxed text-center max-w-lg"
        >
          Preencha seus dados abaixo para iniciar o diagnóstico e descobrir seu score de execução.
        </motion.p>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="w-full space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-foreground font-medium">
              Nome<span className="text-primary">*</span>
            </Label>
            <Input
              id="nome"
              placeholder="Seu nome completo"
              value={formData.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              className="bg-card border-border/50 focus:border-primary"
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              E-mail Corporativo<span className="text-primary">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seuemail@empresa.com.br"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="bg-card border-border/50 focus:border-primary"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <Button type="submit" size="lg" className="w-full text-lg py-6 font-semibold group mt-6">
            Iniciar Diagnóstico
            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
            Suas informações nos ajudam a gerar um diagnóstico preciso. Em troca, você recebe: seu Score de Execução, análise de gaps e ações práticas para evoluir - 100% gratuito.
          </p>
        </motion.form>
      </div>
    </div>
  );
};

export default OutboundCadastro;
