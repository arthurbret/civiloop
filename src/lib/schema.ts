import { pgTable, text, integer, boolean, date, jsonb } from "drizzle-orm/pg-core";

export type Position = "P" | "C" | "A" | "N";
export type VoteTuple = [numero: number, position: Position];

export type VentilationGroupe = {
  organeRef: string;
  nombreMembres: number;
  position: string;
  pour: number;
  contre: number;
  abst: number;
  nv: number;
  votants: { P: string[]; C: string[]; A: string[]; N: string[] };
};

export const groupes = pgTable("groupes", {
  id: text("id").primaryKey(),
  nom: text("nom").notNull(),
  abrege: text("abrege").notNull(),
  couleur: text("couleur").notNull(),
  ordre: integer("ordre").notNull(),
  actif: boolean("actif").notNull(),
  membres: integer("membres").notNull(),
});

export const deputes = pgTable("deputes", {
  id: text("id").primaryKey(),
  civ: text("civ"),
  prenom: text("prenom").notNull(),
  nom: text("nom").notNull(),
  dateNais: date("date_nais"),
  profession: text("profession"),
  groupe: text("groupe_id"),
  departement: text("departement"),
  numDepartement: text("num_departement"),
  circo: text("circo"),
  email: text("email"),
  tel: text("tel"),
  mandatDebut: date("mandat_debut"),
  participation: integer("participation").notNull(),
  nbVotes: integer("nb_votes").notNull(),
  votes: jsonb("votes").$type<VoteTuple[]>().notNull(),
});

export const scrutins = pgTable("scrutins", {
  n: integer("numero").primaryKey(),
  uid: text("uid").notNull(),
  date: date("date").notNull(),
  titre: text("titre").notNull(),
  sort: text("sort").notNull(),
  type: text("type"),
  typeLibelle: text("type_libelle"),
  pour: integer("pour").notNull(),
  contre: integer("contre").notNull(),
  abst: integer("abst").notNull(),
  nv: integer("nv").notNull(),
  exprimes: integer("exprimes").notNull(),
  demandeur: text("demandeur"),
  typeMajorite: text("type_majorite"),
  suffragesRequis: integer("suffrages_requis"),
  ventilation: jsonb("ventilation").$type<VentilationGroupe[]>().notNull(),
  isImportant: boolean("is_important").notNull(),
  importantLabel: text("important_label"),
  importantRank: integer("important_rank"),
});
