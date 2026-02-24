import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import allevoLogo from "@/assets/allevo-logo.png";

const porteOptions = ["Autônomo", "2 - 10 funcionários", "11 - 50 funcionários", "51 - 200 funcionários", "201 - 500 funcionários", "501 - 1000 funcionários", "1001 - 5000 funcionários", "5001+ funcionários"];
const departamentoOptions = ["Recursos Humanos", "Treinamento & Desenvolvimento", "Tecnologia", "Business Intelligence/Dados", "Produto", "Inovação", "Marketing", "Compras", "Não tem departamento", "Outros"];
const cargoOptions = ["C-level", "Diretor(a)", "Gerente", "Coordenador(a)/Supervisor(a)", "Especialista", "Analista", "Estagiário / Estudante", "Outros"];

const freeEmailDomains = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.com.br",
  "live.com", "msn.com", "aol.com", "icloud.com", "mail.com",
  "protonmail.com", "zoho.com", "ymail.com", "gmx.com",
  "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br",
];

interface FormData {
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  porte: string;
  departamento: string;
  cargo: string;
}

const OutboundCadastro = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    telefone: "",
    email: "",
    empresa: "",
    porte: "",
    departamento: "",
    cargo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

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
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório";

    const phoneDigits = formData.telefone.replace(/\D/g, "");
    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    } else if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      newErrors.telefone = "Telefone inválido. Informe entre 10 e 13 dígitos (com DDD)";
    }

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

    if (!formData.empresa.trim()) newErrors.empresa = "Nome da empresa é obrigatório";
    if (!formData.porte) newErrors.porte = "Selecione o porte da empresa";
    if (!formData.departamento) newErrors.departamento = "Selecione seu departamento";
    if (!formData.cargo) newErrors.cargo = "Selecione seu cargo";

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
          telefone: formData.telefone,
          email: formData.email,
          empresa: formData.empresa,
          porte: formData.porte,
          departamento: formData.departamento,
          cargo: formData.cargo,
        },
        utmParams,
        fonte: "outbound",
      },
    });
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    const newValue = field === "telefone" ? formatPhone(value) : value;
    setFormData((prev) => ({ ...prev, [field]: newValue }));
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
          {/* Nome */}
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

          {/* WhatsApp/Telefone */}
          <div className="space-y-2">
            <Label htmlFor="telefone" className="text-foreground font-medium">
              WhatsApp/Telefone<span className="text-primary">*</span>
            </Label>
            <Input
              id="telefone"
              placeholder="(11) 99999-9999"
              value={formData.telefone}
              onChange={(e) => handleChange("telefone", e.target.value)}
              className="bg-card border-border/50 focus:border-primary"
            />
            {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
          </div>

          {/* E-mail Corporativo */}
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

          {/* Nome da Empresa */}
          <div className="space-y-2">
            <Label htmlFor="empresa" className="text-foreground font-medium">
              Nome da Empresa<span className="text-primary">*</span>
            </Label>
            <Input
              id="empresa"
              placeholder="Nome da empresa"
              value={formData.empresa}
              onChange={(e) => handleChange("empresa", e.target.value)}
              className="bg-card border-border/50 focus:border-primary"
            />
            {errors.empresa && <p className="text-sm text-destructive">{errors.empresa}</p>}
          </div>

          {/* Porte da Empresa */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
              Porte da Empresa<span className="text-primary">*</span>
            </Label>
            <Select value={formData.porte} onValueChange={(value) => handleChange("porte", value)}>
              <SelectTrigger className="bg-card border-border/50 focus:border-primary">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border shadow-lg z-[100]">
                {porteOptions.map((option) => (
                  <SelectItem key={option} value={option} className="hover:bg-accent focus:bg-accent cursor-pointer">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.porte && <p className="text-sm text-destructive">{errors.porte}</p>}
          </div>

          {/* Seu Departamento */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
              Seu Departamento<span className="text-primary">*</span>
            </Label>
            <Select value={formData.departamento} onValueChange={(value) => handleChange("departamento", value)}>
              <SelectTrigger className="bg-card border-border/50 focus:border-primary">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border shadow-lg z-[100]">
                {departamentoOptions.map((option) => (
                  <SelectItem key={option} value={option} className="hover:bg-accent focus:bg-accent cursor-pointer">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departamento && <p className="text-sm text-destructive">{errors.departamento}</p>}
          </div>

          {/* Seu Cargo */}
          <div className="space-y-2">
            <Label className="text-foreground font-medium">
              Seu Cargo<span className="text-primary">*</span>
            </Label>
            <Select value={formData.cargo} onValueChange={(value) => handleChange("cargo", value)}>
              <SelectTrigger className="bg-card border-border/50 focus:border-primary">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border shadow-lg z-[100]">
                {cargoOptions.map((option) => (
                  <SelectItem key={option} value={option} className="hover:bg-accent focus:bg-accent cursor-pointer">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.cargo && <p className="text-sm text-destructive">{errors.cargo}</p>}
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
