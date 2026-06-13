"use client";

import Link from "next/link";
import type { Position } from "@/lib/data";
import { POSITION_LABEL } from "@/lib/format";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type BreakdownVotant = { id: string; name: string | null };
export type BreakdownGroupe = {
  id: string;
  nom: string;
  couleur: string;
  pour: number;
  contre: number;
  abst: number;
  listes: { code: Position; votants: BreakdownVotant[] }[];
};

const POSITION_COLOR: Record<Position, string> = {
  P: "text-pour",
  C: "text-contre",
  A: "text-abstention",
  N: "text-nv",
};

/** Détail nominatif d'un scrutin, groupe par groupe (Accordion shadcn). */
export default function VoteBreakdown({ groupes }: { groupes: BreakdownGroupe[] }) {
  return (
    <Accordion className="mt-4 gap-2">
      {groupes.map((g) => (
        <AccordionItem key={g.id} value={g.id} className="rounded-xl border border-dashed border-border">
          <AccordionTrigger className="px-5 py-3.5 text-[14px] font-bold hover:no-underline">
            <span className="flex flex-wrap items-center gap-2.5">
              <span className="size-3 rounded-full" style={{ background: g.couleur }} />
              {g.nom}
              <span className="text-[12px] font-semibold text-muted-foreground">
                ({g.pour} pour · {g.contre} contre · {g.abst} abst.)
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-5">
            <div className="flex flex-col gap-4 pt-1">
              {g.listes
                .filter((l) => l.votants.length > 0)
                .map((l) => (
                  <div key={l.code}>
                    <p className={`mb-1.5 text-[12px] font-bold tracking-wide uppercase ${POSITION_COLOR[l.code]}`}>
                      {POSITION_LABEL[l.code]} ({l.votants.length})
                    </p>
                    <p className="text-[13px] leading-relaxed">
                      {l.votants.map((v, i) => (
                        <span key={v.id}>
                          {i > 0 && " · "}
                          {v.name ? (
                            <Link href={`/deputes/${v.id}`} className="hover:underline">
                              {v.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">Ancien député</span>
                          )}
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
