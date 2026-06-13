import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCarte,
  getDepute,
  getGroupe,
  getGroupesActifs,
  getImportantScrutins,
  getScrutinsByNumeros,
  getVotesDepute,
  photoUrl,
  type Position,
} from "@/lib/data";
import { age, formatDate, ordinalCirco, titreScrutin } from "@/lib/format";
import { Card, CardTitle, FlagBars, PositionPill } from "@/components/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ResumeDepute, { ResumeSkeleton } from "@/components/ResumeDepute";
import Hemicycle from "@/components/Hemicycle";
import FranceMap from "@/components/FranceMap";
import Gauge from "@/components/Gauge";
import Carousel from "@/components/Carousel";
import VoteCard from "@/components/VoteCard";
import {
  ArrowLeftIcon,
  BriefcaseIcon,
  CakeIcon,
  CheckSquareIcon,
  LandmarkIcon,
  MailIcon,
  MapIcon,
  PhoneIcon,
  PinIcon,
} from "@/components/icons";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await getDepute(id);
  return { title: d ? `${d.civ} ${d.prenom} ${d.nom}` : "Député" };
}

// Codes département AN → codes du GeoJSON ("1" → "01", outre-mer absent de la carte)
function codeCarte(num: string | null) {
  if (!num) return null;
  return num.length === 1 ? `0${num}` : num;
}

