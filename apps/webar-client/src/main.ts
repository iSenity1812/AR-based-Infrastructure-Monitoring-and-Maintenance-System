import './styles.css';
import {
  fetchNodeContext,
  getNodeContext,
  getNodeContextFromQrData,
} from './mock-node-data';
import type { NodeContext } from './types';

declare global {
  interface Window {
    AFRAME?: unknown;
  }
}

const nodeId = getQueryParam('nodeId') ?? 'mock-node-001';
const nodeData = getQueryParam('data');
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
}

async function resolveNodeContext(): Promise<{ node: NodeContext; source: string }> {
  const embeddedNode = getNodeContextFromQrData(nodeData);
  if (embeddedNode) {
    return { node: embeddedNode, source: 'Embedded QR payload' };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);

  try {
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
          <span class="status-pill status-${context.status}">${context.status}</span>
        </header>

        <section class="operator-strip">
          <div>
            <p class="label">Tracking state</p>
            <strong id="tracking-status">${escapeHtml(trackingMessage)}</strong>
          </div>
          <div>
            <p class="label">Data source</p>
            <strong>${escapeHtml(dataMessage)}</strong>
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
            position: '-0.62 0.08 0.1',
            label: 'Temperature',
            value: `${context.temperatureC.toFixed(1)}C`,
            tone: context.status,
          })}

          ${arMetric({
            position: '0.62 0.08 0.1',
            label: 'CPU Load',
            value: `${context.cpuPercent}%`,
            tone: context.cpuPercent > 85 ? 'critical' : context.status,
          })}

          ${arMetric({
            position: '-0.62 -0.2 0.1',
            label: 'Memory',
            value: `${context.memoryPercent}%`,
            tone: context.memoryPercent > 80 ? 'warning' : 'nominal',
          })}

          ${arMetric({
            position: '0.62 -0.2 0.1',
            label: 'Latency',
            value: `${context.networkLatencyMs}ms`,
            tone: context.networkLatencyMs > 100 ? 'critical' : 'nominal',
          })}

          ${arPanel({
            position: '0 -0.58 0.1',
            width: '1.24',
            height: '0.32',
            title: `Active tickets: ${context.activeTicketCount}`,
            value: context.lastTicketCode,
            tone: context.status,
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
            value="${escapeAttribute(context.updatedAt)}"
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
  position,
  label,
  value,
  tone,
}: {
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
  });
}

function arPanel({
  position,
  width,
  height,
  title,
  value,
  tone,
}: {
  position: string;
  width: string;
  height: string;
  title: string;
  value: string;
  tone: NodeContext['status'];
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
