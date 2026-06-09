FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY control-plane/asset-service/package.json control-plane/asset-service/pnpm-lock.yaml ./control-plane/asset-service/

WORKDIR /app/control-plane/asset-service

RUN pnpm install --frozen-lockfile

FROM deps AS build

WORKDIR /app

COPY control-plane/asset-service/tsconfig.json control-plane/asset-service/tsconfig.build.json control-plane/asset-service/nest-cli.json ./control-plane/asset-service/
COPY control-plane/asset-service/src ./control-plane/asset-service/src
COPY shared ./shared

WORKDIR /app/control-plane/asset-service

RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app/control-plane/asset-service

ENV NODE_ENV=production
ENV PORT=4002

RUN corepack enable

COPY control-plane/asset-service/package.json control-plane/asset-service/pnpm-lock.yaml ./

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/control-plane/asset-service/dist ./dist
COPY control-plane/asset-service/.env.example ./.env.example

EXPOSE 4002

CMD ["pnpm", "start:prod"]
