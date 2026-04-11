"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type EvidenceStatus = "success" | "warning" | "error";

export const STATUS_CFG = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    text: "text-emerald-700",
    icon: "✓",
    color: "#10b981",
    badgeLabel: "OK",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    text: "text-amber-700",
    icon: "⚠",
    color: "#f59e0b",
    badgeLabel: "Atenção",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-800 border border-red-200",
    text: "text-red-700",
    icon: "✕",
    color: "#ef4444",
    badgeLabel: "Crítico",
  },
};

interface EvidenceCardProps {
  status: EvidenceStatus;
  label: string;
  message: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  softError?: boolean;
  badgeLabel?: string;
}

export function EvidenceCard({
  status,
  label,
  message,
  children,
  defaultOpen = false,
  softError = false,
  badgeLabel,
}: EvidenceCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const cfg = softError && status === "error" ? STATUS_CFG["warning"] : STATUS_CFG[status];
  const resolvedBadgeLabel = badgeLabel ?? cfg.badgeLabel;
  const expandable = !!children;

  return (
    <div
      className={`rounded-xl border ${cfg.bg} ${cfg.border} overflow-hidden transition-all duration-200`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 ${expandable ? "cursor-pointer select-none" : ""}`}
        onClick={() => expandable && setIsOpen((v) => !v)}
      >
        {/* Status icon */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: cfg.color }}
        >
          {cfg.icon}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{label}</p>
          <p className={`text-xs mt-0.5 ${cfg.text}`}>{message}</p>
        </div>

        {/* Right: badge + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
            {resolvedBadgeLabel}
          </span>
          {expandable && (
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </div>

      {expandable && isOpen && (
        <div className={`border-t ${cfg.border}`}>{children}</div>
      )}
    </div>
  );
}

type EvidenceItem = string | { value: string; context: string };

// Dark evidence block used inside expandable cards
export function EvidenceBlock({ items }: { items: EvidenceItem[] }) {
  if (!items.length) return null;
  return (
    <div className="bg-gray-950 rounded-lg mx-3 my-3 px-4 py-3 space-y-1">
      {items.map((item, i) => {
        if (typeof item === "string") {
          return (
            <p key={i} className="font-mono text-sm">
              <span className="text-emerald-500">→ </span>
              <span className="text-emerald-300 font-bold">{item}</span>
            </p>
          );
        }
        return (
          <p key={i} className="font-mono text-sm">
            <span className="text-emerald-500">→ </span>
            <span className="text-emerald-300 font-bold">{item.value}</span>
            {item.context && (
              <>
                <span className="text-gray-400"> — </span>
                <span className="text-gray-400 font-normal">{item.context}</span>
              </>
            )}
          </p>
        );
      })}
    </div>
  );
}

// Suggestion hint card (amber) used inside impact phrases without impact
export function SuggestionBlock({ text }: { text: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg mx-3 mb-3 px-3 py-2">
      <p className="text-xs text-amber-700">💡 {text}</p>
    </div>
  );
}
