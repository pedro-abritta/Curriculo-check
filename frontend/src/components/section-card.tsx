"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/progress-bar";

type Status = "green" | "yellow" | "red";

const STATUS_CONFIG: Record<Status, { label: string; classes: string }> = {
  green: {
    label: "Bom",
    classes: "text-green-700 bg-green-50 border border-green-200",
  },
  yellow: {
    label: "Atenção",
    classes: "text-yellow-700 bg-yellow-50 border border-yellow-200",
  },
  red: {
    label: "Crítico",
    classes: "text-red-700 bg-red-50 border border-red-200",
  },
};

interface SectionCardProps {
  icon: string;
  title: string;
  score: number;
  status: Status;
  children?: React.ReactNode;
}

export function SectionCard({
  icon,
  title,
  score,
  status,
  children,
}: SectionCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { label, classes } = STATUS_CONFIG[status];

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">{score}%</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${classes}`}>
            {label}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-100">
          <div className="pt-4">
            <ProgressBar score={score} />
          </div>
          {children ?? (
            <p className="text-sm text-gray-400 mt-4">Detalhes em breve...</p>
          )}
        </div>
      )}
    </Card>
  );
}
