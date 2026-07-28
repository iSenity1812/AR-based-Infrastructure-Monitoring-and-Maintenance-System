# AR-IMMS MindAR WebAR Client

Browser-based WebAR image tracking client for the mobile QR/node flow.

## Setup

```bash
pnpm install
pnpm dev
```

Open the app from a phone on the same LAN:

```text
http://<your-lan-ip>:5174?nodeId=node-rack-b7
```

Vite uses strict port `5174`. Stop the process occupying that port before
starting WebAR.

## Phase Test: MindAR Image Tracking

This phase uses MindAR + A-Frame instead of 8th Wall.

The default target is the official MindAR sample target copied into:

```text
public/targets/card-example/card.mind
public/targets/card-example/card.png
```

To test:

1. Run the WebAR dev server.
2. Open `http://<lan-ip>:5174?nodeId=node-rack-b7` on the phone.
3. Open or print `public/targets/card-example/card.png` on another screen/paper.
4. Point the phone camera at that marker.
5. The AR-IMMS node panels should anchor to the detected image target.

## Node Context Data

The WebAR client now supports a real Monitoring snapshot plus Socket.IO live
updates. Copy the example environment before starting the app:

```powershell
Copy-Item .env.example .env.local
```

For a local Asset Service with hosted Monitoring, use:

```env
VITE_ASSET_API_URL=/local-asset-api/api/v1
VITE_MONITORING_API_URL=https://<backend-host>/monitoring/api/v1
VITE_MONITORING_SOCKET_URL=https://<backend-host>
```

Vite proxies `/local-asset-api` to `http://127.0.0.1:4002`. Therefore a phone
opening WebAR through HTTPS/ngrok can resolve markers against the Asset Service
running on the development computer without mixed-content or phone-localhost
errors. Override the local target only when Asset Service uses another port:

```powershell
$env:WEBAR_LOCAL_ASSET_API_URL='http://127.0.0.1:4002'
pnpm dev
```

For a hosted production build, do not use the local proxy. Set the direct
hosted Asset API before building:

```env
VITE_ASSET_API_URL=https://<backend-host>/asset/api/v1
```

Open the node that currently has collector telemetry:

```text
https://<webar-host>/?nodeId=node-msi-341b683e
```

The client subscribes to `monitoring.node.metrics.updated`, filters the
`.metrics.live` channel for the selected node, and incrementally updates the
A-Frame text entities without rebuilding the MindAR scene.

REST snapshots and marker resolution require an AR-scoped access token. Until
the backend session handoff is implemented, a development token can be placed
in session storage without putting it in source code or the URL:

```js
sessionStorage.setItem('ar-imms.ar.access-token', '<temporary-access-token>');
location.reload();
```

Do not use an administrator token in a committed environment file or query
parameter. With a valid scoped token, marker resolution can be tested using:

```text
https://<webar-host>/?markerCode=<marker-code>
```

If realtime or REST is unavailable, the client keeps the existing fallback
instead of crashing. By default that fallback fetches mock node JSON from:

```text
/mock-api/nodes/<nodeId>.json
```

To point the legacy mock-compatible adapter at another service, set:

```bash
VITE_ASSET_CONTEXT_API_URL=https://<asset-context-service>/nodes
```

Expected response shape:

```json
{
  "id": "node-rack-b7",
  "name": "Node BX-1109",
  "rack": "Rack B7",
  "status": "critical",
  "temperatureC": 84.2,
  "cpuPercent": 91,
  "memoryPercent": 77,
  "networkLatencyMs": 38,
  "activeTicketCount": 2,
  "lastTicketCode": "TCK-WEB-79528",
  "updatedAt": "Fetched mock API"
}
```

If the fetch fails, the client shows local fallback data instead of crashing.

## Custom AR-IMMS Marker

When the shared visual label is ready, compile it into a MindAR target:

1. Open the MindAR compiler:

```text
https://hiukim.github.io/mind-ar-js-doc/tools/compile
```

2. Upload the shared high-contrast AR-IMMS image target. Keep the per-asset QR
   separate from this image so QR content can change without recompiling the
   `.mind` target.

   The shared target can include:

```text
AR-IMMS
Shared visual target
High-contrast visual pattern
```

3. Download the generated `.mind` file.
4. Put it in:

```text
public/targets/ar-imms-node/ar-imms-node.mind
public/targets/ar-imms-node/ar-imms-node.png
```

5. Configure:

```bash
VITE_MINDAR_IMAGE_TARGET_SRC=/targets/ar-imms-node/ar-imms-node.mind
VITE_MINDAR_TARGET_IMAGE_SRC=/targets/ar-imms-node/ar-imms-node.png
```

## QR Contract

Each Rack/Node receives a backend marker mapping. The downloadable QR contains
the WebAR URL and its stable `markerCode`:

```text
https://<webar-host>/?markerCode=AR-NODE-NODE-HCM-A1-01
```

WebAR resolves that code through Asset Service:

```text
GET /api/v1/markers/resolve/AR-NODE-NODE-HCM-A1-01
```

The resolved Node `nodeCode`, rather than its MongoDB `_id`, is used to request
Monitoring telemetry. A Rack marker identifies the Rack but does not start a
Node telemetry subscription. Marker resolution requires an AR-scoped access
token in session storage. MindAR continues to use one shared visual target for
spatial tracking.
