# Identity Service Deployment

This directory contains the `k3s` manifests for the `identity-service` dev deployment target.

## Required secret

Create a Kubernetes secret named `identity-service-secrets` in the target namespace with these keys:

- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

The CD workflow applies the namespace, config map, service, and deployment, then updates the deployment image to the commit SHA tag published to `GHCR`.

It supports two kubeconfig bootstrap modes:

1. `KUBE_CONFIG` GitHub secret
2. Google Cloud Workload Identity Federation plus a Secret Manager secret referenced by `GCP_K3S_KUBECONFIG_SECRET`
