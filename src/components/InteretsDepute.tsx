import { getInteretsDepute } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { Card, CardTitle } from "@/components/ui";
import { ScaleIcon, ExternalLinkIcon } from "@/components/icons";

/**
 * Carte « Activités et intérêts déclarés » : restitue, à partir de l'open data
 * de la HATVP, ce que le·la député·e fait en dehors de son mandat (activités
 * professionnelles, consultant, participations, fonctions bénévoles, autres
 * mandats). Données déclaratives officielles, sourcées et reliées à la
 * déclaration d'origine — aucune IA, aucune interprétation.
 */
export default async function InteretsDepute({ id }: { id: string }) {
  const interets = await getInteretsDepute(id);

  // Pas de déclaration publiée (souvent un·e élu·e récent·e) : on le dit clairement.
  if (!interets) {
    return (
      <Card className="p-6">
        <CardTitle icon={<ScaleIcon className="text-muted-foreground" />}>Activités et intérêts déclarés</CardTitle>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Aucune déclaration d&apos;intérêts et d&apos;activités n&apos;est disponible dans l&apos;open data de la{" "}
          <a href="https://www.hatvp.fr/open-data/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            HATVP
          </a>{" "}
          pour ce·tte député·e (déclaration non encore publiée ou élu·e récemment).
        </p>
      </Card>
    );
  }

  const actives = interets.rubriques.filter((r) => !r.neant);
  const neant = interets.rubriques.filter((r) => r.neant).map((r) => r.titre);

  return (
    <Card className="p-6">
      <CardTitle icon={<ScaleIcon className="text-pour" />}>Activités et intérêts déclarés</CardTitle>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        Activités et intérêts hors mandat, tels que déclarés par le·la député·e à la HATVP.
      </p>

      {actives.length > 0 ? (
        <div className="mt-5 flex flex-col gap-5">
          {actives.map((r) => (
            <section key={r.cle}>
              <h3 className="text-[13px] font-bold text-foreground">{r.titre}</h3>
              <ul className="mt-2 flex flex-col gap-2.5">
                {r.items.map((it, i) => (
                  <li key={i} className="border-l-2 border-border pl-3">
                    <p className="text-[14px] leading-snug text-foreground">{it.description}</p>
                    {(it.employeur || it.dates || it.montant) && (
                      <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[12px] text-muted-foreground">
                        {it.employeur && <span>{it.employeur}</span>}
                        {it.dates && <span>· {it.dates}</span>}
                        {it.montant && <span>· {it.montant}</span>}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[14px] leading-relaxed text-foreground">
          Aucune activité ni aucun intérêt déclaré dans les rubriques concernées (« néant »).
        </p>
      )}

      {actives.length > 0 && neant.length > 0 && (
        <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-semibold">Néant déclaré :</span> {neant.join(", ").toLowerCase()}.
        </p>
      )}

      <p className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
        Source : Haute Autorité pour la transparence de la vie publique (HATVP) — déclaration d&apos;intérêts et
        d&apos;activités{interets.dateDepot ? ` déposée le ${formatDate(interets.dateDepot)}` : ""}
        {interets.modificative ? " (modificative)" : ""}. Montants tels que déclarés.
      </p>
      <a
        href={interets.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-pour hover:underline"
      >
        Consulter la déclaration officielle
        <ExternalLinkIcon className="size-3.5" />
      </a>
    </Card>
  );
}
