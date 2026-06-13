import { desc, eq } from "drizzle-orm";
import { db } from "./db";
import { deputes as tDeputes, groupes as tGroupes, scrutins as tScrutins, type Position } from "./schema";
import { generateText } from "./gemini";
import { titreScrutin, POSITION_LABEL } from "./format";

// Au-delà de ce délai, on régénère le résumé (les votes évoluent).
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Résumé IA du profil politique d'un député, mis en cache en base.
 * Généré à la demande (premier affichage) à partir de ses votes sur les
 * scrutins solennels, puis réutilisé tant qu'il n'est pas périmé.
 * Renvoie null si la génération n'est pas possible (pas de clé, pas de données…).
 */
export async function getDeputeResume(id: string): Promise<string | null> {
  const [d] = await db
    .select({
      civ: tDeputes.civ,
      prenom: tDeputes.prenom,
      nom: tDeputes.nom,
      profession: tDeputes.profession,
      departement: tDeputes.departement,
      groupe: tDeputes.groupe,
      votes: tDeputes.votes,
      resumeIa: tDeputes.resumeIa,
      resumeIaMaj: tDeputes.resumeIaMaj,
    })
    .from(tDeputes)
    .where(eq(tDeputes.id, id))
    .limit(1);
  if (!d) return null;

  const aJour = d.resumeIa && d.resumeIaMaj && Date.now() - new Date(d.resumeIaMaj).getTime() < STALE_MS;
  if (aJour) return d.resumeIa;

  // Position du député sur les principaux scrutins (solennels) → matière du résumé
  const sps = await db
    .select({ n: tScrutins.n, titre: tScrutins.titre })
    .from(tScrutins)
    .where(eq(tScrutins.type, "SPS"))
    .orderBy(desc(tScrutins.n))
    .limit(50);
  const posMap = new Map(d.votes);
  const lignes = sps
    .map((s) => ({ titre: titreScrutin(s.titre), pos: posMap.get(s.n) }))
    .filter((x): x is { titre: string; pos: Position } => !!x.pos && x.pos !== "N")
    .slice(0, 30)
    .map((x) => `- ${x.titre.slice(0, 150)} → ${POSITION_LABEL[x.pos]}`)
    .join("\n");

  // Pas assez de votes exploitables : on garde l'ancien résumé éventuel.
  if (!lignes) return d.resumeIa ?? null;

  const groupeNom = d.groupe
    ? (await db.select({ nom: tGroupes.nom }).from(tGroupes).where(eq(tGroupes.id, d.groupe)).limit(1))[0]?.nom
    : null;

  const prompt = `Tu rédiges un court portrait politique NEUTRE et FACTUEL d'un·e député·e français·e, à partir UNIQUEMENT de ses votes réels listés ci-dessous.
Règles : 2 à 3 phrases, à la 3e personne, ton encyclopédique ; aucune insulte ni étiquette péjorative ; aucune spéculation au-delà des votes ; n'invente aucun fait biographique ; si les votes ne dégagent pas d'orientation nette, reste prudent et factuel.

Député·e : ${d.civ ?? ""} ${d.prenom} ${d.nom}${groupeNom ? `, groupe « ${groupeNom} »` : ""}${
    d.profession ? `, ancienne profession : ${d.profession}` : ""
  }${d.departement ? `, élu·e dans le département : ${d.departement}` : ""}.

Ses positions sur des scrutins solennels (intitulé du texte → vote) :
${lignes}

Rédige le portrait en français (2 à 3 phrases), en t'appuyant sur les grandes orientations qui ressortent de ces votes.`;

  const texte = await generateText(prompt, { maxOutputTokens: 800, temperature: 0.4 });
  if (!texte) return d.resumeIa ?? null;

  await db.update(tDeputes).set({ resumeIa: texte, resumeIaMaj: new Date() }).where(eq(tDeputes.id, id));
  return texte;
}
