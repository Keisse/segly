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
          Obrigada por participar!
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed mb-8">
          Agradecemos por ter respondido o Diagnóstico de Execução de Alta Performance.
          Seu resultado já foi registrado com sucesso.
        </p>

        <motion.a
          href="https://aplicacao.allevoforbusiness.com/"
          target="_blank"
          rel="noopener noreferrer"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="block bg-primary/10 border-2 border-primary rounded-xl px-8 py-6 hover:bg-primary/20 transition-colors text-left"
        >
          <p className="text-base text-foreground leading-relaxed mb-4 font-bold">
            Tenho outra experiência legal para compartilhar.
          </p>
          <p className="text-base text-foreground leading-relaxed mb-4">
            Estamos criando um report sobre a <strong>verdadeira dor de um gerente de projetos</strong> em termos de ferramentas.
          </p>
          <p className="text-base text-foreground leading-relaxed mb-4">
            Você quer nos ajudar a construir esse relatório para publicarmos no LinkedIn? Quem responder terá acesso ao relatório em primeira mão.
          </p>
          <p className="text-lg font-display font-bold text-primary text-center">
            <span className="underline">Clique aqui para participar</span> →
          </p>
        </motion.a>
      </motion.div>
    </div>
  );
};

export default ObrigadaPage;
