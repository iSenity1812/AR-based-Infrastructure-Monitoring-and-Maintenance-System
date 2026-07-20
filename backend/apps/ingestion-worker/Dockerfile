FROM golang:1.25-bookworm AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY packages/ingestion-worker-contract ./packages/ingestion-worker-contract
COPY backend/apps/ingestion-worker ./backend/apps/ingestion-worker

WORKDIR /src/backend/apps/ingestion-worker

RUN go mod download

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/ingestion-worker ./cmd/server

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /out/ingestion-worker /usr/local/bin/ingestion-worker

EXPOSE 4040

ENTRYPOINT ["ingestion-worker"]
