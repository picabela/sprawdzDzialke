interface Props {
  score: number;        // 0–100
  label?: string;
  summary?: string;
}

function scoreColor(score: number): string {
  if (score >= 70) return '#166534';
  if (score >= 45) return '#92400e';
  return '#991b1b';
}

export default function ScoreBadge({ score, label, summary }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-5">
      <div
        className="w-20 h-20 rounded-full flex flex-col items-center justify-center flex-shrink-0"
        style={{ backgroundColor: scoreColor(score) }}
      >
        <span className="text-white text-3xl font-bold leading-none">{score}</span>
        <span className="text-white/60 text-xs">/100</span>
      </div>
      {(label || summary) && (
        <div>
          {label && <h3 className="font-semibold text-gray-900 text-lg mb-1">{label}</h3>}
          {summary && <p className="text-gray-500 text-sm leading-relaxed">{summary}</p>}
        </div>
      )}
    </div>
  );
}
