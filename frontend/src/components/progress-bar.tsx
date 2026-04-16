function scoreToColor(score: number): string {
  return `hsl(${score * 1.2}, 70%, 50%)`;
}

export function SectionProgressBar({
  title,
  score,
}: {
  title: string;
  score: number;
}) {
  const safe = Math.max(0, Math.min(100, score));
  const color = scoreToColor(safe);
  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-sm font-bold" style={{ color }}>{safe}%</span>
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
