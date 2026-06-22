FROM node:22-alpine AS deps

WORKDIR /app

RUN corepack enable

COPY package.json ./

RUN pnpm install

FROM deps AS build

WORKDIR /app

COPY tsconfig.json tsconfig.build.json nest-cli.json eslint.config.mjs ./ 
COPY src ./src
COPY tests ./tests

RUN pnpm build

FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4003

RUN corepack enable

COPY package.json ./

RUN pnpm install --prod

COPY --from=build /app/dist ./dist
COPY .env.example ./.env.example

EXPOSE 4003

CMD ["pnpm", "start:prod"]
