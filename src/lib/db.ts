import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Singleton : en dev, le HMR ré-exécute les modules ; on réutilise la même
// connexion pour ne pas épuiser le pool Postgres.
const globalForDb = globalThis as unknown as { _civiloopSql?: ReturnType<typeof postgres> };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquante. Crée un fichier .env.local (cp .env.example .env.local) " +
      "avec la chaîne de connexion Postgres Supabase, puis relance `npm run dev`."
  );
}

const client =
  globalForDb._civiloopSql ??
  postgres(connectionString, { ssl: "require", prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb._civiloopSql = client;

export const db = drizzle(client, { schema });
export { schema };
