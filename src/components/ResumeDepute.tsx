import { getDeputeResume } from "@/lib/resume";
import { Card, CardTitle } from "@/components/ui";
import { SparklesIcon } from "@/components/icons";

/**
 * Carte « En bref » : résumé du profil politique du député généré par IA
 * (Gemini) à partir de ses votes. Composant serveur asynchrone — à envelopper
 * dans <Suspense fallback={<ResumeSkeleton />}> pour streamer le reste de la
 * page sans attendre le modèle.
 */
export default async function ResumeDepute({ id }: { id: string }) {
  const resume = await getDeputeResume(id);
  if (!resume) return null;

  return (
    <Card className="p-6">
      <CardTitle icon={<SparklesIcon className="text-pour" />}>En bref</CardTitle>
      <p className="mt-3 text-[14px] leading-relaxed text-foreground">{resume}</p>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Résumé généré automatiquement (IA, Gemini) à partir des votes du député — peut comporter des imprécisions.
      </p>
    </Card>
  );
}

export function ResumeSkeleton() {
  return (
    <Card className="p-6">
      <CardTitle icon={<SparklesIcon className="text-pour" />}>En bref</CardTitle>
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </Card>
  );
}
