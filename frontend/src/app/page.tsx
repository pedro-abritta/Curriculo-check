"use client";

import { useRef, useState, useEffect } from "react";
import { X, Upload, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialScore } from "@/components/score-ring";
import { SectionProgressBar } from "@/components/progress-bar";
import {
  EvidenceCard,
  EvidenceBlock,
  SuggestionBlock,
  type EvidenceStatus,
} from "@/components/evidence-card";
import { AuthForm } from "@/components/AuthForm";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { RoadmapWidget } from "@/components/RoadmapWidget";
import { API_URL } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppState = "loading_session" | "auth" | "input" | "loading" | "result";
type BackendStatus = "green" | "yellow" | "red";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const LOADING_MESSAGES = [
  "Extraindo dados do currículo...",
  "Analisando informações de contato...",
  "Comparando skills com a vaga...",
  "Verificando formatação de datas...",
  "Avaliando resumo profissional...",
  "Identificando frases de impacto...",
  "Calculando score final...",
];

const CONTACT_FIELDS = [
  { key: "nome", label: "Nome" },
  { key: "email", label: "Email" },
  { key: "telefone", label: "Telefone" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "endereco", label: "Endereço" },
  { key: "data_nascimento", label: "Data de Nascimento" },
  { key: "portfolio", label: "Portfólio" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScore(section: any): number {
  if (!section || section.disabled) return 0;
  return section.overall?.score ?? section.score ?? 0;
}

function getStatus(section: any): BackendStatus {
  if (!section || section.disabled) return "red";
  return section.overall?.status ?? section.status ?? "red";
}

function toEvidenceStatus(s: BackendStatus): EvidenceStatus {
  if (s === "green") return "success";
  if (s === "yellow") return "warning";
  return "error";
}

function passToStatus(s: "pass" | "fail"): EvidenceStatus {
  return s === "pass" ? "success" : "error";
}

function dotColor(status: BackendStatus): string {
  if (status === "green") return "#10b981";
  if (status === "yellow") return "#f59e0b";
  return "#ef4444";
}

function isMissingSkill(skill: string, missingList: string[]): boolean {
  return missingList.some((m) => m.toLowerCase() === skill.toLowerCase());
}

// ─── Input View ───────────────────────────────────────────────────────────────

function InputView({
  onSubmit,
  onLogout,
  apiError,
  onClearApiError,
}: {
  onSubmit: (file: File, jobText: string) => void;
  onLogout: () => void;
  apiError?: string;
  onClearApiError?: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSetFile(f: File) {
    setFileError("");
    if (!VALID_TYPES.includes(f.type)) {
      setFileError("Apenas .pdf ou .docx são aceitos.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setFileError("O arquivo deve ter no máximo 5MB.");
      return;
    }
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  }

  const canSubmit = !!file && jobText.trim().length > 0;

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">ATS Analyzer</h1>
            <p className="mt-2 text-gray-500 text-lg">Análise inteligente de currículos</p>
          </div>
          <Button variant="outline" size="sm" onClick={onLogout} className="mt-2 gap-1.5">
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Currículo</CardTitle>
            <CardDescription>Envie seu currículo em PDF ou DOCX (máximo 5MB)</CardDescription>
          </CardHeader>
          <CardContent>
            {file ? (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setFileError(""); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => inputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors select-none ${
                  isDragging
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                }`}
              >
                <Upload className={`h-8 w-8 ${isDragging ? "text-indigo-500" : "text-gray-400"}`} />
                <div className="text-center">
                  <p className="font-medium text-gray-700">Arraste o arquivo ou clique para selecionar</p>
                  <p className="text-sm text-gray-400 mt-1">.pdf ou .docx</p>
                </div>
              </div>
            )}
            {fileError && <p className="mt-2 text-sm text-red-500">{fileError}</p>}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndSetFile(f);
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Descrição da Vaga</CardTitle>
            <CardDescription>Cole o texto completo da vaga para uma análise precisa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Cole aqui a descrição completa da vaga...
              (título da vaga, pré requisitos, habilidades desejáveis. benefícios, tipo de vaga, etc, são irrelevantes para a análise)"
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              className="min-h-[196px] resize-y text-sm"
            />
          </CardContent>
        </Card>

        {apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{apiError}</p>
          </div>
        )}

        <Button
          size="lg"
          className={`w-full ${canSubmit ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}`}
          disabled={!canSubmit}
          onClick={() => onSubmit(file!, jobText)}
        >
          Analisar Currículo
        </Button>
      </div>
    </main>
  );
}

// ─── Loading View ─────────────────────────────────────────────────────────────

function LoadingView() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
        setVisible(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white gap-8">
      <svg
        className="animate-spin h-14 w-14 text-indigo-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p
        className="text-gray-600 text-lg font-medium transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {LOADING_MESSAGES[msgIndex]}
      </p>
    </main>
  );
}

// ─── Tab: Skills ──────────────────────────────────────────────────────────────

function SkillsTab({ skills }: { skills: any }) {
  if (!skills || skills.disabled) {
    return <p className="text-sm text-gray-400 py-4">Seção desativada.</p>;
  }

  const overall = skills.overall;
  const req = skills.hard_skills?.required;
  const nice = skills.hard_skills?.nice_to_have;

  function SkillSubSection({
    title,
    data,
  }: {
    title: string;
    data: { matched: string[]; missing: string[]; total: number; score: number };
  }) {
    if (!data || data.total === 0) return null;

    const sorted = [...data.matched, ...data.missing];

    const description =
      title === "Obrigatórias"
        ? "Skills obrigatórias exigidas pela vaga."
        : "Skills desejáveis que podem destacar seu currículo.";

    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">{title} ({data.total})</h3>
        <p className="text-xs text-gray-400 mb-3">{description}</p>
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((s) => {
            const missing = isMissingSkill(s, data.missing);
            return (
              <span
                key={s}
                className={`px-2 py-0.5 text-xs rounded-full font-medium border ${
                  missing
                    ? "bg-red-100 text-red-800 border-red-200"
                    : "bg-emerald-100 text-emerald-800 border-emerald-200"
                }`}
              >
                {s}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionProgressBar title="Hard Skills · Compatibilidade com a Vaga" score={overall?.score ?? 0} />
        <p className="text-xs text-gray-400 text-center mt-2">🟢 Presente no currículo &nbsp; 🔴 Ausente no currículo</p>
      </div>
      <SkillSubSection title="Obrigatórias" data={req} />
      {nice && nice.total > 0 && (
        <SkillSubSection title="Diferenciais" data={nice} />
      )}
    </div>
  );
}

// ─── Tab: Resumo Profissional ─────────────────────────────────────────────────

function SummaryTab({ summary }: { summary: any }) {
  if (!summary || summary.disabled) {
    return <p className="text-sm text-gray-400 py-4">Seção desativada.</p>;
  }

  const pillars = summary.pillars;

  return (
    <div className="space-y-3">
      <SectionProgressBar title="Resumo Profissional · Qualidade" score={summary.score ?? 0} />

      {!pillars ? (
        <p className="text-sm text-gray-400">Nenhum resumo profissional encontrado no currículo.</p>
      ) : (
        <>
          <EvidenceCard
            softError
            status={passToStatus(pillars.metrics.status)}
            label="Métricas e Resultados"
            message={
              pillars.metrics.status === "pass"
                ? `${pillars.metrics.count} métricas encontradas no resumo`
                : "Menos de 2 métricas encontradas"
            }
          >
            <EvidenceBlock items={pillars.metrics.found} />
          </EvidenceCard>

          <EvidenceCard
            softError
            status={passToStatus(pillars.skills.status)}
            label="Skills da Vaga no Resumo"
            message={
              pillars.skills.status === "pass"
                ? `${pillars.skills.count} skills da vaga mencionadas no resumo`
                : "Menos de 2 skills da vaga no resumo"
            }
          >
            <EvidenceBlock items={pillars.skills.found} />
          </EvidenceCard>

          <EvidenceCard
            softError
            status={passToStatus(pillars.impact_verbs.status)}
            label="Verbos de Impacto"
            message={
              pillars.impact_verbs.status === "pass"
                ? `${pillars.impact_verbs.count} verbos de impacto encontrados`
                : "Menos de 2 verbos de impacto"
            }
          >
            <EvidenceBlock items={pillars.impact_verbs.found} />
          </EvidenceCard>
        </>
      )}
    </div>
  );
}

// ─── Tab: Datas ───────────────────────────────────────────────────────────────

function parseDateEntry(entry: string): { value: string; context: string } | string {
  const match = entry.match(/^(.+?)\s*\(em:\s*(.+)\)$/);
  if (match) return { value: match[1].trim(), context: match[2].trim() };
  return entry;
}

function DatesTab({ dates }: { dates: any }) {
  if (!dates || dates.disabled) {
    return <p className="text-sm text-gray-400 py-4">Seção desativada.</p>;
  }

  const datesList: any[] = dates.dates ?? [];
  const errorGroups: any[] = dates.error_groups ?? [];

  const validDates = datesList.filter((d: any) => d.status === "correct").map((d: any) => d.original as string);

  return (
    <div className="space-y-3">
      <SectionProgressBar title="Datas · Formatação" score={dates.score ?? 0} />

      {datesList.length === 0 && (
        <p className="text-sm text-gray-400">Nenhuma data encontrada no currículo.</p>
      )}

      {validDates.length > 0 && (
        <EvidenceCard
          status="success"
          label={`Datas válidas (${validDates.length})`}
          message="Formato mês/ano identificado corretamente"
        >
          <EvidenceBlock items={validDates} />
        </EvidenceCard>
      )}

      {errorGroups.map((group: any, i: number) => (
        <EvidenceCard
          softError
          key={i}
          status="error"
          label={`${group.message} (${(group.dates as string[]).length})`}
          message={group.suggestion}
        >
          <EvidenceBlock items={(group.dates as string[]).map(parseDateEntry)} />
        </EvidenceCard>
      ))}
    </div>
  );
}

// ─── Tab: Frases de Impacto ───────────────────────────────────────────────────

function ImpactTab({ impact }: { impact: any }) {
  if (!impact || impact.disabled) {
    return <p className="text-sm text-gray-400 py-4">Seção desativada.</p>;
  }

  const phrases: any[] = impact.phrases ?? [];
  const deduplicated: any[] = impact.deduplicated ?? [];

  const impactPhrases = phrases.filter((p: any) => p.is_impact);
  const nonImpactPhrases = phrases.filter((p: any) => !p.is_impact);

  return (
    <div className="space-y-3">
      <SectionProgressBar title="Frases de Impacto · Qualidade" score={impact.score ?? 0} status={impact.status} />

      {impactPhrases.length >= 1 && nonImpactPhrases.length >= 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <span className="text-base flex-shrink-0">💡</span>
          <p className="text-xs text-amber-800">
            Seu currículo possui boas frases de impacto com métricas quantitativas. Porém, ainda há frases que poderiam ser fortalecidas com números e resultados concretos. Veja abaixo as sugestões de melhoria.
          </p>
        </div>
      )}

      {deduplicated.length > 0 && deduplicated.map((d: any, i: number) => (
        <div key={i} className="rounded-xl border bg-gray-100 border-gray-200 px-4 py-3">
          <p className="text-sm font-medium text-gray-600">
            ℹ️ {deduplicated.length === 1 ? "1 frase duplicada foi removida" : `${deduplicated.length} frases duplicadas foram removidas`} da análise:
          </p>
          {d.removed && (
            <p className="mt-1 text-xs text-gray-400 italic">'{d.removed}'</p>
          )}
        </div>
      ))}

      {phrases.length === 0 && (
        <p className="text-sm text-gray-400">Nenhuma frase encontrada no currículo.</p>
      )}

      {impactPhrases.map((phrase: any, i: number) => {
        const verb = phrase.verb || phrase.text.split(" ").slice(0, 3).join(" ");
        return (
          <EvidenceCard
            key={i}
            status="success"
            label={verb}
            message={[phrase.metric, phrase.context].filter(Boolean).join(" · ")}
          >
            <EvidenceBlock items={[phrase.text]} />
          </EvidenceCard>
        );
      })}

      {nonImpactPhrases.map((phrase: any, i: number) => {
        const verb = phrase.verb || phrase.text.split(" ").slice(0, 3).join(" ");
        return (
          <EvidenceCard
            softError
            key={i}
            status="error"
            label={verb}
            message={phrase.suggestion || "Frase sem métrica de resultado"}
          >
            <EvidenceBlock items={[phrase.text]} />
          </EvidenceCard>
        );
      })}

    </div>
  );
}

// ─── Tab: Contato ─────────────────────────────────────────────────────────────

function ContactTab({ contact }: { contact: any }) {
  if (!contact || contact.disabled) {
    return <p className="text-sm text-gray-400 py-4">Seção desativada.</p>;
  }

  const items = contact.items ?? {};

  return (
    <div className="space-y-3">
      <SectionProgressBar title="Contato · Informações" score={contact.score ?? 0} />

      {CONTACT_FIELDS.map(({ key, label }) => {
        const item = items[key];
        const found = item?.found ?? false;
        const rawValue = item?.value;
        const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;

        return (
          <EvidenceCard
            softError
            key={key}
            status={found ? "success" : "error"}
            label={label}
            message={found && value ? String(value) : "Não encontrado no currículo"}
          />
        );
      })}
    </div>
  );
}

// ─── Paywall View ────────────────────────────────────────────────────────────

function PaywallView({
  preview,
  analysisId,
  token,
  onReset,
  onLogout,
}: {
  preview: any;
  analysisId: string;
  token: string | null;
  onReset: () => void;
  onLogout: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const overallScore: number = preview.overall_score ?? 0;
  const sections = preview.sections ?? {};

  async function handleUnlock() {
    if (paying) return;
    setPaying(true);
    try {
      const res = await fetch(`${API_URL}/api/payment/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ analysis_id: analysisId }),
      });
      if (res.status === 401) { onLogout(); return; }
      if (!res.ok) throw new Error("Erro ao iniciar pagamento");
      const { payment_url } = await res.json();
      window.location.href = payment_url;
    } catch {
      setPaying(false);
    }
  }

  const sectionStatuses: Record<TabId, BackendStatus> = {
    skills: sections.skills?.status ?? "red",
    summary: sections.summary?.status ?? "red",
    dates: sections.dates?.status ?? "red",
    impact: sections.impact?.status ?? "red",
    contact: sections.contact?.status ?? "red",
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              ← Nova Análise
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-widest uppercase text-gray-400 font-medium">Análise ATS</p>
            <h1 className="text-lg font-bold text-gray-900">Health Check do Currículo</h1>
          </div>
        </div>

        {/* Blurred Score */}
        <div className="flex flex-col items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-8">
          <div className="relative">
            <div style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}>
              <RadialScore score={overallScore} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">🔒</span>
            </div>
          </div>
        </div>

        {/* CTA Card */}
        <div className="border-2 border-indigo-500 bg-white shadow-lg rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
          <span className="text-3xl">🔒</span>
          <h2 className="text-xl font-bold text-gray-900">Sua análise está pronta!</h2>
          <p className="text-sm text-gray-500 max-w-sm">
            Desbloqueie o resultado completo para ver os detalhes de cada seção, recomendações e pontos de melhoria.
          </p>
          <button
            onClick={handleUnlock}
            disabled={paying}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 px-8 transition-colors"
          >
            {paying ? "Redirecionando..." : "Desbloquear resultado — R$ 9,90"}
          </button>
          <p className="text-xs text-gray-400">🔒 Pagamento seguro via PIX</p>
        </div>

        {/* Disabled TabBar */}
        <div className="overflow-x-auto">
          <div className="rounded-xl bg-gray-100 p-1 flex gap-1 min-w-max w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium opacity-50 whitespace-nowrap text-gray-500"
                style={{ cursor: "not-allowed" }}
              >
                <span>{tab.title}</span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor(sectionStatuses[tab.id]) }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          · Análise ATS · Resultados gerados por IA
        </p>

      </div>
    </main>
  );
}

