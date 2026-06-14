# Civiloop

L'Assemblée nationale, en clair. Un site qui présente les votes, les députés et les
groupes de la 17ᵉ législature à partir des [données ouvertes officielles](https://data.assemblee-nationale.fr),
dans une interface « bento » claire et accessible.

## Pages

- **Accueil** — le vote à la une, les derniers scrutins, la composition de l'hémicycle, les grands scrutins solennels.
- **/votes** — les 7 000+ scrutins publics, avec recherche et filtre « scrutins solennels ».
- **/votes/[numéro]** — le détail d'un scrutin : totaux, vote par groupe, vote nominatif de chaque député.
- **/deputes** — l'annuaire des 577 députés, filtrable par nom, département et groupe.
- **/deputes/[id]** — la fiche d'un député : informations, position sur le dernier scrutin solennel,
  derniers votes, **activités et intérêts déclarés (HATVP)**, circonscription sur la carte, place du
  groupe dans l'hémicycle, taux de participation.

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner DATABASE_URL (Supabase)
npm run refresh              # télécharge l'open data AN et l'importe en base
npm run dev                  # → http://localhost:3000
```

## Données

Toutes les données vivent dans **Supabase (Postgres)**. L'app les lit côté serveur
via `DATABASE_URL` (Drizzle + postgres.js). Tables :

| Table | Contenu |
|---|---|
| `groupes` | groupes politiques (couleur, effectif…) |
| `deputes` | 577 députés ; `votes` (jsonb) = historique `[[numero, position]]` ; `interets` (jsonb) = déclaration d'intérêts HATVP |
| `scrutins` | scrutins ; `ventilation` (jsonb) = vote nominatif par groupe ; **`is_important` / `important_label` / `important_rank`** = curation |

Le chargement se fait en une commande :

```bash
npm run refresh   # télécharge les dumps, décompresse (pur JS), importe en base
# ou, si data/raw est déjà présent :
npm run import
```

Sources : [Scrutins.json.zip](https://data.assemblee-nationale.fr/static/openData/repository/17/loi/scrutins/Scrutins.json.zip)
et [AMO10 députés actifs](https://data.assemblee-nationale.fr/static/openData/repository/17/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip),
plus l'[open data HATVP](https://www.hatvp.fr/open-data/) (déclarations d'intérêts, licence Etalab) :
[liste.csv](https://www.hatvp.fr/livraison/opendata/liste.csv) (index) et
[declarations.xml](https://www.hatvp.fr/livraison/merge/declarations.xml) (~80 Mo).
La géométrie des départements est un asset statique committé (`src/lib/departements-svg.json`).

> L'import est **idempotent** : il met à jour les colonnes open data mais **ne touche
> jamais** `is_important` / `important_label` / `important_rank` (ta curation est préservée).

## Votes importants (curation pilotée par la base)

Mettre un vote « à la une » = passer son `is_important` à `true` dans Supabase :

```sql
update scrutins
set is_important = true, important_label = 'Proposition de loi sur la fin de vie', important_rank = 1
where numero = 5729;
```

Effet immédiat (≤ 1 min, `revalidate = 60`) :
- accueil → bloc « Le vote à la une » + section « Les votes importants » (triés par `important_rank`) ;
- fiche député → bloc « Position sur … » montrant le vote de ce député sur le scrutin mis en avant.

Au début, ça se fait directement dans l'**éditeur de tables Supabase** (= back-office
instantané). Un back-office maison (auth Supabase) pourra venir ensuite sans changer le modèle.

## Résumé IA des députés

La fiche d'un député affiche un encart « En bref » : 2-3 phrases sur son profil
politique, **générées par Gemini** (`gemini-3.1-flash-lite`) à partir de ses votes
sur les scrutins solennels.

- Génération **paresseuse** au premier affichage, puis **mise en cache** en base
  (`deputes.resume_ia` / `resume_ia_maj`) — régénérée après 30 jours. L'appel modèle
  n'a donc lieu qu'une fois par député, et la fiche reste rapide (streaming via React
  `Suspense` : le résumé arrive après le reste de la page).
- Prompt **neutre et factuel**, ancré uniquement sur les votes ; encart explicitement
  marqué « généré par IA ». Clé dans `GEMINI_API_KEY` (jamais exposée au client).
- Pour forcer un rafraîchissement : `update deputes set resume_ia = null where id = '…';`

## Activités & intérêts déclarés (HATVP)

La fiche d'un député affiche une carte « Activités et intérêts déclarés » : ce qu'il/elle fait
**en dehors du mandat**, à partir de l'[open data de la HATVP](https://www.hatvp.fr/open-data/)
(déclarations d'intérêts et d'activités). Six rubriques : activités professionnelles (5 dernières
années), activités de consultant, participations à des organes dirigeants, participations
financières, fonctions bénévoles, autres mandats électifs.

- **Faits déclaratifs officiels uniquement**, sourcés, avec lien vers la déclaration d'origine sur
  hatvp.fr. **Aucune IA, aucune interprétation.** Sont volontairement exclus : les données du
  conjoint, les collaborateurs (noms de tiers) et les observations en texte libre. Les marqueurs
  « [Données non publiées] » de la HATVP sont nettoyés.
- **Rapprochement** déclaration ↔ député par **nom + date de naissance** (`scripts/lib/parse-hatvp.mjs`),
  conçu pour zéro faux positif (jamais sur la seule date de naissance ni le seul nom). Mis en cache
  en base dans `deputes.interets` (jsonb) ; ~533/577 députés rapprochés (les autres n'ont pas encore
  de déclaration publiée → un état neutre est affiché).
- Alimenté par le même `npm run refresh` / `npm run import` que le reste (étape indépendante, qui ne
  met à jour que `interets` / `interets_maj`).

> Périmètre assumé : **pas** de « casier judiciaire » ni de plaintes/accusations (non disponibles en
> open data, et risque juridique — présomption d'innocence, RGPD). Uniquement des déclarations
> officielles, factuelles et vérifiables.

## Mise à jour quotidienne

Les dumps sont republiés chaque jour par l'Assemblée nationale. Sans redéploiement :

1. Une tâche planifiée relance `npm run refresh` chaque matin → upsert en base.
2. Les pages sont en **ISR** (`revalidate = 60`) ; les pages de détail sont rendues
   à la demande. Les nouvelles données apparaissent en moins d'une minute.

### Déploiement sur Coolify (VPS)

1. **Nouvelle ressource → Application**, dépôt Git, *Build Pack* = **Dockerfile**, port `3000`.
2. **Environment Variables** :
   - `DATABASE_URL` (connexion Postgres Supabase). ⚠️ La cocher aussi comme
     **Build Variable** : le prérendu interroge la base au build.
   - `GEMINI_API_KEY` (résumés IA). Runtime suffit (pas besoin au build).
3. **Scheduled Tasks** → ajouter :
   - **Command** : `node scripts/refresh-data.mjs`
   - **Frequency** : `0 5 * * *` (tous les jours à 5 h)

   Coolify exécute la commande **dans le conteneur** ; l'import met la base à jour,
   l'app le reflète via l'ISR. Aucun redéploiement.

> Le `DATABASE_URL` de la tâche planifiée est hérité de l'app. Pense à lancer la tâche
> une première fois à la main pour vérifier les logs (`✓ Import terminé en …`).

### Choix de calcul

- **Taux de participation** : votes exprimés lors des **scrutins publics solennels**
  tenus depuis le début du mandat (l'absence à un amendement n'est pas significative).
- **Vote « à la une »** : le scrutin `is_important` au plus petit `important_rank`.
- Les photos officielles sont servies par assemblee-nationale.fr.

## Stack

Next.js 15 (App Router), Tailwind CSS 4, shadcn/ui, TypeScript.
Données dans Supabase (Postgres), accès via Drizzle ORM + postgres.js.
