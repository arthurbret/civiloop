import Link from "next/link";
import { getScrutinsPage } from "@/lib/data";
import { formatDate, titreScrutin } from "@/lib/format";
import { Card, SortBadge } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon } from "@/components/icons";

export const metadata = { title: "Tous les votes" };
export const revalidate = 60;

const PAR_PAGE = 24;

export default async function VotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; type?: string }>;
}) {
  const { page = "1", q = "", type = "" } = await searchParams;

  const p = Math.max(Number(page) || 1, 1);
  const { items: pageItems, total } = await getScrutinsPage({ page: p, perPage: PAR_PAGE, q, type });
  const nbPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  const lien = (np: number) =>
    `/votes?${new URLSearchParams({ ...(q && { q }), ...(type && { type }), page: String(np) })}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight">Les votes</h1>
        <p className="text-[15px] text-muted-foreground">
          {total.toLocaleString("fr-FR")} scrutins publics de la 17<sup>e</sup> législature
        </p>
      </header>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
        <form action="/votes" className="relative flex-1">
          {type && <input type="hidden" name="type" value={type} />}
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher un texte, un n° de scrutin…"
            className="h-11 rounded-xl pl-10 text-[14px]"
          />
        </form>
        <div className="flex gap-2">
          <Button
            variant={!type ? "default" : "outline"}
            className="h-11 rounded-xl px-4 text-[13px] font-semibold"
            nativeButton={false}
            render={<Link href={`/votes${q ? `?q=${encodeURIComponent(q)}` : ""}`} />}
          >
            Tous
          </Button>
          <Button
            variant={type === "solennel" ? "default" : "outline"}
            className="h-11 rounded-xl px-4 text-[13px] font-semibold"
            nativeButton={false}
            render={<Link href={`/votes?type=solennel${q ? `&q=${encodeURIComponent(q)}` : ""}`} />}
          >
            Scrutins solennels
          </Button>
        </div>
      </Card>

      <Card className="divide-y divide-border">
        {pageItems.map((s) => (
          <Link
            key={s.n}
            href={`/votes/${s.n}`}
            className="flex items-center gap-4 px-6 py-4 transition-colors first:rounded-t-(--radius-card) last:rounded-b-(--radius-card) hover:bg-muted"
          >
            <span className="w-16 shrink-0 text-[14px] font-extrabold">n°{s.n}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{titreScrutin(s.titre)}</p>
              <p className="text-[12px] text-muted-foreground">
                {formatDate(s.date)} · {s.typeLibelle} · {s.pour} pour / {s.contre} contre / {s.abst} abst.
              </p>
            </div>
            <SortBadge sort={s.sort} className="shrink-0" />
          </Link>
        ))}
        {pageItems.length === 0 && (
          <p className="px-6 py-10 text-center text-[14px] text-muted-foreground">Aucun scrutin ne correspond à cette recherche.</p>
        )}
      </Card>

      {nbPages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-[14px] font-semibold">
          {p > 1 && (
            <Button variant="outline" size="icon" className="size-10 rounded-full" nativeButton={false} render={<Link href={lien(p - 1)} aria-label="Page précédente" />}>
              <ArrowLeftIcon />
            </Button>
          )}
          <span className="text-muted-foreground">
            Page {p} / {nbPages}
          </span>
          {p < nbPages && (
            <Button variant="outline" size="icon" className="size-10 rounded-full" nativeButton={false} render={<Link href={lien(p + 1)} aria-label="Page suivante" />}>
              <ArrowRightIcon />
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
