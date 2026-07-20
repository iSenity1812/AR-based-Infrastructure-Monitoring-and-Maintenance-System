# =========================
# Stage 1: Install deps
# =========================
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable


# root workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./


# service package
COPY control-plane/asset-service/package.json \
  control-plane/asset-service/package.json

RUN pnpm install --frozen-lockfile


# =========================
# Stage 2: Build
# =========================
FROM deps AS build

WORKDIR /app


COPY control-plane/asset-service/tsconfig.json \
  control-plane/asset-service/tsconfig.build.json \
  control-plane/asset-service/nest-cli.json \
  ./control-plane/asset-service/


COPY control-plane/asset-service/src \
  ./control-plane/asset-service/src


COPY shared \
  ./shared


RUN pnpm --filter @ar-imms/asset-service build

COPY control-plane/asset-service/src/infrastructure/grpc/proto \
  ./control-plane/asset-service/dist/control-plane/asset-service/src/infrastructure/grpc/proto



# =========================
# Stage 3: Runtime
# =========================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4002

RUN corepack enable


COPY --from=deps /app/node_modules ./node_modules

COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml


COPY --from=deps \
  /app/control-plane/asset-service/package.json \
  ./control-plane/asset-service/package.json


COPY --from=build \
  /app/control-plane/asset-service/dist \
  ./control-plane/asset-service/dist


COPY control-plane/asset-service/.env.example \
  ./control-plane/asset-service/.env.example


EXPOSE 4002


CMD [ "pnpm", "--filter", "@ar-imms/asset-service", "start"]
