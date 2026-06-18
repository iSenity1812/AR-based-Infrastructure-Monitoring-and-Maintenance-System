# Ingestion Worker Registration Contract

## Scope

This document describes the node registration gRPC contract implemented by `backend/apps/ingestion-worker`.

The registration flow is consumed by the collector bootstrap path and is responsible for validating the bootstrap token, issuing credentials, and persisting the discovered node record for later asset normalization.

## Service Basics

- Service name: `ingestion-worker`
- Transport: `gRPC`
- Service: `api.registration.v1.RegistrationService`
- RPC: `RegisterNode`

## Semantics

- `collector source` remains the agent-side source identity used by telemetry collection.
- `discovery source` is the upstream source that should become `node.source`.
- `vendor` is canonical hardware vendor metadata.
- `model` is canonical hardware model metadata.

All new metadata fields are optional so registration still works when an adapter cannot infer them.

## Messages

### `HardwareInfo`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `primary_ipv4` | string | no | primary management IPv4 if available |
| `mac_address` | string | no | NIC fingerprint |
| `hardware_serial` | string | no | hardware or baseboard serial |
| `vendor` | string | no | canonical vendor, for example `Dell` |
| `model` | string | no | canonical model, for example `PowerEdge R740` |
| `os_product` | string | no | operating system product name |
| `logical_cpu_count` | int32 | no | logical CPU count |
| `cpu_architecture` | string | no | CPU architecture |

### `RegisterNodeRequest`

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `bootstrap_token` | string | yes | bootstrap token used to authorize registration |
| `hostname` | string | yes | node hostname |
| `device_type` | string | yes | logical device type |
| `discovery_source` | string | no | canonical discovery source persisted as `node.source` |
| `hardware_info` | `HardwareInfo` | no | optional discovery metadata |

## Example

```json
{
  "bootstrap_token": "bootstrap-token",
  "hostname": "node-01",
  "device_type": "WORKSTATION",
  "discovery_source": "windows_exporter",
  "hardware_info": {
    "primary_ipv4": "10.0.0.10",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "hardware_serial": "SER-123",
    "vendor": "Dell",
    "model": "PowerEdge R740",
    "os_product": "Windows 11",
    "logical_cpu_count": 16,
    "cpu_architecture": "amd64"
  }
}
```

## Response

`RegisterNodeResponse` is unchanged:

- `agent_id`
- `certificate`
- `private_key`

## Behavioral Notes

- The service must not hardcode `node.source` to the worker service name.
- `vendor` and `model` should be forwarded into the node record unchanged when present.
- Missing `vendor` or `model` must not block registration.
