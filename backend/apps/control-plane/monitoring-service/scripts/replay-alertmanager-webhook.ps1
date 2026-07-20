param(
  [Parameter(Mandatory = $true)]
  [string]$PayloadPath,

  [Parameter(Mandatory = $false)]
  [string]$Endpoint = "http://localhost:4003/api/v1/internal/alerts/external/sync",

  [Parameter(Mandatory = $false)]
  [string]$SharedSecret = "change-me-monitoring-sync-secret"
)

$rawContent = Get-Content -Raw $PayloadPath | ConvertFrom-Json

if (-not $rawContent.json) {
  throw "Expected the payload file to contain a top-level 'json' property from the webhook sink capture."
}

$requestBody = $rawContent.json | ConvertTo-Json -Depth 100

Invoke-RestMethod `
  -Method Post `
  -Uri $Endpoint `
  -Headers @{
    "x-monitoring-sync-secret" = $SharedSecret
    "x-request-id" = [guid]::NewGuid().ToString()
    "x-correlation-id" = [guid]::NewGuid().ToString()
  } `
  -ContentType "application/json" `
  -Body $requestBody
