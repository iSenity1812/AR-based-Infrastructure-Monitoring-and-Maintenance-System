param(
  [string]$PkiDir = "$PSScriptRoot\pki",
  [string]$CommonName = "local-ingestion.local"
)

$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Path $PkiDir -Force | Out-Null

function Resolve-OpenSsl {
  if ($env:OPENSSL_BIN -and (Test-Path $env:OPENSSL_BIN)) {
    return $env:OPENSSL_BIN
  }

  $command = Get-Command openssl -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\Program Files\OpenSSL-Win32\bin\openssl.exe",
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files\Git\mingw64\bin\openssl.exe"
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "OpenSSL executable not found. Set OPENSSL_BIN to the full openssl.exe path."
}

$openssl = Resolve-OpenSsl

$caKey = Join-Path $PkiDir "ca.key"
$caCert = Join-Path $PkiDir "ca.crt"
$serverKey = Join-Path $PkiDir "server.key"
$serverCsr = Join-Path $PkiDir "server.csr"
$serverCert = Join-Path $PkiDir "server.crt"
$serverExt = Join-Path $PkiDir "server.ext"

if (!(Test-Path $caKey) -or !(Test-Path $caCert)) {
  & $openssl req `
    -x509 `
    -newkey rsa:4096 `
    -nodes `
    -keyout $caKey `
    -out $caCert `
    -days 3650 `
    -sha256 `
    -subj "/CN=local-ingestion-ca/O=AR Monitoring Local CA"
}

@"
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:local-ingestion.local,DNS:localhost,DNS:host.docker.internal,IP:127.0.0.1
"@ | Set-Content -Path $serverExt -Encoding ascii

& $openssl genrsa -out $serverKey 2048
& $openssl req -new -key $serverKey -out $serverCsr -subj "/CN=$CommonName"
& $openssl x509 `
  -req `
  -in $serverCsr `
  -CA $caCert `
  -CAkey $caKey `
  -CAcreateserial `
  -out $serverCert `
  -days 825 `
  -sha256 `
  -extfile $serverExt

Write-Host "Generated nginx TLS assets in $PkiDir"
