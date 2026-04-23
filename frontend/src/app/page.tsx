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
<<<<<<< Updated upstream
            <div className="flex flex-wrap justify-center gap-3 mb-12">
=======
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">
            {/* Large card — spans 2 rows */}
            <motion.div
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="md:row-span-2 rounded-2xl p-6 flex flex-col justify-between bg-white shadow-sm transition-all duration-300 hover:shadow-md"
              style={{ border: `1px solid ${BORDER}` }}>
              <div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: "#eef2ff" }}>
                  <Search className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: TEXT }}>Match Inteligente</h3>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  Seu currículo fala a mesma língua que a vaga?
                </p>
                <p className="text-sm leading-relaxed mt-2" style={{ color: "#94a3b8" }}>
                  Comparamos cada skill exigida com o texto real do seu currículo — match exato,
                  sem interpretações, sem falsos positivos.
                </p>
              </div>
              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  { label: "Python",     ok: true  },
                  { label: "FastAPI",    ok: true  },
                  { label: "Docker",     ok: true  },
                  { label: "Kubernetes", ok: false },
                  { label: "Terraform",  ok: false },
                ].map(s => (
                  <span key={s.label}
                    className="px-2.5 py-1 rounded-full text-xs font-medium"
                    style={s.ok
                      ? { backgroundColor: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe" }
                      : { backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                    {s.label} {s.ok ? "✓" : "✗"}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* 4 smaller cards */}
            {[
              { icon: TrendingUp, bg: "#ecfdf5", color: "#059669", title: "Impacto Real",       desc: "Suas conquistas estão visíveis para quem recruta?",         delay: 0.10 },
              { icon: FileText,   bg: "#fffbeb", color: "#d97706", title: "Primeira Impressão", desc: "O resumo do seu currículo convence em 6 segundos?",         delay: 0.15 },
              { icon: Calendar,   bg: "#f5f3ff", color: "#7c3aed", title: "Consistência",       desc: "Detalhes que passam despercebidos mas eliminam candidatos.", delay: 0.20 },
              { icon: User,       bg: "#eff6ff", color: "#2563eb", title: "Visibilidade",       desc: "Recrutadores conseguem te encontrar e te contactar?",       delay: 0.25 },
            ].map(c => (
              <BentoCard key={c.title} icon={c.icon} iconBg={c.bg} iconColor={c.color}
                title={c.title} desc={c.desc} delay={c.delay} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why ────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ backgroundColor: BG2 }}>
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-14"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: TEXT }}>
              Veja a diferença na prática
            </h2>
            <p className="text-sm mt-3" style={{ color: MUTED }}>
              O Currículo Check mostra exatamente o que corrigir.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5 }}
              className="rounded-2xl p-6 bg-white shadow-sm"
              style={{ border: "1px solid #fecaca" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5 text-red-500">
                Currículo comum
              </p>
              <div className="flex flex-col gap-2.5">
                {["Skills genéricas", "Sem métricas", "Formato incorreto"].map(t => (
                  <span key={t} className="px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                    ✗ {t}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: 0.1 }}
              className="text-2xl text-center hidden md:block text-slate-300">
              →
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}
              className="rounded-2xl p-6 bg-white shadow-sm"
              style={{ border: "1px solid #a7f3d0" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-5 text-emerald-600">
                Currículo otimizado
              </p>
              <div className="flex flex-col gap-2.5">
                {["Skills alinhadas à vaga", "Resultados quantificados", "Formato otimizado para recrutamento"].map(t => (
                  <span key={t} className="px-3 py-2 rounded-lg text-sm"
                    style={{ backgroundColor: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>
                    ✓ {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-5" style={{ backgroundColor: BG }}>
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: TEXT }}>Como funciona</h2>
            <p className="text-base" style={{ color: MUTED }}>Três passos simples para resultados concretos.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { num: "01", Icon: Upload,        title: "Upload do currículo",       desc: "Envie seu currículo em PDF ou DOCX. Suporte a arquivos de até 5MB."                        },
              { num: "02", Icon: ClipboardList, title: "Cole a descrição da vaga",  desc: "Cole a seção de requisitos, responsabilidades e qualificações da vaga."                    },
              { num: "03", Icon: BarChart3,     title: "Receba o score",            desc: "Score detalhado em 5 seções com sugestões concretas de melhoria."                          },
            ].map((step, i) => (
              <motion.div key={step.num}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.12 }}
                className="rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-sm"
                style={{ border: `1px solid ${BORDER}` }}>
                <span className="text-5xl font-bold leading-none select-none text-indigo-100">
                  {step.num}
                </span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#eef2ff" }}>
                  <step.Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1.5" style={{ color: TEXT }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ backgroundColor: BG2 }}>
        <div className="max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="rounded-2xl p-8 text-center bg-white shadow-md"
            style={{ border: "1px solid #c7d2fe" }}>

            <p className="text-sm mb-1 text-slate-400">Consultorias cobram até</p>
            <p className="text-xl font-semibold line-through mb-6 text-slate-300">R$ 500,00</p>

            <div className="mb-3 inline-flex">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">Preço de lançamento</span>
            </div>

            <p className="text-5xl font-bold mb-1" style={{ color: TEXT }}>R$ 4,90</p>
            <p className="text-sm mb-8" style={{ color: MUTED }}>por análise via PIX</p>

            <div className="flex flex-col gap-3 mb-8 text-left">
>>>>>>> Stashed changes
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
