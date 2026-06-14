# Image de production Civiloop — déploiement Coolify (VPS).
#
# Les données vivent dans Supabase (Postgres). L'app les lit via DATABASE_URL.
# Le rafraîchissement quotidien se fait par une « Scheduled Task » Coolify qui
# lance `node scripts/refresh-data.mjs` dans le conteneur (voir README).

FROM node:22-slim AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Le prérendu ISR des pages interroge la base : DATABASE_URL doit être fournie
# au build (Coolify : cocher la variable comme « Build Variable »).
ARG DATABASE_URL
RUN DATABASE_URL="$DATABASE_URL" npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
