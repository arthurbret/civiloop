import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { groupes as tGroupes, deputes as tDeputes, scrutins as tScrutins } from "./schema";

export type { Position, VoteTuple, VentilationGroupe } from "./schema";
import type { VoteTuple, VentilationGroupe } from "./schema";
export { getCarte } from "./carte";
export type { Departement } from "./carte";

/* ---------------- Types app ---------------- */

export type Groupe = {
  id: string;
  nom: string;
  abrege: string;
  couleur: string;
  ordre: number;
  actif: boolean;
  membres: number;
};

export type Depute = {
  id: string;
  civ: string | null;
  prenom: string;
  nom: string;
  dateNais: string | null;
  profession: string | null;
  groupe: string | null;
  departement: string | null;
  numDepartement: string | null;
  circo: string | null;
  email: string | null;
  tel: string | null;
  mandatDebut: string | null;
  participation: number;
  nbVotes: number;
};

export type ScrutinIndex = {
  n: number;
  uid: string;
  date: string;
  titre: string;
  sort: string;
  type: string | null;
  typeLibelle: string | null;
  pour: number;
  contre: number;
  abst: number;
  nv: number;
  exprimes: number;
};

export type ScrutinImportant = ScrutinIndex & { importantLabel: string | null; importantRank: number | null };

export type ScrutinFull = ScrutinIndex & {
  demandeur: string | null;
  typeMajorite: string | null;
  suffragesRequis: number | null;
  ventilation: VentilationGroupe[];
  isImportant: boolean;
  importantLabel: string | null;
  importantRank: number | null;
};

/* ---------------- Colonnes réutilisées ---------------- */

const indexCols = {
  n: tScrutins.n,
  uid: tScrutins.uid,
  date: tScrutins.date,
  titre: tScrutins.titre,
  sort: tScrutins.sort,
  type: tScrutins.type,
  typeLibelle: tScrutins.typeLibelle,
  pour: tScrutins.pour,
  contre: tScrutins.contre,
  abst: tScrutins.abst,
  nv: tScrutins.nv,
  exprimes: tScrutins.exprimes,
};

const deputeCols = {
  id: tDeputes.id,
  civ: tDeputes.civ,
  prenom: tDeputes.prenom,
  nom: tDeputes.nom,
  dateNais: tDeputes.dateNais,
  profession: tDeputes.profession,
  groupe: tDeputes.groupe,
  departement: tDeputes.departement,
  numDepartement: tDeputes.numDepartement,
  circo: tDeputes.circo,
  email: tDeputes.email,
  tel: tDeputes.tel,
  mandatDebut: tDeputes.mandatDebut,
  participation: tDeputes.participation,
  nbVotes: tDeputes.nbVotes,
};

/* ---------------- Groupes ---------------- */

export async function getGroupesActifs(): Promise<Groupe[]> {
  return db.select().from(tGroupes).where(eq(tGroupes.actif, true)).orderBy(asc(tGroupes.ordre));
}

export async function getGroupes(): Promise<Record<string, Groupe>> {
  const rows = await db.select().from(tGroupes);
  return Object.fromEntries(rows.map((g) => [g.id, g]));
}

export async function getGroupe(id: string | null): Promise<Groupe | null> {
  if (!id) return null;
  const [g] = await db.select().from(tGroupes).where(eq(tGroupes.id, id)).limit(1);
  return g ?? null;
}

/* ---------------- Députés ---------------- */

export async function getDeputes(): Promise<Depute[]> {
  return db.select(deputeCols).from(tDeputes).orderBy(asc(tDeputes.nom));
}

export async function getDepute(id: string): Promise<Depute | null> {
  const [d] = await db.select(deputeCols).from(tDeputes).where(eq(tDeputes.id, id)).limit(1);
  return d ?? null;
}

export async function getVotesDepute(id: string): Promise<VoteTuple[]> {
  const [d] = await db.select({ votes: tDeputes.votes }).from(tDeputes).where(eq(tDeputes.id, id)).limit(1);
  return d?.votes ?? [];
}

/* ---------------- Scrutins ---------------- */

export async function getScrutinsRecents(limit = 6): Promise<ScrutinIndex[]> {
  return db.select(indexCols).from(tScrutins).orderBy(desc(tScrutins.n)).limit(limit);
}

export async function getScrutin(numero: number): Promise<ScrutinIndex | null> {
  const [s] = await db.select(indexCols).from(tScrutins).where(eq(tScrutins.n, numero)).limit(1);
  return s ?? null;
}

export async function getScrutinsByNumeros(numeros: number[]): Promise<ScrutinIndex[]> {
  if (numeros.length === 0) return [];
  return db.select(indexCols).from(tScrutins).where(inArray(tScrutins.n, numeros));
}

export async function getScrutinsPage(opts: {
  page: number;
  perPage: number;
  q?: string;
  type?: string;
}): Promise<{ items: ScrutinIndex[]; total: number }> {
  const filters = [];
  if (opts.type === "solennel") filters.push(eq(tScrutins.type, "SPS"));
  if (opts.q?.trim()) {
    const num = Number(opts.q.trim());
    const byNum = Number.isInteger(num) ? eq(tScrutins.n, num) : undefined;
    filters.push(or(ilike(tScrutins.titre, `%${opts.q.trim()}%`), byNum));
  }
  const where = filters.length ? and(...filters) : undefined;
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(tScrutins)
    .where(where);
  const items = await db
    .select(indexCols)
    .from(tScrutins)
    .where(where)
    .orderBy(desc(tScrutins.n))
    .limit(opts.perPage)
    .offset((opts.page - 1) * opts.perPage);
  return { items, total };
}

// Votes « importants » : curation éditoriale (is_important), pilotée en base et
// reflétée en quasi temps réel sur le site (voir `revalidate` des pages).
export async function getImportantScrutins(limit = 12): Promise<ScrutinImportant[]> {
  return db
    .select({ ...indexCols, importantLabel: tScrutins.importantLabel, importantRank: tScrutins.importantRank })
    .from(tScrutins)
    .where(eq(tScrutins.isImportant, true))
    .orderBy(asc(sql`coalesce(${tScrutins.importantRank}, 2147483647)`), desc(tScrutins.n))
    .limit(limit);
}

export async function getScrutinDetail(numero: number): Promise<ScrutinFull | null> {
  const [s] = await db.select().from(tScrutins).where(eq(tScrutins.n, numero)).limit(1);
  return s ?? null;
}

/* ---------------- Statistiques (agrégats SQL) ---------------- */

export async function getStats(): Promise<{
  nbDeputes: number;
  nbScrutins: number;
  partAdoptes: number;
  participationMoyenne: number;
}> {
  const [dep] = await db
    .select({
      n: sql<number>`count(*)::int`,
      part: sql<number>`coalesce(round(avg(${tDeputes.participation})), 0)::int`,
    })
    .from(tDeputes);
  const [scr] = await db
    .select({
      n: sql<number>`count(*)::int`,
      adoptes: sql<number>`coalesce(round(avg((${tScrutins.sort} = 'adopté')::int) * 100), 0)::int`,
    })
    .from(tScrutins);
  return { nbDeputes: dep.n, nbScrutins: scr.n, partAdoptes: scr.adoptes, participationMoyenne: dep.part };
}

/* ---------------- Divers ---------------- */

export function photoUrl(id: string) {
  return `https://www2.assemblee-nationale.fr/static/tribun/17/photos/${id.replace(/^PA/, "")}.jpg`;
}
