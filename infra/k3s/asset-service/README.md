# Asset Service Deployment

This directory contains the `k3s` manifests for the `asset-service` dev deployment target.

## Required secret

Create a Kubernetes secret named `asset-service-secrets` in the target namespace with these keys:

- `ASSET_MONGODB_URI` or `MONGODB_URI`
- `JWT_ACCESS_SECRET`

Optional keys:

- `ACCESS_TOKEN_SECRET`

The CD workflow supports two kubeconfig bootstrap modes:

1. `KUBE_CONFIG` GitHub secret
2. Google Cloud Workload Identity Federation plus a Secret Manager secret referenced by `GCP_K3S_KUBECONFIG_SECRET`

The workflow applies the namespace, config map, service, and deployment, then updates the deployment image to the commit SHA tag published to `GHCR`.
