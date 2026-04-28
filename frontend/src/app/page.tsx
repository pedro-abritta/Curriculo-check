"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Search, TrendingUp, FileText, Calendar, User,
  Upload, ClipboardList, BarChart3, Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG      = "#ffffff";
const BG2     = "#f8fafc";
const CARD    = "#ffffff";
const BORDER  = "#e2e8f0";
const TEXT    = "#0f172a";
const MUTED   = "#64748b";

// ─── Framer helpers ───────────────────────────────────────────────────────────
function fadeUp(delay = 0) {
  return {
    initial:    { opacity: 0, y: 24 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay },
  };
}

// ─── Score Dial ───────────────────────────────────────────────────────────────
const R            = 80;
const CIRC         = 2 * Math.PI * R;
const ARC_FRACTION = 0.75;
const ARC_LEN      = CIRC * ARC_FRACTION;
const TARGET       = 100;

function ScoreDial() {
  const ref                   = useRef<HTMLDivElement>(null);
  const [score, setScore]     = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let t0: number | null = null;
    const duration = 1600;
    function step(ts: number) {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(e * TARGET));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [started]);

  const filled = (score / 100) * ARC_LEN;

  return (
    <div ref={ref} className="flex-shrink-0">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="dg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="hsl(0,70%,52%)"   />
            <stop offset="50%"  stopColor="hsl(45,80%,52%)"  />
            <stop offset="100%" stopColor="hsl(130,55%,42%)" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={R} fill="none"
          stroke="#e2e8f0" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${ARC_LEN} ${CIRC}`}
          transform="rotate(135 100 100)" />
        <circle cx="100" cy="100" r={R} fill="none"
          stroke="url(#dg)" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${filled} ${CIRC}`}
          transform="rotate(135 100 100)" />
        <text x="100" y="93" textAnchor="middle"
          fill="#0f172a" fontSize="38" fontWeight="700" fontFamily="Inter,sans-serif">
          {score}
        </text>
        <text x="100" y="116" textAnchor="middle"
          fill="#64748b" fontSize="13" fontFamily="Inter,sans-serif">
          compatível
        </text>
      </svg>
    </div>
  );
}