export default async function DeputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const depute = await getDepute(id);
  if (!depute) notFound();

  const [groupe, groupes, votes, importants] = await Promise.all([
    getGroupe(depute.groupe),
    getGroupesActifs(),
    getVotesDepute(id),
    getImportantScrutins(),
  ]);
  const positions = new Map<number, Position>(votes);

  // Les 12 derniers votes du député (on ne charge que les scrutins concernés)
  const derniers = votes.slice(0, 12);
  const scrutinsMap = new Map((await getScrutinsByNumeros(derniers.map(([n]) => n))).map((s) => [s.n, s]));
  const derniersVotes = derniers.flatMap(([n, pos]) => {
    const s = scrutinsMap.get(n);
    return s ? [{ scrutin: s, position: pos as Position }] : [];
  });

  // Position du député sur chacun des votes importants (curation DB)
  const positionsImportants = importants.map((s) => ({ scrutin: s, position: positions.get(s.n) }));

  const couleur = groupe?.couleur ?? "#7b3ff2";
  const naissance = depute.dateNais ? `${formatDate(depute.dateNais)} (${age(depute.dateNais)} ans)` : null;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/deputes" className="inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon /> Tous les députés
      </Link>

      <Suspense fallback={<ResumeSkeleton />}>
        <ResumeDepute id={depute.id} />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Photo */}
            <Card className="flex flex-col items-center gap-4 py-7">
              <FlagBars />
              <Avatar className="size-36 border border-border">
                <AvatarImage src={photoUrl(depute.id)} alt={`Portrait de ${depute.prenom} ${depute.nom}`} />
                <AvatarFallback className="text-2xl font-bold">
                  {depute.prenom[0]}
                  {depute.nom[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-1 px-4 text-center">
                <h1 className="text-xl font-extrabold tracking-tight">
                  {depute.civ} {depute.prenom} {depute.nom}
                </h1>
                {groupe && (
                  <p className="text-[15px] font-bold" style={{ color: couleur }}>
                    {groupe.nom}
                  </p>
                )}
              </div>
            </Card>

            {/* Informations */}
            <Card className="p-6">
              <CardTitle>Informations</CardTitle>
              <ul className="mt-4 flex flex-col gap-3.5 text-[14px]">
                {naissance && (
                  <li className="flex items-center gap-3">
                    <CakeIcon className="text-muted-foreground" /> {naissance}
                  </li>
                )}
                {depute.profession && (
                  <li className="flex items-center gap-3">
                    <BriefcaseIcon className="text-muted-foreground" /> {depute.profession}
                  </li>
                )}
                {depute.departement && (
                  <li className="flex items-center gap-3">
                    <PinIcon className="text-muted-foreground" /> {depute.departement} ({ordinalCirco(depute.circo)})
                  </li>
                )}
                {depute.email && (
                  <li className="flex items-center gap-3">
                    <MailIcon className="text-muted-foreground" />
                    <a href={`mailto:${depute.email}`} className="break-all underline underline-offset-2">
                      {depute.email}
                    </a>
                  </li>
                )}
                {depute.tel && (
                  <li className="flex items-center gap-3">
                    <PhoneIcon className="text-muted-foreground" /> {depute.tel.replace(/\s/g, "")}
                  </li>
                )}
                <li className="flex items-center gap-3">
                  <LandmarkIcon className="text-muted-foreground" /> Député depuis le {formatDate(depute.mandatDebut)}
                </li>
              </ul>
            </Card>
          </section>

          {/* Derniers votes */}
          <Card className="p-6">
            <Carousel title="Derniers votes">
              {derniersVotes.map(({ scrutin, position }) => (
                <VoteCard
                  key={scrutin.n}
                  scrutin={scrutin}
                  position={position}
                  className="w-[290px] shrink-0 snap-start"
                />
              ))}
            </Carousel>
          </Card>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Hémicycle */}
            <Card className="p-6">
              <CardTitle icon={<LandmarkIcon />}>Hémicycle</CardTitle>
              <Hemicycle groupes={groupes} highlight={depute.groupe ?? undefined} className="mt-5 w-full" />
              {groupe && (
                <p className="mt-3 text-center text-[12px] text-muted-foreground">
                  Les {groupe.membres} sièges du groupe {groupe.abrege}
                </p>
              )}
            </Card>

            {/* Participation */}
            <Card className="p-6">
              <CardTitle icon={<CheckSquareIcon />}>Taux de participation</CardTitle>
              <Gauge value={depute.participation} className="mx-auto mt-6 max-w-[260px]" />
              <p className="mt-4 text-center text-[12px] leading-relaxed text-muted-foreground">
                Participation aux scrutins solennels depuis le début du mandat.{" "}
                {depute.nbVotes.toLocaleString("fr-FR")} votes exprimés au total, tous scrutins confondus.
              </p>
            </Card>
          </section>
        </div>

        {/* Colonne latérale */}
        <div className="flex flex-col gap-6">
          {positionsImportants.length > 0 && (
            <Card dashed className="p-6">
              <CardTitle icon={<CheckSquareIcon />}>Sur les votes importants</CardTitle>
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {positionsImportants.map(({ scrutin, position }) => (
                  <li key={scrutin.n} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/votes/${scrutin.n}`}
                      className="line-clamp-2 flex-1 text-[13px] font-medium leading-snug hover:underline"
                    >
                      {scrutin.importantLabel ?? titreScrutin(scrutin.titre)}
                    </Link>
                    {position ? (
                      <PositionPill position={position} className="shrink-0" />
                    ) : (
                      <span className="shrink-0 rounded-md bg-nv-bg px-2 py-1 text-[11px] font-bold uppercase text-nv">
                        Abs.
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-dashed border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
                Scrutins identifiés comme importants (forte attention médiatique et citoyenne).
              </p>
            </Card>
          )}

          <Card className="p-6">
            <CardTitle icon={<MapIcon />}>Carte</CardTitle>
            <FranceMap highlight={codeCarte(depute.numDepartement)} couleur={couleur} className="mt-4 w-full" />
            {depute.departement && (
              <p className="mt-2 text-center text-[12px] text-muted-foreground">
                {depute.departement}
                {codeCarte(depute.numDepartement) &&
                !getCarteHasCode(codeCarte(depute.numDepartement)!) ? " (hors carte métropolitaine)" : ""}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function getCarteHasCode(code: string) {
  return getCarte().departements.some((d) => d.code === code);
}
