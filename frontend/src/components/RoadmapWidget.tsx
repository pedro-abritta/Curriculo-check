"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { SHOW_ROADMAP } from "@/lib/config";

const ITEMS = [
  {
    badge: "Planejado",
    badgeClass: "bg-indigo-100 text-indigo-800",
    title: "Validação inteligente de currículo",
    description:
      "Identificar automaticamente se o arquivo enviado é realmente um currículo ou um documento aleatório. (já faz análise de prompt injection)",
  },
  {
    badge: "Planejado",
    badgeClass: "bg-indigo-100 text-indigo-800",
    title: "Validação de descrição da vaga",
    description:
      "Verificar se o texto inserido é uma descrição de vaga real ou apenas um texto qualquer. (já faz análise de prompt injection)",
  },
  {
    badge: "Análise",
    badgeClass: "bg-amber-100 text-amber-800",
    title: "Análise de currículo independente",
    description:
      "Possibilidade de analisar apenas o currículo, sem necessidade de uma descrição de vaga para comparação.",
  },
];

export function RoadmapWidget() {
  const [open, setOpen] = useState(false);

  if (!SHOW_ROADMAP) return null;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Side panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-semibold text-gray-900 text-base">
              🚀 Próximas funcionalidades
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Estamos trabalhando para melhorar sua experiência
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-3 mt-0.5 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className="py-4 border-b border-gray-100 last:border-b-0"
            >
              <span
                className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 ${item.badgeClass}`}
              >
                {item.badge}
              </span>
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {item.title}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center px-5 py-4 border-t border-gray-100 flex-shrink-0">
          Tem uma sugestão? Use o botão de feedback! 💬
        </p>
      </div>

      {/* Floating trigger button — hidden when panel is open */}
      {!open && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div className="flex flex-col items-center gap-1.5 bg-white border border-gray-200 shadow-md hover:shadow-lg transition-shadow rounded-r-xl px-2.5 py-4 select-none">
            <span className="text-base leading-none">🚀</span>
            Em breve
          </div>
        </div>
      )}
    </>
  );
}
