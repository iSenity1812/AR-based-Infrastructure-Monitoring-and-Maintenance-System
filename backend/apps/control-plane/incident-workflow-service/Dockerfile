FROM node:22-alpine AS deps

WORKDIR /app/control-plane/incident-workflow-service

RUN corepack enable

COPY control-plane/incident-workflow-service/package.json control-plane/incident-workflow-service/pnpm-workspace.yaml ./

RUN pnpm install

FROM deps AS build

WORKDIR /app/control-plane/incident-workflow-service

COPY control-plane/incident-workflow-service/tsconfig.json control-plane/incident-workflow-service/tsconfig.build.json control-plane/incident-workflow-service/nest-cli.json control-plane/incident-workflow-service/eslint.config.mjs ./
COPY control-plane/incident-workflow-service/src ./src
COPY control-plane/incident-workflow-service/tests ./tests
COPY shared /app/shared

RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app/control-plane/incident-workflow-service

ENV NODE_ENV=production
ENV PORT=4004

RUN corepack enable

COPY control-plane/incident-workflow-service/package.json control-plane/incident-workflow-service/pnpm-workspace.yaml ./

RUN pnpm install --prod

COPY --from=build /app/control-plane/incident-workflow-service/dist ./dist
COPY control-plane/incident-workflow-service/.env.example ./.env.example

EXPOSE 4004

CMD ["pnpm", "start:prod"]
