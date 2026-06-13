import Link from "next/link";
import { getGroupesActifs, getScrutinsRecents, getImportantScrutins, getStats } from "@/lib/data";
import { formatDate, titreScrutin } from "@/lib/format";
import { Card, CardTitle, SortBadge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import Hemicycle from "@/components/Hemicycle";
import VoteCard from "@/components/VoteCard";
import { ArrowRightIcon, CheckSquareIcon, LandmarkIcon, UsersIcon } from "@/components/icons";

// Régénérée fréquemment (ISR) : la curation des votes importants et le
// rafraîchissement quotidien des données se reflètent en quasi temps réel.
export const revalidate = 60;

function TotauxBar({ pour, contre, abst }: { pour: number; contre: number; abst: number }) {
  const total = pour + contre + abst || 1;
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-nv-bg">
      <div className="bg-pour" style={{ width: `${(pour / total) * 100}%` }} />
      <div className="bg-abstention" style={{ width: `${(abst / total) * 100}%` }} />
      <div className="bg-contre" style={{ width: `${(contre / total) * 100}%` }} />
    </div>
  );
}

export default async function Home() {
  const [stats, groupes, derniers, importants] = await Promise.all([
    getStats(),
    getGroupesActifs(),
    getScrutinsRecents(6),
    getImportantScrutins(12),
  ]);

  const legende = [...groupes].sort((a, b) => b.membres - a.membres);

  const tiles = [
    { icon: <UsersIcon />, valeur: stats.nbDeputes, label: "députés en exercice" },
    { icon: <CheckSquareIcon />, valeur: stats.nbScrutins.toLocaleString("fr-FR"), label: "scrutins publics" },
    { icon: <LandmarkIcon />, valeur: `${stats.partAdoptes}%`, label: "de textes adoptés" },
    { icon: <UsersIcon />, valeur: `${stats.participationMoyenne}%`, label: "participation aux scrutins solennels" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Hero + stats */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="flex flex-col justify-center gap-4 p-8 lg:col-span-2">
          <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight">
            L'Assemblée nationale, <span className="text-pour">en clair</span>.
          </h1>
          <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Chaque scrutin, chaque député, chaque groupe de la 17<sup>e</sup> législature — à partir des données
            ouvertes officielles de l'Assemblée nationale, mises en forme pour être comprises en un coup d'œil.
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="h-12 rounded-xl px-5 text-[14px] font-bold"
              nativeButton={false}
              render={<Link href="/votes" />}
            >
              Explorer les votes <ArrowRightIcon />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 rounded-xl px-5 text-[14px] font-bold"
              nativeButton={false}
              render={<Link href="/deputes" />}
            >
              Trouver mon député
            </Button>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          {tiles.map((s, i) => (
            <Card key={i} dashed className="flex flex-col justify-center gap-1.5 p-5">
              <span className="text-muted-foreground">{s.icon}</span>
              <span className="text-2xl font-extrabold tracking-tight">{s.valeur}</span>
              <span className="text-[13px] leading-tight text-muted-foreground">{s.label}</span>
            </Card>
          ))}
        </div>
      </section>

      {/* Votes importants + hémicycle */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center gap-2">
            <CheckSquareIcon className="text-muted-foreground" />
            <h2 className="text-[15px] font-bold">Les votes importants</h2>
          </div>
          {importants.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {importants.map((s) => (
                <Link key={s.n} href={`/votes/${s.n}`} className="group block">
                  <Card dashed className="flex h-full flex-col gap-3 p-5 transition-colors hover:border-foreground/30">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] font-bold leading-snug group-hover:underline">
                        {(s.importantLabel ?? titreScrutin(s.titre)).slice(0, 110)}
                        {(s.importantLabel ?? s.titre).length > 110 ? "…" : ""}
                      </p>
                      <span className="whitespace-nowrap text-base font-extrabold tracking-tight">n°{s.n}</span>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                      <TotauxBar pour={s.pour} contre={s.contre} abst={s.abst} />
                      <div className="flex items-center justify-between gap-2 text-[12px] font-semibold">
                        <span className="text-muted-foreground">{formatDate(s.date)}</span>
                        <SortBadge sort={s.sort} />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card dashed className="p-6 text-[14px] text-muted-foreground">
              Aucun vote n'est marqué « important » pour l'instant.
            </Card>
          )}
        </div>
        <Card className="flex flex-col p-6">
          <CardTitle icon={<LandmarkIcon />}>Hémicycle</CardTitle>
          <Hemicycle groupes={groupes} className="mx-auto mt-4 w-full max-w-[340px]" />
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            {legende.map((g) => (
              <li key={g.id} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: g.couleur }} />
                <span className="truncate font-semibold">{g.abrege}</span>
                <span className="ml-auto text-muted-foreground">{g.membres}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* Derniers votes */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">Derniers votes</h2>
          <Link href="/votes" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
            Tous les votes <ArrowRightIcon />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {derniers.map((s) => (
            <VoteCard key={s.n} scrutin={s} showDate />
          ))}
        </div>
      </section>
    </div>
  );
}
