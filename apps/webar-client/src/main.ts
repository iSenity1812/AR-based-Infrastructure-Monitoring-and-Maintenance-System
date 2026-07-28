import './styles.css';
import {
  fetchNodeContext,
  getNodeContext,
  getNodeContextFromQrData,
} from './mock-node-data';
import { getArAccessToken } from './services/api-client';
import { resolveAssetMarker } from './services/asset-context-service';
import { subscribeToNodeMetrics } from './services/monitoring-realtime';
import { fetchLatestNodeMetrics } from './services/monitoring-service';
import type { NodeContext, NodeHealth, NodeLiveMetrics } from './types';

declare global {
  interface Window {
    AFRAME?: unknown;
  }
}

const nodeId = getQueryParam('nodeId') ?? 'mock-node-001';
const markerCode = getQueryParam('markerCode');
const nodeData = getQueryParam('data');
const assetApiUrl = import.meta.env.VITE_ASSET_API_URL?.trim() || '';
const monitoringApiUrl = import.meta.env.VITE_MONITORING_API_URL?.trim() || '';
const monitoringSocketUrl =
  import.meta.env.VITE_MONITORING_SOCKET_URL?.trim() || '';
const nodeContextApiUrl =
  import.meta.env.VITE_ASSET_CONTEXT_API_URL?.trim() || '/mock-api/nodes';
const targetSrc =
  import.meta.env.VITE_MINDAR_IMAGE_TARGET_SRC?.trim() ||
  '/targets/card-example/card.mind';
const targetImageSrc =
  import.meta.env.VITE_MINDAR_TARGET_IMAGE_SRC?.trim() ||
  '/targets/card-example/card.png';

let currentNode = getNodeContextFromQrData(nodeData) ?? getNodeContext(nodeId);
let dataStatus = nodeData ? 'Embedded QR payload' : 'Resolving node context...';
let trackingStatus = 'Starting camera and image tracking...';
let lastRealtimeAt = 0;
let stopRealtime: (() => void) | null = null;
let freshnessTimer: number | null = null;

void initializeScene();

async function initializeScene() {
  try {
    const { node, source } = await resolveNodeContext();
    currentNode = node;
    dataStatus = source;
  } catch (error: unknown) {
    dataStatus =
      error instanceof Error
        ? `${error.message} Showing local mock fallback.`
        : 'Showing local mock fallback.';
  }

  renderScene(currentNode, dataStatus, trackingStatus);
  if (currentNode.assetType === 'rack') {
    setDataStatus('Rack identified. Node telemetry is not applicable.');
    return;
  }
  await loadInitialMetrics();
  startRealtimeMetrics();
  startFreshnessMonitor();
}

