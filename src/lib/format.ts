import type { Position } from "./data";

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function age(dateNais: string | null) {
  if (!dateNais) return null;
  const n = new Date(dateNais);
  const now = new Date();
  let a = now.getFullYear() - n.getFullYear();
  if (now.getMonth() < n.getMonth() || (now.getMonth() === n.getMonth() && now.getDate() < n.getDate())) a--;
  return a;
}

export const POSITION_LABEL: Record<Position, string> = {
  P: "Pour",
  C: "Contre",
  A: "Abstention",
  N: "Non-votant",
};

export function ordinalCirco(circo: string | null) {
  if (!circo) return "";
  const n = Number(circo);
  return n === 1 ? "1re circonscription" : `${n}e circonscription`;
}

// Nettoie les titres de scrutins : majuscule initiale, sans point final
export function titreScrutin(titre: string) {
  const t = titre.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function sortLabel(sort: string) {
  return sort === "adopté" ? "Adopté" : "Rejeté";
}
