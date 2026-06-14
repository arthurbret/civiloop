/**
 * Parsing de l'open data HATVP — déclarations d'intérêts et d'activités (DIA).
 *
 * Source : https://www.hatvp.fr/open-data/ (licence Etalab)
 *   - data/raw/hatvp/declarations.xml : contenu complet de toutes les déclarations
 *   - data/raw/hatvp/liste.csv        : index (nom, mandat, lien vers la page officielle)
 *
 * On ne retient que les déclarations de DÉPUTÉS (codTypeMandatFichier === "depute"),
 * et uniquement les rubriques décrivant l'activité HORS MANDAT. Aucune interprétation :
 * on restitue des faits déclarés, sourcés, avec le lien vers la déclaration officielle.
 *
 * Exclu volontairement : activités du conjoint (sensible), collaborateurs parlementaires
 * (noms de tiers) et observations en texte libre.
 *
 * Utilisé par scripts/import-db.mjs. Le rapprochement avec les 577 députés (par nom +
 * date de naissance) est fait côté import.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";

const HATVP_BASE = "https://www.hatvp.fr";
const PLACEHOLDER = /\[Données non publiées\]/g;

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** Normalise un nom/prénom pour le rapprochement : majuscules, sans accents ni ponctuation. */
export const normName = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

/** Nettoie une valeur texte : retire les marqueurs HATVP, espaces superflus, « néant ». */
function clean(s) {
  if (s == null) return undefined;
  const t = String(s).replace(PLACEHOLDER, "").replace(/\s+/g, " ").trim();
  if (!t || /^n[ée]ant$/i.test(t)) return undefined;
  return t;
}

