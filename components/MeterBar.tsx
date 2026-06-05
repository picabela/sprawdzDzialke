interface Props {
  value: number;        // 0–100
  color?: string;       // #hex
}

export default function MeterBar({ value, color = '#2D7A4F' }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
