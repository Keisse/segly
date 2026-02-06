import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";

export interface LeadData {
  nome: string;
  telefone: string;
  email: string;
  empresa: string;
  porte: string;
  departamento: string;
  cargo: string;
}

interface LeadCaptureFormProps {
  onSubmit: (data: LeadData) => void;
}

const porteOptions = [
  "Autônomo",
  "2 - 10 funcionários",
  "11 - 50 funcionários",
  "51 - 200 funcionários",
  "201 - 500 funcionários",
  "501 - 1000 funcionários",
  "1001 - 5000 funcionários",
  "5001+ funcionários",
];

const departamentoOptions = [
  "Recursos Humanos",
  "Treinamento & Desenvolvimento",
  "Tecnologia",
  "Business Intelligence/Dados",
  "Produto",
  "Inovação",
  "Marketing",
  "Compras",
  "Não tem departamento",
  "Outros",
];

const cargoOptions = [
  "C-level",
  "Diretor(a)",
  "Gerente",
  "Coordenador(a)/Supervisor(a)",
  "Especialista",
  "Analista",
  "Estagiário / Estudante",
  "Outros",
];

const LeadCaptureForm = ({ onSubmit }: LeadCaptureFormProps) => {
  const [formData, setFormData] = useState<LeadData>({
    nome: "",
    telefone: "",
    email: "",
    empresa: "",
    porte: "",
    departamento: "",
    cargo: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LeadData, string>>>({});

  const validateForm = () => {
    const newErrors: Partial<Record<keyof LeadData, string>> = {};

    if (!formData.nome.trim()) newErrors.nome = "Nome é obrigatório";
    if (!formData.telefone.trim()) newErrors.telefone = "Telefone é obrigatório";
    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
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
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof LeadData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-5"
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
          onChange={(e) => handleInputChange("nome", e.target.value)}
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
          onChange={(e) => handleInputChange("telefone", e.target.value)}
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
          onChange={(e) => handleInputChange("email", e.target.value)}
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
          onChange={(e) => handleInputChange("empresa", e.target.value)}
          className="bg-card border-border/50 focus:border-primary"
        />
        {errors.empresa && <p className="text-sm text-destructive">{errors.empresa}</p>}
      </div>

      {/* Porte da Empresa */}
      <div className="space-y-2">
        <Label className="text-foreground font-medium">
          Porte da Empresa<span className="text-primary">*</span>
        </Label>
        <Select value={formData.porte} onValueChange={(value) => handleInputChange("porte", value)}>
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
        <Select value={formData.departamento} onValueChange={(value) => handleInputChange("departamento", value)}>
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
        <Select value={formData.cargo} onValueChange={(value) => handleInputChange("cargo", value)}>
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

      <Button
        type="submit"
        size="lg"
        className="w-full text-lg py-6 font-semibold group mt-6"
      >
        Iniciar Diagnóstico
        <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
      </Button>

      <p className="text-sm text-muted-foreground text-center mt-4 leading-relaxed">
        Em 3 minutos você gera um relatório exclusivo com gaps identificados e ações práticas para evoluir.
      </p>
    </motion.form>
  );
};

export default LeadCaptureForm;
