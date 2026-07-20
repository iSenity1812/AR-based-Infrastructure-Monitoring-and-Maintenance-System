param(
  [string]$OutputDir = "dist\collector",
  [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$CollectorRoot = $PSScriptRoot
$OutputRoot = Join-Path $CollectorRoot $OutputDir
$BinaryPath = Join-Path $OutputRoot "collector.exe"
$AssetRoot = Join-Path $CollectorRoot "internal\runtimebundle\assets"
$ConfigAssetRoot = Join-Path $AssetRoot "configs"
$RegistrationAssetRoot = Join-Path $AssetRoot "registration"

function Reset-OutputDirectory {
  if (Test-Path $OutputRoot) {
    Remove-Item -LiteralPath $OutputRoot -Recurse -Force
  }

  New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $OutputRoot "configs") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $OutputRoot "data\registration") -Force | Out-Null
  New-Item -ItemType Directory -Path (Join-Path $OutputRoot "data\buffer") -Force | Out-Null
}

function Copy-RuntimeBundle {
  Copy-Item -Path (Join-Path $ConfigAssetRoot "*") -Destination (Join-Path $OutputRoot "configs") -Recurse -Force
  Copy-Item -Path (Join-Path $RegistrationAssetRoot "ca.crt") -Destination (Join-Path $OutputRoot "data\registration\ca.crt") -Force
  Copy-Item -Path (Join-Path $RegistrationAssetRoot "ingestion-worker-config.yaml") -Destination (Join-Path $OutputRoot "data\registration\ingestion-worker-config.yaml") -Force
  Copy-Item -Path (Join-Path $CollectorRoot "README.md") -Destination (Join-Path $OutputRoot "README.md") -Force
  Copy-Item -Path (Join-Path $CollectorRoot ".env.release.example") -Destination (Join-Path $OutputRoot ".env.example") -Force
}

Push-Location $CollectorRoot
try {
  if (-not $SkipTests) {
    go test ./...
  }

  Reset-OutputDirectory

  $env:CGO_ENABLED = "0"
  $env:GOOS = "windows"
  $env:GOARCH = "amd64"
  go build -o $BinaryPath ./cmd/agent

  Copy-RuntimeBundle

  Write-Host "Collector release created at: $OutputRoot"
  Write-Host "Binary: $BinaryPath"
}
finally {
  Remove-Item Env:\CGO_ENABLED -ErrorAction SilentlyContinue
  Remove-Item Env:\GOOS -ErrorAction SilentlyContinue
  Remove-Item Env:\GOARCH -ErrorAction SilentlyContinue
  Pop-Location
}
