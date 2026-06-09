interface Props {
  score: number;        // 0–100
  label?: string;
  summary?: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#15803d';
  if (score >= 45) return '#d97706';
  return '#dc2626';
}

export default function ScoreBadge({ score, label, summary }: Props) {
  return (
    <div className="border border-neutral-200 bg-white p-6 flex items-start gap-6">
      <div
        className="w-20 h-20 flex flex-col items-center justify-center flex-shrink-0 text-white"
        style={{ backgroundColor: scoreColor(score) }}
      >
        <span className="text-3xl font-bold leading-none">{score}</span>
        <span className="text-white/60 text-xs mt-1">/100</span>
      </div>
      {(label || summary) && (
        <div>
          {label && <h3 className="font-semibold text-neutral-900 text-lg mb-1">{label}</h3>}
          {summary && <p className="text-neutral-500 text-sm leading-relaxed">{summary}</p>}
        </div>
      )}
    </div>
  );
}
