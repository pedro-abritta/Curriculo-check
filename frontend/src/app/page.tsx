"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HeroWithMockup } from "@/components/hero-with-mockup";
import { Mockup } from "@/components/ui/mockup";
import { Upload, ClipboardList, BarChart3 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-foreground">ATS Analyzer</span>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="pt-14">
        <HeroWithMockup
          title="Descubra se seu currículo passa no filtro ATS"
          description="Analise a compatibilidade do seu currículo com vagas de emprego usando IA. Receba um score detalhado com sugestões de melhoria em segundos."
          primaryCta={{ text: "Analisar meu currículo", href: "/login" }}
          secondaryCta={{ text: "Como funciona?", href: "#como-funciona" }}
          mockupImage={{
            src: "/screenshots/input.png",
            alt: "Tela de análise do ATS Analyzer",
            width: 1200,
            height: 800,
          }}
        />
      </div>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Como funciona</h2>
          <p className="text-muted-foreground text-lg mb-16 max-w-xl mx-auto">
            Três passos simples para saber se seu currículo está pronto para passar pelos filtros de ATS.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Upload className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center -mt-2">
                1
              </div>
              <h3 className="font-semibold text-lg text-foreground">Upload do Currículo</h3>
              <p className="text-muted-foreground text-sm text-center">
                Envie seu currículo em formato PDF ou DOCX. Suporte a arquivos de até 5MB.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center -mt-2">
                2
              </div>
              <h3 className="font-semibold text-lg text-foreground">Cole a Vaga</h3>
              <p className="text-muted-foreground text-sm text-center">
                Cole a descrição completa da vaga desejada. Quanto mais detalhada, mais precisa a análise.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center -mt-2">
                3
              </div>
              <h3 className="font-semibold text-lg text-foreground">Receba o Score</h3>
              <p className="text-muted-foreground text-sm text-center">
                Análise detalhada com score de compatibilidade e sugestões concretas de melhoria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preview do Dashboard */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Veja o que você recebe</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Um relatório completo dividido em 5 seções para você saber exatamente o que melhorar.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {[
                { label: "Contato", color: "bg-blue-100 text-blue-700" },
                { label: "Skills", color: "bg-indigo-100 text-indigo-700" },
                { label: "Datas", color: "bg-purple-100 text-purple-700" },
                { label: "Resumo Profissional", color: "bg-violet-100 text-violet-700" },
                { label: "Frases de Impacto", color: "bg-fuchsia-100 text-fuchsia-700" },
              ].map((item) => (
                <span
                  key={item.label}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium ${item.color}`}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <Mockup className="shadow-[0_0_60px_-15px_rgba(79,70,229,0.25)]">
            <img
              src="/screenshots/dashboard.png"
              alt="Dashboard de resultados do ATS Analyzer"
              width={1200}
              height={800}
              className="w-full h-auto"
              loading="lazy"
            />
          </Mockup>
        </div>
      </section>

      {/* Preço */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-background rounded-2xl border border-border shadow-sm p-10 flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl">
              🎯
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Simples e transparente</h2>
              <p className="text-muted-foreground mt-2">Pague apenas quando quiser analisar.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-foreground">R$ 9,90</span>
              <span className="text-muted-foreground text-lg">/ análise</span>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <span>🔒</span> Pagamento seguro via PIX
            </p>
            <Link
              href="/login"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-center transition-colors"
            >
              Começar agora
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ATS Analyzer · Resultados gerados por IA
      </footer>
    </div>
  );
}
