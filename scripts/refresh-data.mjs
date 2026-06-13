/**
 * Rafraîchissement des données Civiloop
 *
 * Télécharge les dumps open data de l'Assemblée nationale (mis à jour
 * quotidiennement), les décompresse, puis régénère les JSON consommés par
 * l'app (via build-data.mjs).
 *
 * Conçu pour tourner aussi bien en local (`npm run refresh`) que dans le
 * conteneur déployé — sur Coolify, on le branche en « Scheduled Task »
 * quotidienne (voir README). Aucune dépendance système (unzip) requise :
 * la décompression se fait en pur JS via adm-zip.
 */
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import AdmZip from "adm-zip";

const ROOT = new URL("..", import.meta.url).pathname;
const RAW = join(ROOT, "data", "raw");
mkdirSync(RAW, { recursive: true });

const SOURCES = [
  {
    nom: "Scrutins (votes)",
    url: "https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip",
    dest: join(RAW, "scrutins"),
  },
  {
    nom: "Députés & organes (AMO10)",
    url: "https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip",
    dest: join(RAW, "amo"),
  },
];

// Géométrie des départements : statique, téléchargée une seule fois.
const GEOJSON_URL =
  "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-version-simplifiee.geojson";
const GEOJSON_DEST = join(RAW, "departements.geojson");

async function download(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const t0 = Date.now();

  for (const src of SOURCES) {
    process.stdout.write(`↓ ${src.nom}… `);
    const buf = await download(src.url);
    // On repart d'un dossier propre pour éviter les fichiers obsolètes.
    rmSync(src.dest, { recursive: true, force: true });
    mkdirSync(src.dest, { recursive: true });
    new AdmZip(buf).extractAllTo(src.dest, /* overwrite */ true);
    console.log(`${(buf.length / 1e6).toFixed(1)} Mo extraits`);
  }

  if (!existsSync(GEOJSON_DEST)) {
    process.stdout.write("↓ Carte des départements… ");
    writeFileSync(GEOJSON_DEST, await download(GEOJSON_URL));
    console.log("ok");
  }

  console.log("→ Import en base…");
  const build = spawnSync(process.execPath, [join(ROOT, "scripts", "import-db.mjs")], {
    stdio: "inherit",
  });
  if (build.status !== 0) process.exit(build.status ?? 1);

  console.log(`✓ Données à jour en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch((err) => {
  console.error("✗ Échec du rafraîchissement :", err.message);
  process.exit(1);
});
