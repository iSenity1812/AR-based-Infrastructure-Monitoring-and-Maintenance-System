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

For the current local machine, the usual LAN URL has been:

```text
http://192.168.100.157:5174?nodeId=node-rack-b7
```

If Vite reports that port `5174` is busy, use the port Vite prints in the
terminal.

## Phase Test: MindAR Image Tracking

This phase uses MindAR + A-Frame instead of 8th Wall.

The default target is the official MindAR sample target copied into:

```text
public/targets/card-example/card.mind
public/targets/card-example/card.png
```

To test:

1. Run the WebAR dev server.
2. Open `http://<lan-ip>:5173?nodeId=node-rack-b7` on the phone.
3. Open or print `public/targets/card-example/card.png` on another screen/paper.
4. Point the phone camera at that marker.
5. The AR-IMMS node panels should anchor to the detected image target.

## Node Context Data

By default, the WebAR client fetches mock node JSON from:

```text
/mock-api/nodes/<nodeId>.json
```

To point it at a future real service, set:

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

When the real rack/node label is ready, compile it into a MindAR target:

1. Open the MindAR compiler:

```text
https://hiukim.github.io/mind-ar-js-doc/tools/compile
```

2. Upload the marker image, such as an AR-IMMS label that includes:

```text
AR-IMMS
Node BX-1109
Rack B7
QR code
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

Mobile QR scanning remains useful for launching the correct `nodeId`:

```text
arimms://ar/node-rack-b7
```

The WebAR page receives the same node id:

```text
http://<lan-ip>:5174?nodeId=node-rack-b7
```

MindAR handles where the AR panels anchor. The `nodeId` decides which data to
fetch.
