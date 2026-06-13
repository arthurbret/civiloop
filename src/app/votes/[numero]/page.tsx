import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeputes, getGroupes, getScrutinDetail, type Position } from "@/lib/data";
import { formatDate, titreScrutin, POSITION_LABEL } from "@/lib/format";
import { Card, CardTitle, SortBadge } from "@/components/ui";
import VoteBreakdown, { type BreakdownGroupe } from "@/components/VoteBreakdown";
import { ArrowLeftIcon, CheckSquareIcon, UsersIcon } from "@/components/icons";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const d = await getScrutinDetail(Number(numero));
  return { title: d ? `Scrutin n°${d.n} — ${titreScrutin(d.titre).slice(0, 80)}` : "Scrutin" };
}

const POSITIONS: { code: Position; couleur: string; bg: string }[] = [
  { code: "P", couleur: "text-pour", bg: "bg-pour" },
  { code: "C", couleur: "text-contre", bg: "bg-contre" },
  { code: "A", couleur: "text-abstention", bg: "bg-abstention" },
  { code: "N", couleur: "text-nv", bg: "bg-nv" },
];

export default async function VotePage({ params }: { params: Promise<{ numero: string }> }) {
  const { numero } = await params;
  const detail = await getScrutinDetail(Number(numero));
  if (!detail) notFound();

  const s = detail;
  const ventilation = detail.ventilation;
  const [groupes, deputesList] = await Promise.all([getGroupes(), getDeputes()]);
  const deputes = new Map(deputesList.map((d) => [d.id, d]));
  const totaux = { P: s.pour, C: s.contre, A: s.abst, N: s.nv };

  const ventilationTriee = [...ventilation].sort(
    (a, b) => (groupes[a.organeRef]?.ordre ?? 99) - (groupes[b.organeRef]?.ordre ?? 99)
  );

  // Données sérialisables pour le détail nominatif (composant client)
  const breakdown: BreakdownGroupe[] = ventilationTriee.map((g) => {
    const info = groupes[g.organeRef];
    return {
      id: g.organeRef,
      nom: info?.nom ?? "Groupe",
      couleur: info?.couleur ?? "#999",
      pour: g.pour,
      contre: g.contre,
      abst: g.abst,
      listes: POSITIONS.map(({ code }) => ({
        code,
        votants: g.votants[code].map((id: string) => {
          const dep = deputes.get(id);
          return { id, name: dep ? `${dep.prenom} ${dep.nom}` : null };
        }),
      })),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/votes" className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon /> Tous les votes
      </Link>

      {/* En-tête */}
      <Card className="flex flex-col gap-4 p-8">
        <div className="flex flex-wrap items-center gap-3">
          <SortBadge sort={s.sort} />
          <span className="text-[13px] text-muted-foreground">
            {s.typeLibelle} · {formatDate(s.date)}
          </span>
          <span className="ml-auto text-2xl font-extrabold tracking-tight">n°{s.n}</span>
        </div>
        <h1 className="max-w-3xl text-2xl font-extrabold leading-snug tracking-tight">{titreScrutin(s.titre)}</h1>
        <p className="text-[13px] text-muted-foreground">
          {detail.demandeur && <>Demandé par {detail.demandeur} · </>}
          {detail.typeMajorite}
          {(detail.suffragesRequis ?? 0) > 0 && <> ({detail.suffragesRequis} voix requises)</>}
        </p>
      </Card>

      {/* Totaux */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {POSITIONS.map(({ code, couleur, bg }) => {
          const part = s.exprimes + s.nv > 0 ? (totaux[code] / (s.pour + s.contre + s.abst + s.nv)) * 100 : 0;
          return (
            <Card key={code} dashed className="flex flex-col gap-2 p-5">
              <span className={`text-[13px] font-bold uppercase tracking-wide ${couleur}`}>
                {POSITION_LABEL[code]}
                {code === "A" ? "s" : code === "N" ? "s" : ""}
              </span>
              <span className="text-3xl font-extrabold tracking-tight">{totaux[code]}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-nv-bg">
                <div className={`h-full rounded-full ${bg}`} style={{ width: `${part}%` }} />
              </div>
            </Card>
          );
        })}
      </section>

      {/* Par groupe */}
      <Card className="p-6">
        <CardTitle icon={<UsersIcon />}>Le vote par groupe</CardTitle>
        <ul className="mt-5 flex flex-col gap-4">
          {ventilationTriee.map((g) => {
            const info = groupes[g.organeRef];
            const total = g.pour + g.contre + g.abst || 1;
            return (
              <li key={g.organeRef} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex items-center gap-2 text-[14px] font-bold">
                    <span className="h-3 w-3 rounded-full" style={{ background: info?.couleur ?? "#999" }} />
                    {info?.nom ?? "Groupe"}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {g.pour} pour · {g.contre} contre · {g.abst} abst. · {g.nv} NV
                  </span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-nv-bg">
                  <div className="bg-pour" style={{ width: `${(g.pour / total) * 100}%` }} />
                  <div className="bg-abstention" style={{ width: `${(g.abst / total) * 100}%` }} />
                  <div className="bg-contre" style={{ width: `${(g.contre / total) * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 text-[12px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-pour" /> Pour</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-abstention" /> Abstention</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-contre" /> Contre</span>
        </div>
      </Card>

      {/* Détail nominatif */}
      <Card className="p-6">
        <CardTitle icon={<CheckSquareIcon />}>Le vote de chaque député</CardTitle>
        <VoteBreakdown groupes={breakdown} />
      </Card>
    </div>
  );
}
