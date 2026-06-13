/**
 * Import des données dans Supabase (Postgres).
 *
 * Parse `data/raw` puis upserte groupes / deputes / scrutins. Conçu pour être
 * idempotent et relançable quotidiennement :
 *  - les colonnes open data sont mises à jour ;
 *  - la curation éditoriale des scrutins (is_important, important_label,
 *    important_rank) est PRÉSERVÉE — l'import ne l'écrase jamais.
 *
 * Génère aussi l'asset statique de la carte (data/generated/departements-svg.json).
 *
 * Requiert la variable d'environnement DATABASE_URL (connexion Postgres Supabase).
 */
import { join } from "node:path";
import postgres from "postgres";
import { parseOpenData } from "./lib/parse.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const RAW = join(ROOT, "data", "raw");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("✗ DATABASE_URL manquante (connexion Postgres Supabase).");
  process.exit(1);
}

// max:1 pour un import séquentiel : évite de saturer l'authentification du pooler.
const sql = postgres(DATABASE_URL, { ssl: "require", prepare: false, max: 1, connect_timeout: 15 });

const CHUNK = 500;
async function upsertChunks(table, rows, columns, conflict, updateColumns) {
  const setClause = updateColumns.map((c) => `${c} = excluded.${c}`).join(", ");
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    await sql`
      insert into ${sql(table)} ${sql(slice, ...columns)}
      on conflict (${sql(conflict)}) do update set ${sql.unsafe(setClause)}
    `;
  }
}

async function main() {
  const t0 = Date.now();
  console.log("→ Parsing de l'open data…");
  const { groupes, deputes, scrutins } = parseOpenData(RAW);

  console.log(`→ Upsert ${groupes.length} groupes…`);
  await upsertChunks(
    "groupes",
    groupes,
    ["id", "nom", "abrege", "couleur", "ordre", "actif", "membres"],
    "id",
    ["nom", "abrege", "couleur", "ordre", "actif", "membres"]
  );

  console.log(`→ Upsert ${deputes.length} députés…`);
  const deputeRows = deputes.map((d) => ({
    id: d.id,
    civ: d.civ,
    prenom: d.prenom,
    nom: d.nom,
    date_nais: d.dateNais,
    profession: d.profession,
    groupe_id: d.groupe,
    departement: d.departement,
    num_departement: d.numDepartement,
    circo: d.circo,
    email: d.email,
    tel: d.tel,
    mandat_debut: d.mandatDebut,
    participation: d.participation,
    nb_votes: d.nbVotes,
    votes: sql.json(d.votes),
  }));
  const deputeCols = Object.keys(deputeRows[0]);
  await upsertChunks(
    "deputes",
    deputeRows,
    deputeCols,
    "id",
    deputeCols.filter((c) => c !== "id")
  );

  console.log(`→ Upsert ${scrutins.length} scrutins (curation préservée)…`);
  const scrutinRows = scrutins.map((s) => ({
    numero: s.numero,
    uid: s.uid,
    date: s.date,
    titre: s.titre,
    sort: s.sort,
    type: s.type,
    type_libelle: s.typeLibelle,
    pour: s.pour,
    contre: s.contre,
    abst: s.abst,
    nv: s.nv,
    exprimes: s.exprimes,
    demandeur: s.demandeur,
    type_majorite: s.typeMajorite,
    suffrages_requis: s.suffragesRequis,
    ventilation: sql.json(s.ventilation),
  }));
  const scrutinCols = Object.keys(scrutinRows[0]);
  // is_important / important_label / important_rank ne sont PAS dans la liste
  // de mise à jour : la curation reste intacte à chaque rafraîchissement.
  await upsertChunks(
    "scrutins",
    scrutinRows,
    scrutinCols,
    "numero",
    scrutinCols.filter((c) => c !== "numero")
  );

  console.log(`✓ Import terminé en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await sql.end();
}

main().catch(async (err) => {
  console.error("✗ Échec de l'import :", err.message);
  await sql.end().catch(() => {});
  process.exit(1);
});
