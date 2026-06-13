import Link from "next/link";
import { Card as ShadcnCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/data";
import { POSITION_LABEL } from "@/lib/format";
import { CheckIcon, XIcon, MinusIcon } from "./icons";

/**
 * Carte « bento » : on s'appuie sur la primitive shadcn <Card> (data-slot,
 * fond, overflow) en neutralisant son espacement interne pour garder la main
 * sur le padding, et on applique le rayon généreux + l'option bordure pointillée
 * propres à la maquette.
 */
export function Card({
  children,
  className = "",
  dashed = false,
}: {
  children: React.ReactNode;
  className?: string;
  dashed?: boolean;
}) {
  return (
    <ShadcnCard
      className={cn(
        "gap-0 rounded-(--radius-card) border py-0 ring-0",
        dashed
          ? "border-dashed border-border bg-card"
          : "border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.03)]",
        className
      )}
    >
      {children}
    </ShadcnCard>
  );
}

/** Intitulé de section (icône + libellé) tel qu'utilisé dans les blocs bento. */
export function CardTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
      {icon}
      {children}
    </h2>
  );
}

const POSITION_STYLE: Record<Position, string> = {
  P: "bg-pour text-white",
  C: "bg-contre text-white",
  A: "bg-abstention text-white",
  N: "bg-nv text-white",
};

const POSITION_ICON: Record<Position, React.ReactNode> = {
  P: <CheckIcon />,
  C: <XIcon />,
  A: <MinusIcon />,
  N: <MinusIcon />,
};

/** Badge de position de vote (POUR / CONTRE / …), bâti sur le Badge shadcn. */
export function PositionBadge({ position, className = "" }: { position: Position; className?: string }) {
  return (
    <Badge
      className={cn(
        "h-auto gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-bold tracking-wide uppercase [&>svg]:size-4",
        POSITION_STYLE[position],
        className
      )}
    >
      {POSITION_ICON[position]}
      {POSITION_LABEL[position]}
    </Badge>
  );
}

const POSITION_SOFT: Record<Position, string> = {
  P: "bg-pour-bg text-pour",
  C: "bg-contre-bg text-contre",
  A: "bg-abstention-bg text-abstention",
  N: "bg-nv-bg text-nv",
};

/** Variante compacte du badge de position (listes denses), couleurs douces. */
export function PositionPill({ position, className = "" }: { position: Position; className?: string }) {
  return (
    <Badge
      className={cn(
        "h-auto gap-1 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase [&>svg]:size-3.5",
        POSITION_SOFT[position],
        className
      )}
    >
      {POSITION_ICON[position]}
      {POSITION_LABEL[position]}
    </Badge>
  );
}

/** Badge de résultat d'un scrutin (Adopté / Rejeté), bâti sur le Badge shadcn. */
export function SortBadge({ sort, className = "" }: { sort: string; className?: string }) {
  const adopte = sort === "adopté";
  return (
    <Badge
      className={cn(
        "h-auto gap-1.5 rounded-lg px-3 py-1 text-[13px] font-bold [&>svg]:size-4",
        adopte ? "bg-pour-bg text-pour" : "bg-contre-bg text-contre",
        className
      )}
    >
      {adopte ? <CheckIcon /> : <XIcon />}
      {adopte ? "Adopté" : "Rejeté"}
    </Badge>
  );
}

export function GroupeTag({ nom, couleur, href }: { nom: string; couleur: string; href?: string }) {
  const inner = (
    <span className="text-[15px] font-bold" style={{ color: couleur }}>
      {nom}
    </span>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// Bandeau tricolore décoratif (bleu-blanc-rouge) au-dessus de la photo.
// Dégradé à bandes nettes : pas de sous-éléments, rendu déterministe.
export function FlagBars() {
  return (
    <div className="flex justify-center">
      <span
        className="h-1.5 w-32 rounded-full border border-border"
        style={{
          background:
            "linear-gradient(to right, #000091 0 33.333%, #ffffff 33.333% 66.666%, #E1000F 66.666% 100%)",
        }}
      />
    </div>
  );
}
