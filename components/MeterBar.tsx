interface Props {
  value: number;        // 0–100
  color?: string;       // #hex
}

export default function MeterBar({ value, color = '#15803d' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1 bg-neutral-100 overflow-hidden">
      <div
        className="h-full transition-all duration-700"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
