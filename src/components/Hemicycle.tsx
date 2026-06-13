import type { Groupe } from "@/lib/data";

/**
 * Hémicycle en SVG : 577 sièges répartis en arcs concentriques.
 * Les sièges sont triés par angle (gauche → droite) puis attribués aux
 * groupes dans l'ordre politique, comme un diagramme parlementaire.
 *
 * - `highlight` : seul ce groupe est coloré (fiche député), le reste en gris.
 * - sinon : composition complète, chaque groupe dans sa couleur.
 */
export default function Hemicycle({
  groupes,
  highlight,
  className = "",
}: {
  groupes: Groupe[];
  highlight?: string;
  className?: string;
}) {
  const total = groupes.reduce((s, g) => s + g.membres, 0);
  const ordered = [...groupes].sort((a, b) => a.ordre - b.ordre);

  // Génération des sièges : rangées concentriques, densité ∝ rayon
  const W = 400;
  const H = 210;
  const cx = W / 2;
  const cy = H - 6;
  const rows = 12;
  const rInner = 70;
  const rOuter = 190;
  const seatR = 3.4;

  const weights = Array.from({ length: rows }, (_, i) => rInner + ((rOuter - rInner) * i) / (rows - 1));
  const weightSum = weights.reduce((s, w) => s + w, 0);
  let counts = weights.map((w) => Math.round((total * w) / weightSum));
  let diff = total - counts.reduce((s, c) => s + c, 0);
  for (let i = 0; diff !== 0; i = (i + 1) % rows) {
    counts[i] += Math.sign(diff);
    diff -= Math.sign(diff);
  }

  const seats: { x: number; y: number; angle: number }[] = [];
  weights.forEach((r, i) => {
    const n = counts[i];
    for (let j = 0; j < n; j++) {
      const angle = Math.PI - (Math.PI * (j + 0.5)) / n; // π (gauche) → 0 (droite)
      seats.push({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle), angle });
    }
  });
  seats.sort((a, b) => b.angle - a.angle);

  // Attribution des sièges aux groupes, de gauche à droite
  const fills: string[] = [];
  for (const g of ordered) {
    const color = highlight ? (g.id === highlight ? g.couleur : "#e2e0dc") : g.couleur;
    for (let i = 0; i < g.membres; i++) fills.push(color);
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label="Hémicycle de l'Assemblée nationale">
      {seats.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={seatR} fill={fills[i] ?? "#e2e0dc"} />
      ))}
    </svg>
  );
}
