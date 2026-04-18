"use client";

import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Upload, LogOut, AlertTriangle, Search, PenLine, CalendarX, Lightbulb, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialScore } from "@/components/score-ring";
import { SectionProgressBar } from "@/components/progress-bar";
import {
  EvidenceCard,
  EvidenceBlock,
  type EvidenceStatus,
} from "@/components/evidence-card";
import { RoadmapWidget } from "@/components/RoadmapWidget";
import { API_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { AnalysisLoadingSkeleton } from "@/components/ui/analysis-loading-skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppState = "loading_session" | "input" | "loading" | "result";

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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

function scoreToColor(score: number): string {
  return `hsl(${score * 1.2}, 70%, 50%)`;
}

function passToStatus(s: "pass" | "fail"): EvidenceStatus {
  return s === "pass" ? "success" : "error";
}

function countToStatus(count: number): EvidenceStatus {
  if (count === 0) return "error";
  if (count === 1) return "warning";
  return "success";
}

function isMissingSkill(skill: string, missingList: string[]): boolean {
  return missingList.some((m) => m.toLowerCase() === skill.toLowerCase());
}

// ─── Input View ───────────────────────────────────────────────────────────────

// ─── Validation Error Modal ───────────────────────────────────────────────────

function ValidationErrorModal({
  message,
  isReadableError,
  onClose,
}: {
  message: string;
  isReadableError: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md"
        style={{ animation: "slideUpFade 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pt-6 pb-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-gray-900">Problema com seu currículo</h2>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tips for formatting errors */}
        {isReadableError && (
          <div className="mx-6 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Dicas para corrigir</p>
            <ul className="space-y-1">
              {[
                "Use um modelo de coluna única",
                "Evite imagens ou caixas de texto sobre o conteúdo",
                "Prefira fontes padrão (Arial, Calibri, Times New Roman)",
                "Exporte o arquivo em PDF a partir do Word ou Google Docs",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-amber-700">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            Enviar outro arquivo
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

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
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  }

  const canSubmit = !!file && jobText.trim().length > 0;

  const isReadableError = (apiError ?? "").includes("problemas de formatação");
  const isValidationError =
    isReadableError || (apiError ?? "").includes("não parece ser um currículo");

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      {isValidationError && (
        <ValidationErrorModal
          message={apiError!}
          isReadableError={isReadableError}
          onClose={() => onClearApiError?.()}
        />
      )}
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

        {apiError && !isValidationError && (
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
  return <AnalysisLoadingSkeleton />;
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

function PillarContent({
  found,
  emptyMessage,
  emptyHint,
}: {
  found: unknown[];
  emptyMessage: string;
  emptyHint: string;
}) {
  if (found.length > 0) return <EvidenceBlock items={found as any} />;
  return (
    <div className="px-4 py-3 space-y-1.5">
      <p className="text-sm text-gray-700">{emptyMessage}</p>
      <p className="text-xs text-gray-500">💡 {emptyHint}</p>
    </div>
  );
}

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
            status={countToStatus(pillars.metrics.count)}
            badgeLabel={pillars.metrics.count === 0 ? "Falha" : undefined}
            label="Métricas e Resultados"
            message={
              pillars.metrics.count === 0
                ? "Nenhuma métrica encontrada no resumo"
                : pillars.metrics.count === 1
                ? "1 métrica encontrada no resumo"
                : `${pillars.metrics.count} métricas encontradas no resumo`
            }
          >
            <PillarContent
              found={pillars.metrics.found}
              emptyMessage="Nenhuma métrica foi encontrada no seu resumo profissional."
              emptyHint="Considere adicionar resultados quantificáveis, como percentuais, valores ou prazos."
            />
          </EvidenceCard>

          <EvidenceCard
            status={countToStatus(pillars.skills.count)}
            badgeLabel={pillars.skills.count === 0 ? "Falha" : undefined}
            label="Skills da Vaga no Resumo"
            message={
              pillars.skills.count === 0
                ? "Nenhuma skill da vaga no resumo"
                : pillars.skills.count === 1
                ? "1 skill da vaga mencionada no resumo"
                : `${pillars.skills.count} skills da vaga mencionadas no resumo`
            }
          >
            <PillarContent
              found={pillars.skills.found}
              emptyMessage="Nenhuma skill da vaga foi encontrada no seu resumo profissional."
              emptyHint="Considere mencionar algumas skills relevantes para a vaga."
            />
          </EvidenceCard>

          <EvidenceCard
            status={countToStatus(pillars.impact_verbs.count)}
            badgeLabel={pillars.impact_verbs.count === 0 ? "Falha" : undefined}
            label="Verbos de Impacto"
            message={
              pillars.impact_verbs.count === 0
                ? "Nenhum verbo de impacto encontrado"
                : pillars.impact_verbs.count === 1
                ? "1 verbo de impacto encontrado"
                : `${pillars.impact_verbs.count} verbos de impacto encontrados`
            }
          >
            <PillarContent
              found={pillars.impact_verbs.found}
              emptyMessage="Nenhum verbo de impacto foi encontrado no seu resumo profissional."
              emptyHint="Considere usar verbos de ação como 'desenvolveu', 'liderou', 'aumentou'."
            />
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
      <SectionProgressBar title="Frases de Impacto · Qualidade" score={impact.score ?? 0} />

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

// ─── Tabs (shared between PaywallView and ResultView) ─────────────────────────

type TabId = "skills" | "summary" | "dates" | "impact" | "contact";

const TABS: { id: TabId; title: string }[] = [
  { id: "skills", title: "Skills" },
  { id: "summary", title: "Resumo Profissional" },
  { id: "dates", title: "Datas" },
  { id: "impact", title: "Frases de Impacto" },
  { id: "contact", title: "Contato" },
];

// ─── Paywall View ─────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<TabId>("skills");
  const [paying, setPaying] = useState(false);
  const overallScore: number = preview.overall_score ?? 0;
  const sections = preview.sections ?? {};

  const sectionScores: Record<TabId, number> = {
    skills: sections.skills?.score ?? 0,
    summary: sections.summary?.score ?? 0,
    dates: sections.dates?.score ?? 0,
    impact: sections.impact?.score ?? 0,
    contact: sections.contact?.score ?? 0,
  };

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

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Top bar — idêntico ao ResultView */}
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

        {/* Score ring — sem blur */}
        <div className="flex flex-col items-center gap-4 bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-8">
          <RadialScore score={overallScore} />
        </div>

        {/* TabBar — visual idêntico ao ResultView, clique troca aba ativa */}
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
                  style={{ backgroundColor: scoreToColor(sectionScores[tab.id]) }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo da aba — sempre o card de paywall, nunca detalhes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-7 flex flex-col items-center gap-5 text-center">

          {/* Cabeçalho */}
          <div>
            <h2 className="text-base font-bold text-gray-900">Seu currículo pode estar sendo eliminado automaticamente</h2>
            <p className="mt-1 text-sm text-gray-500">Veja exatamente o que corrigir para passar nos filtros ATS</p>
          </div>

          {/* Itens */}
          <ul className="space-y-3">
            {[
              { Icon: Search,    text: "Skills que a vaga exige e você não mencionou" },
              { Icon: PenLine,   text: "Pontos fracos que fazem recrutadores descartarem seu currículo" },
              { Icon: CalendarX, text: "Erros de formatação que sistemas ATS não perdoam" },
              { Icon: Lightbulb, text: "Sugestões práticas para cada seção do seu currículo" },
              { Icon: BarChart3, text: "Análise detalhada com score por seção" },
            ].map(({ Icon, text }) => (
              <li key={text} className="flex items-center justify-center gap-3">
                <Icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{text}</span>
              </li>
            ))}
          </ul>

          {/* Comparação de preço */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col items-center gap-0.5">
            <span className="text-xs text-gray-400">Consultorias de currículo cobram até</span>
            <span className="text-xl font-semibold text-gray-300 line-through leading-tight">R$ 500,00</span>
            <span className="text-xs text-gray-400 mt-1">Aqui você paga apenas</span>
            <span className="text-2xl font-bold text-indigo-600 leading-tight">R$ 9,90</span>
          </div>

          {/* CTA */}
          <button
            onClick={handleUnlock}
            disabled={paying}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 px-8 transition-colors text-sm"
          >
            {paying ? "Redirecionando..." : "Ver meu resultado completo — R$ 9,90"}
          </button>
          <p className="text-xs text-gray-400 -mt-2">Pagamento seguro via PIX</p>
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
  const [showWarnings, setShowWarnings] = useState(true);

  const warnings: string[] = result.formatting_warnings ?? [];

  const skillsScore = getScore(result.skills);
  const summaryScore = getScore(result.summary);
  const datesScore = getScore(result.dates);
  const impactScore = getScore(result.impact);
  const contactScore = getScore(result.contact);

  const overallScore = result.overall_score ?? Math.round(
    skillsScore * 0.40 +
    summaryScore * 0.25 +
    impactScore * 0.20 +
    datesScore * 0.10 +
    contactScore * 0.05
  );

  const sectionScores: Record<TabId, number> = {
    skills: skillsScore,
    summary: summaryScore,
    dates: datesScore,
    impact: impactScore,
    contact: contactScore,
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

        {/* Formatting warnings banner */}
        {warnings.length > 0 && showWarnings && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-xs font-semibold text-amber-800">Aviso de Formatação</p>
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-700">{w}</p>
              ))}
            </div>
            <button
              onClick={() => setShowWarnings(false)}
              className="flex-shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

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
                  style={{ backgroundColor: scoreToColor(sectionScores[tab.id]) }}
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

    </main>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appState, setAppState] = useState<AppState>("loading_session");
  const [token, setToken] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [analysisTime, setAnalysisTime] = useState("");
  const [inputError, setInputError] = useState("");
  const initialized = useRef(false);
  const sessionRestored = useRef(false);

  async function restoreSession(accessToken: string, email: string, analysisIdFromQuery?: string | null) {
    localStorage.setItem("ats_token", accessToken);
    setToken(accessToken);
    await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Priority 1: analysis_id query param (post-payment redirect)
    if (analysisIdFromQuery) {
      fetch(`${API_URL}/api/analysis/${analysisIdFromQuery}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then((data) => {
          localStorage.setItem("ats_current_analysis", analysisIdFromQuery);
          setResult(data);
          setAppState("result");
        })
        .catch(() => setAppState("input"));
      return;
    }

    const currentAnalysisId = localStorage.getItem("ats_current_analysis");
    if (currentAnalysisId) {
      fetch(`${API_URL}/api/analysis/${currentAnalysisId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("not found");
          return res.json();
        })
        .then((data) => {
          if (data.paywall_active === false) {
            setResult(data);
            setAppState("result");
          } else {
            localStorage.removeItem("ats_current_analysis");
            setAppState("input");
          }
        })
        .catch(() => {
          localStorage.removeItem("ats_current_analysis");
          setAppState("input");
        });
    } else {
      setAppState("input");
    }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const analysisIdFromQuery = searchParams.get("analysis_id");

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        sessionRestored.current = true;
        restoreSession(session.access_token, session.user.email!, analysisIdFromQuery);
      } else {
        const stored = localStorage.getItem("ats_token");
        if (stored) {
          localStorage.removeItem("ats_token");
          localStorage.removeItem("ats_current_analysis");
        }
        router.replace("/");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        if (!sessionRestored.current) {
          sessionRestored.current = true;
          restoreSession(session.access_token, session.user.email!, analysisIdFromQuery);
        } else {
          localStorage.setItem("ats_token", session.access_token);
          setToken(session.access_token);
        }
      } else if (event === "TOKEN_REFRESHED" && session) {
        localStorage.setItem("ats_token", session.access_token);
        setToken(session.access_token);
      } else if (event === "SIGNED_OUT") {
        router.replace("/");
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem("ats_token");
    localStorage.removeItem("ats_current_analysis");
    setToken(null);
    setResult(null);
    setAnalysisTime("");
    router.replace("/");
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
      if (res.status === 400 || res.status === 422 || res.status === 429) {
        const data = await res.json();
        // detail pode ser string (HTTPException) ou array (validação Pydantic)
        const detail = data.detail;
        const message =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail) && detail[0]?.msg
            ? detail[0].msg
            : "Erro na análise. Tente novamente.";
        setInputError(message);
        setAppState("input");
        return;
      }
      if (!res.ok) throw new Error("Erro na análise");

      const data = await res.json();
      if (data.analysis_id) localStorage.setItem("ats_current_analysis", data.analysis_id);
      setAnalysisTime(new Date().toLocaleString("pt-BR"));

      if (!data.paywall_active) {
        // Sem paywall: busca resultado completo via GET
        const fullRes = await fetch(`${API_URL}/api/analysis/${data.analysis_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (fullRes.status === 401) { handleLogout(); return; }
        if (!fullRes.ok) throw new Error("Erro ao buscar resultado");
        const fullData = await fullRes.json();
        setResult(fullData);
      } else {
        setResult(data);
      }
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <DashboardContent />
    </Suspense>
  );
}
