import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function toPosix(value) {
  return value.replace(/\\/g, "/");
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegex(pattern) {
  const normalized = toPosix(pattern);
  const escaped = escapeRegex(normalized)
    .replace(/\*\*/g, ":::DOUBLE_WILDCARD:::")
    .replace(/\*/g, "[^/]*")
    .replace(/:::DOUBLE_WILDCARD:::/g, ".*");

  return new RegExp(`^${escaped}$`);
}

function matchesAny(filePath, patterns) {
  return patterns.some((pattern) => globToRegex(pattern).test(filePath));
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function tryGit(args) {
  try {
    return git(args);
  } catch {
    return null;
  }
}

function normalizeSha(value) {
  const trimmedValue = value?.trim();

  if (!trimmedValue || /^0+$/.test(trimmedValue)) {
    return null;
  }

  return trimmedValue;
}

function resolveCommitish(value) {
  const normalizedValue = normalizeSha(value);

  if (!normalizedValue) {
    return null;
  }

  return tryGit(["rev-parse", "--verify", `${normalizedValue}^{commit}`]);
}

function resolveHeadSha(candidateHeadSha) {
  return resolveCommitish(candidateHeadSha) ?? git(["rev-parse", "HEAD"]);
}

function resolvePushBaseSha(candidateBaseSha, headSha) {
  const resolvedBaseSha = resolveCommitish(candidateBaseSha);
  if (resolvedBaseSha) {
    return resolvedBaseSha;
  }

  const firstParentSha = tryGit(["rev-parse", "--verify", `${headSha}^`]);
  if (firstParentSha) {
    return firstParentSha;
  }

  return EMPTY_TREE_SHA;
}

function resolveRange(eventName, eventPath) {
  const payload = readJson(eventPath);
  const inputBaseSha = normalizeSha(process.env.INPUT_BASE_SHA);
  const inputHeadSha = normalizeSha(process.env.INPUT_HEAD_SHA);

  if (inputHeadSha) {
    const headSha = resolveHeadSha(inputHeadSha);

    if (inputBaseSha) {
      const baseSha = resolveCommitish(inputBaseSha) ?? EMPTY_TREE_SHA;
      return { baseSha, headSha };
    }

    if (eventName === "push") {
      return {
        baseSha: resolvePushBaseSha(payload.before, headSha),
        headSha,
      };
    }
  }

  if (eventName === "pull_request") {
    const headSha = resolveHeadSha(payload.pull_request.head.sha);
    return {
      baseSha: resolveCommitish(payload.pull_request.base.sha) ?? EMPTY_TREE_SHA,
      headSha,
    };
  }

  if (eventName === "push") {
    const headSha = resolveHeadSha(payload.after);
    return {
      baseSha: resolvePushBaseSha(payload.before, headSha),
      headSha,
    };
  }

  const headSha = git(["rev-parse", "HEAD"]);
  const baseSha = tryGit(["rev-parse", "--verify", "HEAD^"]) ?? EMPTY_TREE_SHA;
  return { baseSha, headSha };
}

function listChangedFiles(baseSha, headSha) {
  if (!baseSha || !headSha) {
    return [];
  }

  const output = git(["diff", "--name-only", baseSha, headSha]);
  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((entry) => toPosix(entry.trim()))
    .filter(Boolean);
}

function boolString(value) {
  return value ? "true" : "false";
}

function toOutputKey(serviceName) {
  return serviceName.replace(/-/g, "_");
}

function setOutput(key, value) {
  const filePath = process.env.GITHUB_OUTPUT;
  if (!filePath) {
    return;
  }

  fs.appendFileSync(filePath, `${key}=${value}\n`);
}

const workspaceRoot = process.cwd();
const registryPath = path.resolve(
  workspaceRoot,
  process.env.INPUT_REGISTRY_PATH || ".github/service-registry.json",
);
const registry = readJson(registryPath);
const { baseSha, headSha } = resolveRange(
  process.env.GITHUB_EVENT_NAME,
  process.env.GITHUB_EVENT_PATH,
);
const changedFiles = listChangedFiles(baseSha, headSha);

const sharedChanged = changedFiles.some((filePath) =>
  matchesAny(filePath, registry.shared_paths),
);
const workflowChanged = changedFiles.some((filePath) =>
  matchesAny(filePath, registry.workflow_paths),
);
const infraChanged = changedFiles.some(
  (filePath) =>
    filePath.startsWith("infra/") &&
    !matchesAny(filePath, registry.workflow_paths),
);
const docsOnly =
  changedFiles.length > 0 &&
  changedFiles.every((filePath) => matchesAny(filePath, registry.docs_paths));

setOutput("base_sha", baseSha);
setOutput("head_sha", headSha);
setOutput("shared_changed", boolString(sharedChanged));
setOutput("workflow_changed", boolString(workflowChanged));
setOutput("infra_changed", boolString(infraChanged));
setOutput("docs_only", boolString(docsOnly));
setOutput("changed_files_json", JSON.stringify(changedFiles));

for (const service of registry.services) {
  const serviceKey = toOutputKey(service.service_name);
  const serviceChanged = changedFiles.some((filePath) =>
    matchesAny(filePath, service.ci_paths),
  );
  const serviceDeployChanged = changedFiles.some((filePath) =>
    matchesAny(filePath, service.deploy_paths),
  );

  setOutput(`${serviceKey}_changed`, boolString(serviceChanged));
  setOutput(`${serviceKey}_deploy_changed`, boolString(serviceDeployChanged));
}
