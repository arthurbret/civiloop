/**
 * Parsing des dumps open data de l'Assemblée nationale.
 *
 * Transforme `data/raw` (scrutins + AMO10) en structures prêtes à insérer :
 *   - groupes  : groupes politiques (couleur, effectif…)
 *   - deputes  : 577 députés, avec leur historique de vote (votes: [[numero, position]])
 *   - scrutins : tous les scrutins, avec la ventilation nominative par groupe
 *
 * Utilisé par scripts/import-db.mjs. La géométrie de la carte (statique) est
 * gérée à part par buildMapSvg().
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { geoConicConformal, geoPath } from "d3-geo";

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Ordre politique gauche → droite (pour l'hémicycle)
const ORDRE_POLITIQUE = ["GDR", "LFI-NFP", "ECOS", "SOC", "LIOT", "DEM", "EPR", "HOR", "DR", "UDR", "RN", "NI"];
const POS = { pours: "P", contres: "C", abstentions: "A", nonVotants: "N" };

export function parseOpenData(rawDir) {
  /* ---------- Groupes ---------- */
  const organeDir = join(rawDir, "amo/json/organe");
  const groupes = {};
  for (const f of readdirSync(organeDir)) {
    const o = readJson(join(organeDir, f)).organe;
    if (o.codeType !== "GP" || o.legislature !== "17") continue;
    const abrev = o.libelleAbrev === "UDDPLR" ? "UDR" : o.libelleAbrev;
    groupes[o.uid] = {
      id: o.uid,
      nom: o.libelle,
      abrege: o.libelleAbrege,
      couleur: o.couleurAssociee || "#999999",
      ordre: ORDRE_POLITIQUE.indexOf(abrev) === -1 ? 50 : ORDRE_POLITIQUE.indexOf(abrev),
      actif: !o.viMoDe?.dateFin,
      membres: 0,
    };
  }

  /* ---------- Députés actifs ---------- */
  const acteurDir = join(rawDir, "amo/json/acteur");
  const deputes = [];
  for (const f of readdirSync(acteurDir)) {
    const a = readJson(join(acteurDir, f)).acteur;
    const id = a.uid["#text"] ?? a.uid;
    const mandats = asArray(a.mandats?.mandat);

    const mAss = mandats
      .filter((m) => m.typeOrgane === "ASSEMBLEE" && m.legislature === "17" && !m.dateFin)
      .sort((x, y) => (x.dateDebut < y.dateDebut ? 1 : -1))[0];
    if (!mAss) continue;

    const mGp = mandats.find((m) => m.typeOrgane === "GP" && m.legislature === "17" && !m.dateFin);
    const groupeId = mGp?.organes?.organeRef ?? null;
    if (groupeId && groupes[groupeId]) groupes[groupeId].membres++;

    const adresses = asArray(a.adresses?.adresse);
    const email =
      adresses.find((x) => x.type === "15" && /assemblee-nationale\.fr/.test(x.valElec ?? ""))?.valElec ??
      adresses.find((x) => x.type === "15")?.valElec ?? null;
    const tel = adresses.find((x) => x.type === "11")?.valElec ?? null;
    const lieu = mAss.election?.lieu ?? {};

    deputes.push({
      id,
      civ: a.etatCivil?.ident?.civ ?? "",
      prenom: a.etatCivil?.ident?.prenom ?? "",
      nom: a.etatCivil?.ident?.nom ?? "",
      dateNais: a.etatCivil?.infoNaissance?.dateNais ?? null,
      profession: a.profession?.libelleCourant?.trim() || null,
      groupe: groupeId && groupes[groupeId] ? groupeId : null,
      departement: lieu.departement ?? null,
      numDepartement: lieu.numDepartement ?? null,
      circo: lieu.numCirco ?? null,
      email,
      tel,
      mandatDebut: mAss.dateDebut,
      participation: 0,
      nbVotes: 0,
      votes: [],
    });
  }
  const deputeIndex = new Map(deputes.map((d) => [d.id, d]));

  /* ---------- Scrutins + ventilation + historiques ---------- */
  const scrutinDir = join(rawDir, "scrutins/json");
  const scrutins = [];
  const votesParDepute = new Map();

  for (const f of readdirSync(scrutinDir)) {
    const s = readJson(join(scrutinDir, f)).scrutin;
    const numero = Number(s.numero);
    const dec = s.syntheseVote?.decompte ?? {};

    const ventilation = [];
    for (const g of asArray(s.ventilationVotes?.organe?.groupes?.groupe)) {
      const dn = g.vote?.decompteNominatif ?? {};
      const dv = g.vote?.decompteVoix ?? {};
      const votants = { P: [], C: [], A: [], N: [] };
      for (const [key, code] of Object.entries(POS)) {
        for (const v of asArray(dn[key]?.votant)) {
          votants[code].push(v.acteurRef);
          const dep = deputeIndex.get(v.acteurRef);
          if (dep) {
            if (!votesParDepute.has(v.acteurRef)) votesParDepute.set(v.acteurRef, []);
            votesParDepute.get(v.acteurRef).push([numero, code]);
          }
        }
      }
      ventilation.push({
        organeRef: g.organeRef,
        nombreMembres: Number(g.nombreMembresGroupe ?? 0),
        position: g.vote?.positionMajoritaire ?? "",
        pour: Number(dv.pour ?? 0),
        contre: Number(dv.contre ?? 0),
        abst: Number(dv.abstentions ?? 0),
        nv: Number(dv.nonVotants ?? 0),
        votants,
      });
    }

    scrutins.push({
      numero,
      uid: s.uid,
      date: s.dateScrutin,
      titre: (s.titre ?? s.objet?.libelle ?? "").replace(/\s+/g, " ").trim(),
      sort: s.sort?.code ?? "",
      type: s.typeVote?.codeTypeVote ?? "",
      typeLibelle: s.typeVote?.libelleTypeVote ?? "",
      pour: Number(dec.pour ?? 0),
      contre: Number(dec.contre ?? 0),
      abst: Number(dec.abstentions ?? 0),
      nv: Number(dec.nonVotants ?? 0),
      exprimes: Number(s.syntheseVote?.suffragesExprimes ?? 0),
      demandeur: s.demandeur?.texte ?? null,
      typeMajorite: s.typeVote?.typeMajorite ?? null,
      suffragesRequis: Number(s.syntheseVote?.nbrSuffragesRequis ?? 0),
      ventilation,
    });
  }
  scrutins.sort((a, b) => b.numero - a.numero);

  /* ---------- Participation (sur les scrutins solennels) ---------- */
  const datesSolennels = scrutins.filter((s) => s.type === "SPS").map((s) => s.date).sort();
  const solennelsSet = new Set(scrutins.filter((s) => s.type === "SPS").map((s) => s.numero));
  const nbSolennelsDepuis = (date) => {
    let lo = 0, hi = datesSolennels.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (datesSolennels[mid] < date) lo = mid + 1;
      else hi = mid;
    }
    return datesSolennels.length - lo;
  };

  for (const d of deputes) {
    const votes = (votesParDepute.get(d.id) ?? []).sort((a, b) => b[0] - a[0]);
    d.votes = votes;
    d.nbVotes = votes.filter(([, p]) => p !== "N").length;
    const exprimesSolennels = votes.filter(([n, p]) => p !== "N" && solennelsSet.has(n)).length;
    const total = nbSolennelsDepuis(d.mandatDebut);
    d.participation = total ? Math.round((exprimesSolennels / total) * 100) : 0;
  }
  deputes.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return { groupes: Object.values(groupes), deputes, scrutins };
}

/** Génère les tracés SVG des départements métropolitains (asset statique). */
export function buildMapSvg(rawDir) {
  const geo = readJson(join(rawDir, "departements.geojson"));
  const projection = geoConicConformal().rotate([-3, 0]).center([0, 46.5]).fitSize([520, 520], geo);
  const path = geoPath(projection);
  return {
    viewBox: "0 0 520 520",
    departements: geo.features.map((feat) => ({
      code: feat.properties.code,
      nom: feat.properties.nom,
      d: path(feat),
    })),
  };
}
