import { getCarte } from "@/lib/carte";

/**
 * Carte des départements métropolitains. Le département `highlight`
 * est rempli avec `couleur` (couleur du groupe du député).
 * Les députés d'outre-mer / hors métropole n'ont pas de tracé : la carte
 * s'affiche alors entièrement neutre (le libellé du département suffit).
 */
export default function FranceMap({
  highlight,
  couleur = "#7b3ff2",
  className = "",
}: {
  highlight?: string | null;
  couleur?: string;
  className?: string;
}) {
  const { viewBox, departements } = getCarte();
  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label="Carte de France des départements">
      {departements.map((dep) => (
        <path
          key={dep.code}
          d={dep.d}
          fill={dep.code === highlight ? couleur : "#e8e6e2"}
          stroke="#ffffff"
          strokeWidth="1"
        >
          <title>{dep.nom}</title>
        </path>
      ))}
    </svg>
  );
}
