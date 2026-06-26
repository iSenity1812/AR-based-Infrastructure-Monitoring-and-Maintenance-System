# =========================
# Stage 1: Install deps
# =========================
FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

COPY control-plane/identity-service/package.json \
  control-plane/identity-service/package.json

RUN pnpm install --frozen-lockfile


# =========================
# Stage 2: Build identity-service
# =========================
FROM deps AS build

WORKDIR /app


COPY control-plane/identity-service/tsconfig.json \
  control-plane/identity-service/nest-cli.json \
  control-plane/identity-service/eslint.config.js \
  control-plane/identity-service/jest.config.ts \
  control-plane/identity-service/

COPY control-plane/identity-service/src \
  control-plane/identity-service/src


RUN pnpm --filter @ar-imms/identity-service build


# =========================
# Stage 3: Runtime
# =========================
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable


# copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# copy workspace metadata
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml


# copy package identity
COPY --from=deps \
  /app/control-plane/identity-service/package.json \
  ./control-plane/identity-service/package.json


# copy build result
COPY --from=build \
  /app/control-plane/identity-service/dist \
  ./control-plane/identity-service/dist


EXPOSE 3001


CMD ["pnpm", "--filter", "@ar-imms/identity-service", "start"]