async function resolveNodeContext(): Promise<{ node: NodeContext; source: string }> {
  const embeddedNode = getNodeContextFromQrData(nodeData);
  if (embeddedNode) {
    return { node: embeddedNode, source: 'Embedded QR payload' };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  try {
    const token = getArAccessToken();

    if (markerCode) {
      if (!assetApiUrl) {
        throw new Error('Asset API URL is not configured.');
      }
      if (!token) {
        throw new Error('An AR access token is required to resolve this marker.');
      }

      const resolvedNode = await resolveAssetMarker(
        assetApiUrl,
        markerCode,
        token,
        currentNode,
        controller.signal,
      );

      return {
        node: resolvedNode,
        source: `Marker ${markerCode} resolved`,
      };
    }

    const fetchedNode = await fetchNodeContext(nodeContextApiUrl, nodeId, controller.signal);
    return { node: fetchedNode, source: `Fetched from ${nodeContextApiUrl}` };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Node context request timed out.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function loadInitialMetrics() {
  const token = getArAccessToken();

  if (!token || !monitoringApiUrl) {
    setDataStatus('Realtime mode. Waiting for live telemetry...');
    return;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const metrics = await fetchLatestNodeMetrics(
      monitoringApiUrl,
      currentNode.id,
      token,
      controller.signal,
    );

    if (metrics) {
      applyLiveMetrics(metrics, 'Monitoring snapshot');
    } else {
      setDataStatus('No recent monitoring snapshot. Waiting for realtime...');
    }
  } catch (error: unknown) {
    setDataStatus(
      error instanceof Error
        ? `Snapshot unavailable. ${error.message}`
        : 'Snapshot unavailable. Waiting for realtime...',
    );
  } finally {
    window.clearTimeout(timeout);
  }
}

function startRealtimeMetrics() {
  if (!monitoringSocketUrl) {
    setDataStatus('Realtime URL is not configured. Showing fallback data.');
    return;
  }

  stopRealtime?.();
  stopRealtime = subscribeToNodeMetrics(
    monitoringSocketUrl,
    currentNode.id,
    getArAccessToken(),
    {
      onConnected: () => {
        setDataStatus('Realtime connected. Waiting for node metrics...');
      },
      onDisconnected: () => {
        setDataStatus('Realtime disconnected. Reconnecting...');
      },
      onError: (message) => {
        setDataStatus(`Realtime unavailable. ${message}`);
      },
      onMetrics: (metrics) => {
        applyLiveMetrics(metrics, `Live telemetry · ${metrics.bucketSec}s`);
      },
    },
  );
}

function startFreshnessMonitor() {
  freshnessTimer = window.setInterval(() => {
    if (!lastRealtimeAt) {
      return;
    }

    const ageSec = Math.floor((Date.now() - lastRealtimeAt) / 1000);

    if (ageSec > 60) {
      setDataStatus(`Telemetry offline · last update ${ageSec}s ago`);
    } else if (ageSec > 15) {
      setDataStatus(`Telemetry stale · last update ${ageSec}s ago`);
    }
  }, 5000);
}

function applyLiveMetrics(metrics: NodeLiveMetrics, source: string) {
  const availableValues = [
    metrics.cpuUsagePct,
    metrics.memoryUsagePct,
    metrics.diskUsagePct,
    metrics.cpuTemperatureC,
    metrics.networkRxBytesSec,
    metrics.networkTxBytesSec,
  ];

  const hasAvailableMetrics = availableValues.some((value) => value != null);

  currentNode = {
    ...currentNode,
    cpuPercent: metrics.cpuUsagePct,
    memoryPercent: metrics.memoryUsagePct,
    diskPercent: metrics.diskUsagePct,
    temperatureC: metrics.cpuTemperatureC,
    networkRxBytesSec: metrics.networkRxBytesSec,
    networkTxBytesSec: metrics.networkTxBytesSec,
    status: deriveHealth(metrics, currentNode.status),
    updatedAt: new Date().toISOString(),
  };
  lastRealtimeAt = Date.now();
  updateSceneMetrics(currentNode);
  setDataStatus(
    hasAvailableMetrics
      ? source
      : 'Live event received, but node metrics are unavailable.',
  );
}

function deriveHealth(
  metrics: NodeLiveMetrics,
  fallback: NodeHealth,
): NodeHealth {
  const cpu = metrics.cpuUsagePct;
  const memory = metrics.memoryUsagePct;
  const disk = metrics.diskUsagePct;
  const temperature = metrics.cpuTemperatureC;

  if (
    (cpu != null && cpu >= 90) ||
    (memory != null && memory >= 95) ||
    (disk != null && disk >= 95) ||
    (temperature != null && temperature >= 90)
  ) {
    return 'critical';
  }

  if (
    (cpu != null && cpu >= 75) ||
    (memory != null && memory >= 85) ||
    (disk != null && disk >= 85) ||
    (temperature != null && temperature >= 80)
  ) {
    return 'warning';
  }

  return availableMetricCount(metrics) > 0 ? 'nominal' : fallback;
}

function availableMetricCount(metrics: NodeLiveMetrics) {
  return [
    metrics.cpuUsagePct,
    metrics.memoryUsagePct,
    metrics.diskUsagePct,
    metrics.cpuTemperatureC,
    metrics.networkRxBytesSec,
    metrics.networkTxBytesSec,
  ].filter((value) => value != null).length;
}

function renderScene(
  context: NodeContext,
  dataMessage: string,
  trackingMessage: string,
) {
  const app = document.querySelector<HTMLDivElement>('#app');

  if (!app) {
    return;
  }

  if (!window.AFRAME) {
    app.innerHTML = `
      <section class="boot-panel">
        <p class="eyebrow">// AR-IMMS MINDAR</p>
        <h1>A-Frame runtime is not loaded</h1>
        <p class="boot-copy">Run the WebAR dev/build script so vendor assets are copied into public/vendor.</p>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    <section class="mindar-shell">
      <div class="html-overlay">
        <header class="top-bar">
          <div class="brand">
            <p class="eyebrow">// AR-IMMS MINDAR</p>
            <h1 class="title">${escapeHtml(context.name)}</h1>
          </div>
          <span id="node-health-status" class="status-pill status-${context.status}">${context.status}</span>
        </header>

        <section class="operator-strip">
          <div>
            <p class="label">Tracking state</p>
            <strong id="tracking-status">${escapeHtml(trackingMessage)}</strong>
          </div>
          <div>
            <p class="label">Data source</p>
            <strong id="data-status">${escapeHtml(dataMessage)}</strong>
          </div>
        </section>

        <section class="marker-card">
          <img src="${escapeAttribute(targetImageSrc)}" alt="MindAR target marker" />
          <div>
            <p class="label">Test Marker</p>
            <strong>Open this marker on another screen, or print it, then scan it with this WebAR view.</strong>
          </div>
        </section>
      </div>

      <a-scene
        id="ar-scene"
        mindar-image="imageTargetSrc: ${escapeAttribute(targetSrc)}; filterMinCF: 0.0001; filterBeta: 0.001; uiLoading: no; uiScanning: yes;"
        color-space="sRGB"
        renderer="colorManagement: true, physicallyCorrectLights"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        embedded
      >
        <a-assets timeout="30000">
          <img id="target-preview" src="${escapeAttribute(targetImageSrc)}" />
        </a-assets>

        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>

        <a-entity id="node-target" mindar-image-target="targetIndex: 0">
          <a-plane
            src="#target-preview"
            position="0 0 0"
            height="0.552"
            width="1"
            opacity="0.2"
            material="transparent: true"
          ></a-plane>

          ${arPanel({
            position: '0 0.52 0.08',
            width: '1.12',
            height: '0.22',
            title: context.rack,
            value: context.name,
            tone: context.status,
          })}

          ${arMetric({
            id: 'temperature',
            position: '-0.62 0.08 0.1',
            label: 'Temperature',
            value: formatTemperature(context.temperatureC),
            tone: context.status,
          })}

          ${arMetric({
            id: 'cpu',
            position: '0.62 0.08 0.1',
            label: 'CPU Load',
            value: formatPercent(context.cpuPercent),
            tone: (context.cpuPercent ?? 0) > 85 ? 'critical' : context.status,
          })}

          ${arMetric({
            id: 'memory',
            position: '-0.62 -0.2 0.1',
            label: 'Memory',
            value: formatPercent(context.memoryPercent),
            tone: (context.memoryPercent ?? 0) > 80 ? 'warning' : 'nominal',
          })}

          ${arMetric({
            id: 'disk',
            position: '0.62 -0.2 0.1',
            label: 'Disk',
            value: formatPercent(context.diskPercent),
            tone: (context.diskPercent ?? 0) > 95 ? 'critical' : context.status,
          })}

          ${arPanel({
            position: '0 -0.58 0.1',
            width: '1.24',
            height: '0.32',
            title: 'Network RX / TX',
            value: `${formatBytesPerSecond(context.networkRxBytesSec)} / ${formatBytesPerSecond(context.networkTxBytesSec)}`,
            tone: context.status,
            valueId: 'network-metric-value',
          })}

          <a-text
            value="${escapeAttribute(context.id)}"
            position="-0.58 -0.78 0.11"
            width="1.3"
            align="left"
            color="#A7B0C4"
            font="mozillavr"
          ></a-text>
          <a-text
            id="metrics-updated-at"
            value="${escapeAttribute(formatUpdatedAt(context.updatedAt))}"
            position="0.58 -0.78 0.11"
            width="1.3"
            align="right"
            color="#A7B0C4"
            font="mozillavr"
          ></a-text>
        </a-entity>
      </a-scene>
    </section>
  `;

  removeStaleMindArLoading();
  attachSceneListeners();
}

function arMetric({
  id,
  position,
  label,
  value,
  tone,
}: {
  id: string;
  position: string;
  label: string;
  value: string;
  tone: NodeContext['status'];
}) {
  return arPanel({
    position,
    width: '0.48',
    height: '0.24',
    title: label,
    value,
    tone,
    valueId: `${id}-metric-value`,
  });
}

function arPanel({
  position,
  width,
  height,
  title,
  value,
  tone,
  valueId,
}: {
  position: string;
  width: string;
  height: string;
  title: string;
  value: string;
  tone: NodeContext['status'];
  valueId?: string;
}) {
  const accent = toneColor(tone);
  const titlePositionY = Number(height) / 5;
  const valuePositionY = -Number(height) / 7;

  return `
    <a-entity position="${position}">
      <a-plane
        width="${width}"
        height="${height}"
        color="#0F172A"
        opacity="0.9"
        material="transparent: true"
      ></a-plane>
      <a-plane
        width="${width}"
        height="0.018"
        position="0 ${Number(height) / 2 - 0.009} 0.01"
        color="${accent}"
      ></a-plane>
      <a-text
        value="${escapeAttribute(title)}"
        position="0 ${titlePositionY} 0.02"
        width="${Number(width) * 1.85}"
        align="center"
        color="#00D1FF"
        font="mozillavr"
      ></a-text>
      <a-text
        ${valueId ? `id="${escapeAttribute(valueId)}"` : ''}
        value="${escapeAttribute(value)}"
        position="0 ${valuePositionY} 0.02"
        width="${Number(width) * 1.9}"
        align="center"
        color="#F8FAFC"
        font="mozillavr"
      ></a-text>
    </a-entity>
  `;
}

function updateSceneMetrics(context: NodeContext) {
  setAFrameText('temperature-metric-value', formatTemperature(context.temperatureC));
  setAFrameText('cpu-metric-value', formatPercent(context.cpuPercent));
  setAFrameText('memory-metric-value', formatPercent(context.memoryPercent));
  setAFrameText('disk-metric-value', formatPercent(context.diskPercent));
  setAFrameText(
    'network-metric-value',
    `${formatBytesPerSecond(context.networkRxBytesSec)} / ${formatBytesPerSecond(context.networkTxBytesSec)}`,
  );
  setAFrameText('metrics-updated-at', formatUpdatedAt(context.updatedAt));

  const health = document.querySelector<HTMLElement>('#node-health-status');
  if (health) {
    health.textContent = context.status;
    health.className = `status-pill status-${context.status}`;
  }
}

function setAFrameText(id: string, value: string) {
  document.querySelector(`#${id}`)?.setAttribute('value', value);
}

function setDataStatus(message: string) {
  dataStatus = message;
  const status = document.querySelector<HTMLElement>('#data-status');
  if (status) {
    status.textContent = message;
  }
}

function formatPercent(value: number | null) {
  return value == null ? '--' : `${value.toFixed(1)}%`;
}

function formatTemperature(value: number | null) {
  return value == null ? '--' : `${value.toFixed(1)}C`;
}

function formatBytesPerSecond(value: number | null) {
  if (value == null) {
    return '--';
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}MB/s`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}KB/s`;
  }

  return `${value.toFixed(0)}B/s`;
}

function formatUpdatedAt(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
}

function attachSceneListeners() {
  const scene = document.querySelector('#ar-scene');
  const target = document.querySelector('#node-target');
  const status = document.querySelector('#tracking-status');

  if (!scene || !target || !status) {
    return;
  }

  scene.addEventListener('arReady', () => {
    trackingStatus = 'Camera ready. Point it at the target marker.';
    status.textContent = trackingStatus;
    removeStaleMindArLoading();
  });

  scene.addEventListener('arError', () => {
    trackingStatus = 'Camera could not start. Check browser camera permission.';
    status.textContent = trackingStatus;
    removeStaleMindArLoading();
  });

  target.addEventListener('targetFound', () => {
    trackingStatus = 'Marker locked. AR node context anchored.';
    status.textContent = trackingStatus;
    removeStaleMindArLoading();
  });

  target.addEventListener('targetLost', () => {
    trackingStatus = 'Marker lost. Point camera back at the target.';
    status.textContent = trackingStatus;
  });
}

function removeStaleMindArLoading() {
  document.querySelectorAll('.mindar-ui-loading').forEach((element) => element.remove());
}

function toneColor(status: NodeContext['status']) {
  if (status === 'critical') {
    return '#E85D75';
  }

  if (status === 'warning') {
    return '#F5B84B';
  }

  return '#3DDC97';
}

function getQueryParam(name: string) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(value: string) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

window.addEventListener('beforeunload', () => {
  stopRealtime?.();
  if (freshnessTimer != null) {
    window.clearInterval(freshnessTimer);
  }
});
