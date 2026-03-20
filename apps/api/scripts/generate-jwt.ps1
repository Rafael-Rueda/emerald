# Generate RSA keys for JWT RS256 and output as base64
# PowerShell version for Windows

$ErrorActionPreference = "SilentlyContinue"

Write-Host "Generating RSA-256 key pair for JWT..." -ForegroundColor Yellow
Write-Host ""

# Check if openssl is available
$opensslPath = $null

# Try common locations
$possiblePaths = @(
    "openssl",
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files\OpenSSL-Win64\bin\openssl.exe",
    "C:\Program Files (x86)\OpenSSL-Win32\bin\openssl.exe"
)

foreach ($path in $possiblePaths) {
    try {
        $null = & $path version 2>$null
        $opensslPath = $path
        break
    } catch {
        continue
    }
}

if (-not $opensslPath) {
    Write-Host "Error: openssl is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install OpenSSL via one of these methods:"
    Write-Host "  1. Install Git for Windows (includes OpenSSL): https://git-scm.com/"
    Write-Host "  2. Install OpenSSL directly: https://slproweb.com/products/Win32OpenSSL.html"
    Write-Host "  3. Use winget: winget install OpenSSL"
    exit 1
}

# Create temp directory
$tempDir = Join-Path $env:TEMP "jwt-keys-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$privateKeyPath = Join-Path $tempDir "private.pem"
$publicKeyPath = Join-Path $tempDir "public.pem"

try {
    # Generate private key (2048 bits for RS256)
    & $opensslPath genpkey -algorithm RSA -out $privateKeyPath -pkeyopt rsa_keygen_bits:2048 2>&1 | Out-Null

    # Extract public key
    & $opensslPath rsa -pubout -in $privateKeyPath -out $publicKeyPath 2>&1 | Out-Null

    # Verify files were created
    if (-not (Test-Path $privateKeyPath) -or -not (Test-Path $publicKeyPath)) {
        Write-Host "Error: Failed to generate keys" -ForegroundColor Red
        exit 1
    }

    # Read and convert to base64
    $privateKeyBytes = [System.IO.File]::ReadAllBytes($privateKeyPath)
    $publicKeyBytes = [System.IO.File]::ReadAllBytes($publicKeyPath)

    $privateKeyBase64 = [Convert]::ToBase64String($privateKeyBytes)
    $publicKeyBase64 = [Convert]::ToBase64String($publicKeyBytes)

    # Output
    Write-Host "=== JWT_PRIVATE_KEY (Base64) ===" -ForegroundColor Green
    Write-Host $privateKeyBase64
    Write-Host ""
    Write-Host "=== JWT_PUBLIC_KEY (Base64) ===" -ForegroundColor Green
    Write-Host $publicKeyBase64
    Write-Host ""
    Write-Host "Add these to your .env file:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "JWT_PRIVATE_KEY=`"$privateKeyBase64`""
    Write-Host ""
    Write-Host "JWT_PUBLIC_KEY=`"$publicKeyBase64`""

} finally {
    # Cleanup
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
