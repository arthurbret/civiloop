/** Jauge semi-circulaire (taux de participation) comme sur la maquette. */
export default function Gauge({
  value,
  couleur = "#8bc34a",
  className = "",
}: {
  value: number; // 0–100
  couleur?: string;
  className?: string;
}) {
  const W = 240;
  const H = 132;
  const cx = W / 2;
  const cy = H - 8;
  const r = 100;
  const stroke = 18;

  const arc = (from: number, to: number) => {
    // angles en degrés, 180 = gauche, 0 = droite
    const a1 = (Math.PI * from) / 180;
    const a2 = (Math.PI * to) / 180;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy - r * Math.sin(a2);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };

  const end = 180 - (180 * Math.min(Math.max(value, 0), 100)) / 100;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <path d={arc(180, 0)} fill="none" stroke="#efedea" strokeWidth={stroke} strokeLinecap="round" />
        {value > 0 && (
          <path d={arc(180, end)} fill="none" stroke={couleur} strokeWidth={stroke} strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex items-end justify-center pb-1">
        <span className="text-4xl font-extrabold tracking-tight">{value}%</span>
      </div>
    </div>
  );
}
