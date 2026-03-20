#!/bin/bash

# Generate RSA keys for JWT RS256 and output as base64
# Works on Linux, macOS, and Windows (Git Bash/WSL)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Generating RSA-256 key pair for JWT...${NC}\n"

# Check if openssl is available
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}Error: openssl is not installed or not in PATH${NC}"
    echo "Please install OpenSSL:"
    echo "  - Linux: sudo apt install openssl"
    echo "  - macOS: brew install openssl"
    echo "  - Windows: Install Git Bash or WSL"
    exit 1
fi

# Create temp directory
TEMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'jwt-keys')
PRIVATE_KEY="$TEMP_DIR/private.pem"
PUBLIC_KEY="$TEMP_DIR/public.pem"

# Generate private key (2048 bits for RS256)
openssl genpkey -algorithm RSA -out "$PRIVATE_KEY" -pkeyopt rsa_keygen_bits:2048 2>/dev/null

# Extract public key
openssl rsa -pubout -in "$PRIVATE_KEY" -out "$PUBLIC_KEY" 2>/dev/null

# Convert to base64 (handle different base64 implementations)
if base64 --wrap=0 "$PRIVATE_KEY" &>/dev/null; then
    # GNU base64 (Linux)
    PRIVATE_KEY_BASE64=$(base64 --wrap=0 "$PRIVATE_KEY")
    PUBLIC_KEY_BASE64=$(base64 --wrap=0 "$PUBLIC_KEY")
elif base64 -w 0 "$PRIVATE_KEY" &>/dev/null; then
    # Alternative GNU base64
    PRIVATE_KEY_BASE64=$(base64 -w 0 "$PRIVATE_KEY")
    PUBLIC_KEY_BASE64=$(base64 -w 0 "$PUBLIC_KEY")
else
    # BSD/macOS base64 (no wrap option needed, doesn't wrap by default with -i)
    PRIVATE_KEY_BASE64=$(base64 -i "$PRIVATE_KEY" | tr -d '\n')
    PUBLIC_KEY_BASE64=$(base64 -i "$PUBLIC_KEY" | tr -d '\n')
fi

# Cleanup temp files
rm -rf "$TEMP_DIR"

# Output
echo -e "${GREEN}=== JWT_PRIVATE_KEY (Base64) ===${NC}"
echo "$PRIVATE_KEY_BASE64"
echo ""
echo -e "${GREEN}=== JWT_PUBLIC_KEY (Base64) ===${NC}"
echo "$PUBLIC_KEY_BASE64"
echo ""
echo -e "${YELLOW}Add these to your .env file:${NC}"
echo ""
echo "JWT_PRIVATE_KEY=\"$PRIVATE_KEY_BASE64\""
echo ""
echo "JWT_PUBLIC_KEY=\"$PUBLIC_KEY_BASE64\""
