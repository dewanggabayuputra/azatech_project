FROM node:22-alpine AS base

WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY . .
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
RUN npx prisma generate && npm run build

FROM build AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

FROM build AS runtime
ENV NODE_ENV=production
RUN npm prune --omit=dev
CMD ["node", "dist/src/main.js"]
