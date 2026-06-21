# 1. Base
FROM node:22-alpine AS base

WORKDIR /app/control-plane/asset-service

ENV PNPM_CONFIG_STRICT_DEP_BUILDS=false

RUN corepack enable


# 2. Install full deps for build
FROM base AS deps

COPY control-plane/asset-service/package.json control-plane/asset-service/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile


# 3. Build TypeScript -> dist
FROM deps AS build

WORKDIR /app

COPY control-plane/asset-service/tsconfig.json control-plane/asset-service/tsconfig.build.json control-plane/asset-service/nest-cli.json ./control-plane/asset-service/
COPY control-plane/asset-service/src ./control-plane/asset-service/src
COPY shared ./shared

WORKDIR /app/control-plane/asset-service

RUN pnpm build


# 4. Install production deps only
FROM base AS prod-deps

COPY control-plane/asset-service/package.json control-plane/asset-service/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile


# 5. Runtime
FROM node:22-alpine AS runtime

WORKDIR /app/control-plane/asset-service

ENV NODE_ENV=production
ENV PORT=4002
ENV PNPM_CONFIG_STRICT_DEP_BUILDS=false

RUN corepack enable

COPY --from=prod-deps /app/control-plane/asset-service/node_modules ./node_modules
COPY --from=prod-deps /app/control-plane/asset-service/package.json ./package.json

COPY --from=build /app/control-plane/asset-service/dist ./dist
COPY control-plane/asset-service/.env.example ./.env.example

EXPOSE 4002

CMD ["node", "dist/control-plane/asset-service/src/main.js"]