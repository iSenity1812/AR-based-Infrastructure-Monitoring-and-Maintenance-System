# =========================
# Stage 1: Install deps
# =========================
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable


# Root workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./


# Service package
COPY control-plane/monitoring-service/package.json \
  control-plane/monitoring-service/package.json


RUN pnpm install --frozen-lockfile


# =========================
# Stage 2: Build
# =========================
FROM deps AS build

WORKDIR /app


COPY control-plane/monitoring-service/tsconfig.json \
  control-plane/monitoring-service/tsconfig.build.json \
  control-plane/monitoring-service/nest-cli.json \
  ./control-plane/monitoring-service/


COPY control-plane/monitoring-service/src \
  ./control-plane/monitoring-service/src


COPY shared \
  ./shared


RUN pnpm --filter @ar-imms/monitoring-service build



# =========================
# Stage 3: Runtime
# =========================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4003

RUN corepack enable


COPY --from=deps \
  /app/node_modules \
  ./node_modules


COPY --from=deps \
  /app/package.json \
  ./package.json


COPY --from=deps \
  /app/pnpm-workspace.yaml \
  ./pnpm-workspace.yaml


COPY --from=deps \
  /app/control-plane/monitoring-service/package.json \
  ./control-plane/monitoring-service/package.json


COPY --from=build \
  /app/control-plane/monitoring-service/dist \
  ./control-plane/monitoring-service/dist


COPY control-plane/monitoring-service/.env.example \
  ./control-plane/monitoring-service/.env.example


EXPOSE 4003


CMD [ "pnpm", "--filter", "@ar-imms/monitoring-service", "start" ]