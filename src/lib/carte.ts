// Géométrie des départements métropolitains : asset statique (ne change pas),
// embarqué dans le bundle. Découplé de la base de données.
import carte from "./departements-svg.json";

export type Departement = { code: string; nom: string; d: string };

export function getCarte() {
  return carte as { viewBox: string; departements: Departement[] };
}
