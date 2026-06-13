import Link from "next/link";
import type { Position, ScrutinIndex } from "@/lib/data";
import { titreScrutin, formatDate } from "@/lib/format";
import { Card, PositionBadge, SortBadge } from "./ui";

/**
 * Carte « vote » façon maquette : titre + n° + badge.
 * - `position` : badge POUR/CONTRE/… (fiche député)
 * - sinon : badge Adopté/Rejeté (listes générales)
 */
export default function VoteCard({
  scrutin,
  position,
  showDate = false,
  className = "",
}: {
  scrutin: ScrutinIndex;
  position?: Position;
  showDate?: boolean;
  className?: string;
}) {
  return (
    <Link href={`/votes/${scrutin.n}`} className={`block ${className}`}>
      <Card dashed className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-foreground/30">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-bold leading-snug">
            {titreScrutin(scrutin.titre).slice(0, 130)}
            {scrutin.titre.length > 130 ? "…" : ""}
          </p>
          <span className="whitespace-nowrap text-lg font-extrabold tracking-tight">n°{scrutin.n}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          {position ? <PositionBadge position={position} /> : <SortBadge sort={scrutin.sort} />}
          {showDate && <span className="text-[13px] text-muted-foreground">{formatDate(scrutin.date)}</span>}
        </div>
      </Card>
    </Link>
  );
}
