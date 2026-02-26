import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import allevoLogo from "@/assets/allevo-logo.png";

const ObrigadaPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-lg w-full flex flex-col items-center text-center"
      >
        <img
          src={allevoLogo}
          alt="Allevo for Business"
          className="h-12 md:h-14 mb-8"
        />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <CheckCircle className="w-20 h-20 text-primary mb-6" />
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
          Obrigado por participar!
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed mb-6">
          Agradecemos por ter respondido o Diagnóstico de Execução de Alta Performance.
          Seu resultado já foi registrado com sucesso.
        </p>

        <div className="bg-muted/50 border border-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            📩 Informamos que <strong className="text-foreground">não enviaremos mais e-mails</strong> sobre
            o diagnóstico. Caso queira saber mais sobre nossas soluções, entre em contato
            diretamente com nossa equipe.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ObrigadaPage;
