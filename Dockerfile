# Image de production Civiloop — déploiement Coolify (VPS).
#
# Les données vivent dans Supabase (Postgres). L'app les lit via DATABASE_URL.
# Le rafraîchissement quotidien se fait par une « Scheduled Task » Coolify qui
# lance `node scripts/refresh-data.mjs` dans le conteneur (voir README).

FROM node:22-slim
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dépendances (devDeps incluses : nécessaires au build Tailwind/Next)
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Code source (inclut l'asset statique de la carte : src/lib/departements-svg.json)
COPY . .

# Le prérendu ISR des pages interroge la base : DATABASE_URL doit être fournie
# au build (Coolify : cocher la variable comme « Build Variable »).
ARG DATABASE_URL
RUN DATABASE_URL="$DATABASE_URL" npm run build

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["npm", "run", "start"]
