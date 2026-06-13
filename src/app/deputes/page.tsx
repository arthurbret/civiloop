import { getDeputes, getGroupesActifs } from "@/lib/data";
import DeputesExplorer from "./DeputesExplorer";

export const metadata = { title: "Les députés" };

// Régénérée toutes les heures (ISR) pour refléter le rafraîchissement quotidien.
export const revalidate = 3600;

export default async function DeputesPage() {
  const [deputes, groupesActifs] = await Promise.all([getDeputes(), getGroupesActifs()]);
  const groupes = [...groupesActifs].sort((a, b) => b.membres - a.membres);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Les députés</h1>
        <p className="text-[15px] text-muted-foreground">
          {deputes.length} député·es en exercice — 17<sup>e</sup> législature
        </p>
      </header>
      <DeputesExplorer
        deputes={deputes}
        groupes={groupes}
        photoBase="https://www2.assemblee-nationale.fr/static/tribun/17/photos"
      />
    </div>
  );
}
