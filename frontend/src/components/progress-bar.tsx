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

export function SectionProgressBar({ title, score }: { title: string; score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className={`text-sm font-bold ${scoreTextColor(safe)}`}>{safe}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safe}%`, backgroundColor: barColor(safe) }}
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
