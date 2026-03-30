function barColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreTextColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

const STATUS_COLOR: Record<string, string> = {
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
};

const STATUS_TEXT: Record<string, string> = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-red-600",
};

export function SectionProgressBar({
  title,
  score,
  status,
}: {
  title: string;
  score: number;
  status?: "green" | "yellow" | "red";
}) {
  const safe = Math.max(0, Math.min(100, score));
  const color = status ? STATUS_COLOR[status] : barColor(safe);
  const textColor = status ? STATUS_TEXT[status] : scoreTextColor(safe);
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className={`text-sm font-bold ${textColor}`}>{safe}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safe}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// backward compatibility
export function ProgressBar({
  score,
  label = "Compatibilidade com a Vaga",
}: {
  score: number;
  label?: string;
}) {
  return <SectionProgressBar title={label} score={score} />;
}