/** "23/01/1972" → "1972-01-23" (ISO, pour comparer à date_nais). */
function frToIso(s) {
  const p = clean(s)?.split("/");
  if (!p || p.length !== 3) return null;
  const [d, m, y] = p;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** "17/09/2025 14:18:22" → { iso: "2025-09-17", ts: <number> }. */
function parseDepot(s) {
  const [date, heure = "00:00:00"] = String(s ?? "").trim().split(" ");
  const [d, m, y] = date.split("/");
  if (!d || !m || !y) return { iso: null, ts: 0 };
  const [hh, mm, ss] = heure.split(":").map(Number);
  return {
    iso: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
    ts: new Date(+y, +m - 1, +d, hh || 0, mm || 0, ss || 0).getTime(),
  };
}

/** Période lisible à partir de dates MM/YYYY. */
function periode(debut, fin) {
  const d = clean(debut);
  const f = clean(fin);
  if (d && f) return `${d} – ${f}`;
  if (d) return `depuis ${d}`;
  if (f) return `jusqu'à ${f}`;
  return undefined;
}

const formatEuros = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString("fr-FR")} €` : undefined;
};

/** Dernier montant connu d'une rémunération (année la plus récente). */
function dernierMontant(remun) {
  const montants = asArray(remun?.montant?.montant).filter((x) => x?.annee && x?.montant != null);
  if (!montants.length) return undefined;
  const latest = montants.sort((a, b) => Number(b.annee) - Number(a.annee))[0];
  const euros = formatEuros(latest.montant);
  return euros ? `${euros} (${latest.annee})` : undefined;
}

// Rubriques retenues, dans l'ordre d'affichage. Pour chaque DTO : titre lisible,
// champ description, champ employeur/structure, présence de dates et de rémunération.
const RUBRIQUES = [
  { cle: "activProfCinqDerniereDto", titre: "Activités professionnelles (5 dernières années)", desc: "description", emp: "employeur", dates: true, remun: true },
  { cle: "activConsultantDto", titre: "Activités de consultant", desc: "description", emp: "nomEmployeur", dates: true, remun: true },
  { cle: "participationDirigeantDto", titre: "Participations à des organes dirigeants", desc: "activite", emp: "nomSociete", dates: true, remun: true },
  { cle: "participationFinanciereDto", titre: "Participations financières (capital de sociétés)", desc: "nomSociete", financiere: true },
  { cle: "fonctionBenevoleDto", titre: "Fonctions bénévoles", desc: "descriptionActivite", emp: "nomStructure" },
  { cle: "mandatElectifDto", titre: "Autres mandats électifs", desc: "descriptionMandat", dates: true, remun: true },
];

/** Construit une rubrique normalisée { cle, titre, neant, items } à partir d'un DTO. */
function buildRubrique(decl, cfg) {
  const dto = decl[cfg.cle];
  const items = [];
  for (const it of asArray(dto?.items?.items)) {
    const description = clean(it[cfg.desc]);
    if (!description) continue;
    const item = { description };
    if (cfg.emp) {
      const e = clean(it[cfg.emp]);
      if (e) item.employeur = e;
    }
    if (cfg.dates) {
      const p = periode(it.dateDebut, it.dateFin);
      if (p) item.dates = p;
    }
    const montant = cfg.financiere
      ? formatEuros(it.evaluation) && `Évaluation : ${formatEuros(it.evaluation)}`
      : cfg.remun
        ? dernierMontant(it.remuneration)
        : undefined;
    if (montant) item.montant = montant;
    items.push(item);
  }
  return { cle: cfg.cle, titre: cfg.titre, neant: items.length === 0, items };
}

/** Index nom+prénom → URL de la page nominative officielle, à partir de liste.csv. */
function lireUrlsDossiers(rawDir) {
  const map = new Map();
  const csvPath = join(rawDir, "hatvp", "liste.csv");
  if (!existsSync(csvPath)) return map;
  for (const line of readFileSync(csvPath, "utf8").split("\n")) {
    if (!line.includes(";depute;")) continue; // colonne type_mandat
    const cols = line.split(";"); // prenom=1, nom=2 (avant la colonne qualité, donc non décalés)
    const key = `${normName(cols[2])}|${normName(cols[1])}`;
    const dossier = line.match(/\/pages_nominatives\/[^;]+/)?.[0];
    if (dossier && !map.has(key)) map.set(key, HATVP_BASE + dossier);
  }
  return map;
}

/**
 * Parse les déclarations d'intérêts et d'activités des députés.
 * Renvoie un tableau (plusieurs déclarations possibles par personne : la sélection
 * de la plus récente est faite au moment du rapprochement, côté import).
 */
export function parseHatvp(rawDir) {
  const xmlPath = join(rawDir, "hatvp", "declarations.xml");
  if (!existsSync(xmlPath)) {
    console.warn("[hatvp] declarations.xml absent — étape HATVP ignorée.");
    return [];
  }
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });
  const root = parser.parse(readFileSync(xmlPath, "utf8"));
  const urlByName = lireUrlsDossiers(rawDir);

  const out = [];
  for (const d of asArray(root?.declarations?.declaration)) {
    const g = d.general;
    if (g?.qualiteMandat?.codTypeMandatFichier !== "depute") continue;
    if (g?.typeDeclaration?.id !== "DIA") continue;

    const dec = g.declarant ?? {};
    const nom = clean(dec.nom);
    const prenom = clean(dec.prenom);
    if (!nom || !prenom) continue;

    const key = `${normName(nom)}|${normName(prenom)}`;
    const depot = parseDepot(d.dateDepot);
    out.push({
      key,
      nom,
      prenom,
      dateNaissance: frToIso(dec.dateNaissance),
      departement: clean(g.organe?.labelOrgane),
      dateDepot: depot.iso,
      dateDepotTs: depot.ts,
      modificative: g.declarationModificative === "true" || g.declarationModificative === true,
      sourceUrl: urlByName.get(key) ?? `${HATVP_BASE}/open-data/`,
      rubriques: RUBRIQUES.map((cfg) => buildRubrique(d, cfg)),
    });
  }
  return out;
}

const tokensOf = (s) => new Set(normName(s).split(" ").filter(Boolean));

/** Charge utile stockée en base : on jette les champs internes de rapprochement. */
const payload = (h) => ({
  sourceUrl: h.sourceUrl,
  dateDepot: h.dateDepot,
  modificative: h.modificative,
  rubriques: h.rubriques,
});

/**
 * Rapproche les déclarations HATVP des députés (par nom + date de naissance).
 * Renvoie une Map(id du député → charge utile à stocker). Conçu pour zéro faux
 * positif : on ne rapproche jamais sur la seule date de naissance (deux personnes
 * peuvent la partager) ni sur le seul nom (homonymes).
 *
 * @param {{id:string,nom:string,prenom:string,dateNais:string|null}[]} deputes
 * @param {ReturnType<typeof parseHatvp>} declarations
 */
export function rapprocherHatvp(deputes, declarations) {
  const byKey = new Map();
  for (const h of declarations) (byKey.get(h.key) ?? byKey.set(h.key, []).get(h.key)).push(h);
  const declToks = declarations.map((h) => ({ h, toks: tokensOf(h.nom) }));
  const recente = (cands) => cands.slice().sort((a, b) => b.dateDepotTs - a.dateDepotTs)[0];

  const result = new Map();
  for (const d of deputes) {
    // Passe A : nom + prénom exacts ; si homonymes, départage par date de naissance.
    const key = `${normName(d.nom)}|${normName(d.prenom)}`;
    let cands = byKey.get(key) ?? [];
    if (cands.length > 1 && d.dateNais) {
      const f = cands.filter((c) => c.dateNaissance === d.dateNais);
      if (f.length) cands = f;
    }
    // Passe B : date de naissance + au moins un nom de famille en commun, et une
    // seule personne candidate (rattrape noms composés, noms d'épouse, prénoms d'usage).
    if (!cands.length && d.dateNais) {
      const dToks = tokensOf(d.nom);
      const hits = declToks.filter(
        ({ h, toks }) => h.dateNaissance === d.dateNais && [...toks].some((t) => dToks.has(t))
      );
      if (new Set(hits.map((x) => x.h.key)).size === 1) cands = hits.map((x) => x.h);
    }
    if (cands.length) result.set(d.id, payload(recente(cands)));
  }
  return result;
}
