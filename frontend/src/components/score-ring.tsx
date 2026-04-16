function scoreConfig(score: number) {
  const color = `hsl(${score * 1.2}, 70%, 50%)`;
  if (score >= 71)
    return { color, label: "Excelente", badge: "bg-emerald-100 text-emerald-800" };
  if (score >= 41)
    return { color, label: "Moderado", badge: "bg-amber-100 text-amber-800" };
  return { color, label: "Crítico", badge: "bg-red-100 text-red-800" };
}

export function RadialScore({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, score));
  const r = 68;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - safe / 100);
  const cfg = scoreConfig(safe);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: 160, height: 160 }}>
        <svg width="160" height="160" className="block">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={cfg.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 leading-none">{safe}</span>
          <span className="text-xs text-gray-400 font-medium mt-0.5">/100</span>
        </div>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.badge}`}>
        {cfg.label}
      </span>
    </div>
  );
}
