"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Depute, Groupe } from "@/lib/data";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchIcon } from "@/components/icons";

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function initiales(d: Depute) {
  return `${d.prenom[0] ?? ""}${d.nom[0] ?? ""}`.toUpperCase();
}

export default function DeputesExplorer({
  deputes,
  groupes,
  photoBase,
}: {
  deputes: Depute[];
  groupes: Groupe[];
  photoBase: string;
}) {
  const [q, setQ] = useState("");
  const [groupe, setGroupe] = useState<string | null>(null);

  const filtres = useMemo(() => {
    const needle = normalize(q.trim());
    return deputes.filter((d) => {
      if (groupe && d.groupe !== groupe) return false;
      if (!needle) return true;
      return (
        normalize(`${d.prenom} ${d.nom}`).includes(needle) ||
        (d.departement && normalize(d.departement).includes(needle))
      );
    });
  }, [deputes, q, groupe]);

  const couleurs = useMemo(() => new Map(groupes.map((g) => [g.id, g.couleur])), [groupes]);
  const abreges = useMemo(() => new Map(groupes.map((g) => [g.id, g.abrege])), [groupes]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-3 p-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom ou département…"
            className="h-11 rounded-xl pl-10 text-[14px]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={!groupe ? "default" : "outline"}
            size="sm"
            className="rounded-full text-[12px] font-bold"
            onClick={() => setGroupe(null)}
          >
            Tous
          </Button>
          {groupes.map((g) => (
            <Button
              key={g.id}
              variant={groupe === g.id ? "default" : "outline"}
              size="sm"
              className="rounded-full text-[12px] font-bold"
              onClick={() => setGroupe(groupe === g.id ? null : g.id)}
            >
              <span className="size-2 rounded-full" style={{ background: g.couleur }} />
              {g.abrege} <span className="font-semibold opacity-60">{g.membres}</span>
            </Button>
          ))}
        </div>
      </Card>

      <p className="text-[13px] text-muted-foreground">{filtres.length} député·es</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtres.map((d) => (
          <Link key={d.id} href={`/deputes/${d.id}`}>
            <Card dashed className="flex h-full flex-col items-center gap-2.5 p-5 text-center transition-colors hover:border-foreground/30">
              <Avatar className="size-20 border border-border">
                <AvatarImage src={`${photoBase}/${d.id.replace(/^PA/, "")}.jpg`} alt={`${d.prenom} ${d.nom}`} />
                <AvatarFallback className="text-sm font-semibold">{initiales(d)}</AvatarFallback>
              </Avatar>
              <span className="text-[14px] font-bold leading-tight">
                {d.civ} {d.prenom} {d.nom}
              </span>
              <span className="text-[12px] font-bold" style={{ color: couleurs.get(d.groupe ?? "") ?? "#999" }}>
                {abreges.get(d.groupe ?? "") ?? "—"}
              </span>
              <span className="text-[12px] text-muted-foreground">{d.departement ?? ""}</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