// ─── Result View ──────────────────────────────────────────────────────────────

type TabId = "skills" | "summary" | "dates" | "impact" | "contact";

const TABS: { id: TabId; title: string }[] = [
  { id: "skills", title: "Skills" },
  { id: "summary", title: "Resumo Profissional" },
  { id: "dates", title: "Datas" },
  { id: "impact", title: "Frases de Impacto" },
  { id: "contact", title: "Contato" },
];

function ResultView({
  result,
  analysisTime,
  onReset,
  onLogout,
  token,
}: {
  result: any;
  analysisTime: string;
  onReset: () => void;
  onLogout: () => void;
  token: string | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("skills");

  const skillsScore = getScore(result.skills);
  const summaryScore = getScore(result.summary);
  const datesScore = getScore(result.dates);
  const impactScore = getScore(result.impact);
  const contactScore = getScore(result.contact);

  const overallScore = Math.round(
    skillsScore * 0.3 +
    summaryScore * 0.25 +
    datesScore * 0.15 +
    impactScore * 0.15 +
    contactScore * 0.15
  );

  const sectionStatuses: Record<TabId, BackendStatus> = {
    skills: getStatus(result.skills),
    summary: getStatus(result.summary),
    dates: getStatus(result.dates),
    impact: getStatus(result.impact),
    contact: getStatus(result.contact),
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              ← Nova Análise
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout} className="gap-1.5">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
          <div className="text-right">
            <p className="text-xs tracking-widest uppercase text-gray-400 font-medium">Análise ATS</p>
            <h1 className="text-lg font-bold text-gray-900">Health Check do Currículo</h1>
          </div>
        </div>

        {/* Score + section pills */}
        <div className="flex flex-col items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-8">
          <RadialScore score={overallScore} />
        </div>

        {/* TabBar */}
        <div className="overflow-x-auto">
          <div className="rounded-xl bg-gray-100 p-1 flex gap-1 min-w-max w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span>{tab.title}</span>
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor(sectionStatuses[tab.id]) }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
          {activeTab === "skills" && <SkillsTab skills={result.skills} />}
          {activeTab === "summary" && <SummaryTab summary={result.summary} />}
          {activeTab === "dates" && <DatesTab dates={result.dates} />}
          {activeTab === "impact" && <ImpactTab impact={result.impact} />}
          {activeTab === "contact" && <ContactTab contact={result.contact} />}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          · Análise ATS · Resultados gerados por IA
        </p>

      </div>

      {result.analysis_id && (
        <FeedbackWidget analysisId={result.analysis_id} token={token} />
      )}
    </main>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>("loading_session");
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [analysisTime, setAnalysisTime] = useState("");
  const [inputError, setInputError] = useState("");
  const initialized = useRef(false);

  // Restaurar sessão e resultado pendente do localStorage ao montar
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const stored = localStorage.getItem("ats_token");
    console.log(">>> PAGE INIT: token exists:", !!stored);
    if (stored) {
      setToken(stored);
      const pending = localStorage.getItem("ats_pending_result");
      console.log(">>> PAGE INIT: pending exists:", !!pending);
      if (pending) {
        const parsed = JSON.parse(pending);
        console.log(">>> PAGE INIT: parsed keys:", Object.keys(parsed));
        console.log(">>> PAGE INIT: paywall_active:", parsed.paywall_active);
        localStorage.removeItem("ats_pending_result");
        setResult(parsed);
        setAppState("result");
        console.log(">>> PAGE INIT: state set to result");
      } else {
        const currentAnalysisId = localStorage.getItem("ats_current_analysis");
        console.log(">>> PAGE INIT: current_analysis exists:", !!currentAnalysisId);
        if (currentAnalysisId) {
          fetch(`${API_URL}/api/analysis/${currentAnalysisId}`, {
            headers: { Authorization: `Bearer ${stored}` },
          })
            .then((res) => {
              if (!res.ok) throw new Error("not found");
              return res.json();
            })
            .then((data) => {
              if (data.paywall_active === false) {
                console.log(">>> PAGE INIT: restored analysis from server");
                setResult(data);
                setAppState("result");
              } else {
                localStorage.removeItem("ats_current_analysis");
                setAppState("input");
              }
            })
            .catch(() => {
              console.log(">>> PAGE INIT: analysis not found, clearing");
              localStorage.removeItem("ats_current_analysis");
              setAppState("input");
            });
        } else {
          setAppState("input");
          console.log(">>> PAGE INIT: state set to input");
        }
      }
    }
  }, []);

  function handleAuth(newToken: string) {
    localStorage.setItem("ats_token", newToken);
    setToken(newToken);
    setAppState("input");
  }

  function handleLogout() {
    localStorage.removeItem("ats_token");
    localStorage.removeItem("ats_current_analysis");
    setToken(null);
    setResult(null);
    setAnalysisTime("");
    setAppState("auth");
  }

  async function handleSubmit(file: File, jobText: string) {
    setInputError("");
    setAppState("loading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_description", jobText);

      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) { handleLogout(); return; }
      if (res.status === 400 || res.status === 429) {
        const data = await res.json();
        setInputError(data.detail || "Erro na análise. Tente novamente.");
        setAppState("input");
        return;
      }
      if (!res.ok) throw new Error("Erro na análise");

      const data = await res.json();
      if (data.analysis_id) localStorage.setItem("ats_current_analysis", data.analysis_id);
      setAnalysisTime(new Date().toLocaleString("pt-BR"));
      setResult(data);
      setAppState("result");
    } catch {
      setAppState("input");
    }
  }

  function handleReset() {
    localStorage.removeItem("ats_current_analysis");
    setResult(null);
    setAnalysisTime("");
    setAppState("input");
  }

  if (appState === "loading_session") return <main className="min-h-screen bg-white" />;

  return (
    <>
      <RoadmapWidget />
      {appState === "auth" && <AuthForm onAuth={handleAuth} />}
      {appState === "loading" && <LoadingView />}
      {appState === "result" && result && result.paywall_active && (
        <PaywallView
          preview={result.preview}
          analysisId={result.analysis_id}
          token={token}
          onReset={handleReset}
          onLogout={handleLogout}
        />
      )}
      {appState === "result" && result && !result.paywall_active && (
        <ResultView result={result} analysisTime={analysisTime} onReset={handleReset} onLogout={handleLogout} token={token} />
      )}
      {(appState === "input" || (appState === "result" && !result)) && (
        <InputView onSubmit={handleSubmit} onLogout={handleLogout} apiError={inputError} onClearApiError={() => setInputError("")} />
      )}
    </>
  );
}