// ─── Bento Card ───────────────────────────────────────────────────────────────
function BentoCard({
  icon: Icon, iconBg, iconColor, title, desc, children, delay = 0, className = "",
}: {
  icon: React.ElementType; iconBg: string; iconColor: string;
  title: string; desc: string; children?: React.ReactNode;
  delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ duration: 0.5, delay }}
      className={`rounded-2xl p-6 flex flex-col gap-4 bg-white shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: iconBg }}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <div>
        <h3 className="font-semibold mb-1.5" style={{ color: TEXT }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{desc}</p>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Dimension pills ──────────────────────────────────────────────────────────
const DIMENSIONS = [
  { label: "Skills",              warn: false },
  { label: "Resumo Profissional", warn: false },
  { label: "Datas",               warn: false },
  { label: "Frases de Impacto",   warn: false },
  { label: "Contato",             warn: false },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });
  }, [router]);

  return (
    <div style={{ backgroundColor: BG, color: TEXT }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md"
        style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <span className="font-bold text-base tracking-tight" style={{ color: TEXT }}>Currículo Check</span>
          <Link href="/login"
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-slate-100"
            style={{ border: `1px solid ${BORDER}`, color: MUTED }}>
            Entrar
          </Link>
        </div>
      </header>

      {/* ── Seção 1 — Hero ─────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-28 px-5 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(99,102,241,0.08) 0%, transparent 65%)",
        }} />
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        <motion.div {...fadeUp(0)}
          className="mb-5 px-3.5 py-1 rounded-full text-xs font-medium tracking-wide"
          style={{ border: "1px solid rgba(99,102,241,0.3)", color: "#4f46e5", backgroundColor: "rgba(99,102,241,0.07)" }}>
          Análise feita por IA · Resultados em segundos
        </motion.div>

        <motion.h1 {...fadeUp(0.1)}
          className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] max-w-3xl"
          style={{
            background: "linear-gradient(160deg, #0f172a 35%, #475569 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
          Seu currículo está sendo rejeitado antes do recrutador&nbsp;ver
        </motion.h1>

        <motion.p {...fadeUp(0.2)}
          className="mt-6 text-base sm:text-lg max-w-xl leading-relaxed"
          style={{ color: MUTED }}>
          Empresas usam softwares para filtrar currículos automaticamente. Descubra se o seu passa nesse filtro e o que corrigir.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="mt-9">
          <Link href="/login"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" }}>
            Analisar meu currículo →
          </Link>
        </motion.div>
      </section>

      {/* ── Seção 2 — Faixa de Impacto ─────────────────────────────────────── */}
      <section className="py-20 px-5" style={{ backgroundColor: "#eef2ff" }}>
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-bold mb-5 leading-tight" style={{ color: TEXT }}>
            75% dos currículos são eliminados antes de chegar ao recrutador
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base sm:text-lg leading-relaxed" style={{ color: "#4338ca" }}>
            Softwares de recrutamento (ATS) filtram por palavras-chave, formatação e estrutura. Se o seu currículo não estiver otimizado, ele nem é lido.
          </motion.p>
        </div>
      </section>

      {/* ── Seção 3 — Score Dial + Mockup ──────────────────────────────────── */}
      <section className="py-24 px-5" style={{ backgroundColor: BG2 }}>
        <div className="max-w-6xl mx-auto">
          <motion.div className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: TEXT }}>
              Análise profunda em 5 dimensões
            </h2>
            <p className="text-base max-w-lg mx-auto" style={{ color: MUTED }}>
              Não olhamos apenas palavras-chave. Avaliamos estrutura, métricas e impacto.
            </p>
          </motion.div>

          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left — dial + pills */}
            <div className="flex flex-col items-center gap-8 flex-shrink-0">
              <ScoreDial />
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {DIMENSIONS.map((item, i) => (
                  <motion.div key={item.label}
                    initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white shadow-sm"
                    style={{
                      border: `1px solid ${item.warn ? "#fde68a" : BORDER}`,
                      backgroundColor: item.warn ? "#fffbeb" : CARD,
                    }}>
                    <span className="text-sm font-medium" style={{ color: TEXT }}>{item.label}</span>
                    <span className="text-sm">{item.warn ? "⚠️" : "✅"}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right — dashboard screenshot */}
            <motion.div
              initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              className="flex-1 w-full rounded-2xl overflow-hidden shadow-xl"
              style={{ border: `1px solid ${BORDER}` }}>
              <Image
                src="/screenshots/dashboard.png"
                alt="Resultado da análise de currículo"
                width={900}
                height={600}
                className="w-full h-auto object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Why ────────────────────────────────────────────────────────────── */}
      

      {/* Preview do Dashboard */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: TEXT }}>Veja o que você recebe</h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: MUTED }}>
              Vamos além das palavras-chave. Avaliamos o que recrutadores e sistemas ATS realmente procuram.
            </p>
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
                  Comparamos cada skill exigida com o texto real do seu currículo! Match exato,
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
              O que muda no seu currículo
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

            <p className="text-5xl font-bold mb-1" style={{ color: TEXT }}>R$ 9,90</p>
            <p className="text-sm mb-8" style={{ color: MUTED }}>por análise via PIX</p>

            <div className="flex flex-col gap-3 mb-8 text-left">
              {[
                "Score em 5 dimensões",
                "Match exato de skills",
                "Análise de frases de impacto",
                "Verificação de datas",
                "Sugestões concretas de melhoria",
              ].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "#eef2ff" }}>
                    <Check className="w-2.5 h-2.5 text-indigo-600" />
                  </div>
                  <span style={{ color: MUTED }}>{item}</span>
                </div>
              ))}
            </div>

            <Link href="/login"
              className="block w-full py-3 rounded-xl font-semibold text-sm text-white text-center transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)" }}>
              Analisar agora
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Tips ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ backgroundColor: BG }}>
        <div className="max-w-4xl mx-auto">
          <motion.div className="text-center mb-12"
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: TEXT }}>Dicas para melhores resultados</h2>
            <p className="text-sm" style={{ color: MUTED }}>
              Pequenos ajustes que fazem grande diferença na análise.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { emoji: "▦",  tip: "Use coluna única",       desc: "Layouts multi-coluna confundem sistemas ATS e perdem informação."  },
              { emoji: "🖼", tip: "Evite imagens e logos",  desc: "Sistemas ATS ignoram conteúdo visual, use apenas texto."          },
              { emoji: "📄", tip: "Salve como PDF ou DOCX", desc: "Exporte direto do Word ou Google Docs para garantir legibilidade." },
              { emoji: "📋", tip: "Cole a vaga completa",   desc: "Inclua todos os requisitos para uma análise de skills precisa. Benefícios e informações da empresa são irrelevantes." },
            ].map((t, i) => (
              <motion.div key={t.tip}
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-start gap-4 rounded-xl p-4"
                style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
                <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
                <div>
                  <p className="text-sm font-semibold mb-0.5" style={{ color: "#92400e" }}>{t.tip}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#a16207" }}>{t.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-5 bg-slate-900">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <span className="font-semibold text-white">Currículo Check</span>
          <div className="flex items-center gap-6">
            <Link href="/login"
              className="transition-colors text-slate-400 hover:text-white">
              Entrar
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
