#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Emerald — Production setup (idempotent)
#
# Populates ./.env from .env.production.example, generates secrets, prompts
# for manual values, validates prerequisites, then builds and starts the
# docker-compose stack.
#
# Usage:
#   bash scripts/setup-production.sh           # first run / resume
#   bash scripts/setup-production.sh --force   # re-run even if .setup-done
#   DRY_RUN=true bash scripts/setup-production.sh  # skip docker build/up
#
# Compatible with Git Bash on Windows (avoids GNU-only sed -i).
# ---------------------------------------------------------------------------
set -euo pipefail

# ---- cosmetics ------------------------------------------------------------
if [[ -t 1 ]]; then
    C_RESET=$'\033[0m'
    C_BOLD=$'\033[1m'
    C_RED=$'\033[31m'
    C_GREEN=$'\033[32m'
    C_YELLOW=$'\033[33m'
    C_BLUE=$'\033[34m'
    C_CYAN=$'\033[36m'
else
    C_RESET=""; C_BOLD=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_CYAN=""
fi

log_info()    { printf '%s[info]%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
log_ok()      { printf '%s[ ok ]%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
log_warn()    { printf '%s[warn]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
log_err()     { printf '%s[err ]%s %s\n' "$C_RED" "$C_RESET" "$*" >&2; }
log_section() { printf '\n%s%s== %s ==%s\n' "$C_BOLD" "$C_CYAN" "$*" "$C_RESET"; }

# ---- constants ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
ENV_EXAMPLE="$REPO_ROOT/.env.production.example"
COMPOSE_FILE="$REPO_ROOT/docker-compose.production.yml"
SECRETS_DIR="$REPO_ROOT/secrets"
GCP_KEY="$SECRETS_DIR/gcp-key.json"
SENTINEL="$REPO_ROOT/.setup-done"

DRY_RUN="${DRY_RUN:-false}"
FORCE="false"
for arg in "$@"; do
    case "$arg" in
        --force) FORCE="true" ;;
        --dry-run) DRY_RUN="true" ;;
        -h|--help)
            grep -E '^# ' "$0" | sed 's/^# //'
            exit 0
            ;;
        *) log_warn "Unknown argument: $arg" ;;
    esac
done

# ---- prerequisites --------------------------------------------------------
check_prereqs() {
    log_section "Prerequisite checks"
    local missing=0
    for bin in docker openssl; do
        if ! command -v "$bin" >/dev/null 2>&1; then
            log_err "Missing required binary: $bin"
            missing=1
        else
            log_ok "$bin found"
        fi
    done
    if ! docker compose version >/dev/null 2>&1; then
        log_err "Missing 'docker compose' plugin (v2)"
        missing=1
    else
        log_ok "docker compose (v2) found"
    fi
    [[ $missing -eq 0 ]] || { log_err "Install missing prerequisites and retry."; exit 1; }

    [[ -f "$ENV_EXAMPLE" ]] || { log_err "Missing $ENV_EXAMPLE"; exit 1; }
    [[ -f "$COMPOSE_FILE" ]] || { log_err "Missing $COMPOSE_FILE"; exit 1; }
}

# ---- sentinel -------------------------------------------------------------
check_sentinel() {
    if [[ -f "$SENTINEL" && "$FORCE" != "true" ]]; then
        log_warn "Setup already completed (sentinel: $SENTINEL)."
        log_warn "Re-run with --force to start over."
        exit 0
    fi
}

# ---- .env bootstrap -------------------------------------------------------
bootstrap_env() {
    log_section "Bootstrapping .env"
    if [[ ! -f "$ENV_FILE" ]]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        log_ok "Copied .env.production.example -> .env"
    else
        log_info ".env already exists — updating in place"
    fi
}

# ---- .env helpers (portable: macOS + Git Bash) ----------------------------

# Portable in-place sed: writes a backup then removes it.
portable_sed_i() {
    local expr="$1"
    local file="$2"
    sed -e "$expr" "$file" > "$file.tmp.$$"
    mv "$file.tmp.$$" "$file"
}

# Escape for use inside a sed replacement (s|...|ESCAPED|).
sed_escape_repl() {
    # Escape backslash, pipe, and ampersand.
    printf '%s' "$1" | sed -e 's/[\\|&]/\\&/g'
}

get_var() {
    local name="$1"
    # Prints current value (without quotes) or empty string.
    if grep -qE "^${name}=" "$ENV_FILE"; then
        grep -E "^${name}=" "$ENV_FILE" | head -n1 | cut -d= -f2-
    else
        echo ""
    fi
}

set_var() {
    local name="$1"
    local value="$2"
    local escaped
    escaped="$(sed_escape_repl "$value")"
    if grep -qE "^${name}=" "$ENV_FILE"; then
        portable_sed_i "s|^${name}=.*|${name}=${escaped}|" "$ENV_FILE"
    else
        printf '%s=%s\n' "$name" "$value" >> "$ENV_FILE"
    fi
}

# Returns 0 (true) when value is empty or still a CHANGE_ME placeholder.
needs_value() {
    local current="$1"
    [[ -z "$current" ]] && return 0
    case "$current" in
        CHANGE_ME*) return 0 ;;
        *) return 1 ;;
    esac
}

prompt_if_empty() {
    local name="$1"
    local label="$2"
    local default="${3:-}"
    local current
    current="$(get_var "$name")"
    if needs_value "$current"; then
        local value=""
        if [[ -n "$default" ]]; then
            read -rp "$label [$default]: " value || true
            value="${value:-$default}"
        else
            while [[ -z "$value" ]]; do
                read -rp "$label: " value || true
                [[ -z "$value" ]] && log_warn "Value required."
            done
        fi
        set_var "$name" "$value"
        log_ok "$name set"
    else
        log_info "$name already set — keeping existing value"
    fi
}

# ---- secret generation ----------------------------------------------------

# base64 without wrapping, portable across GNU/BSD.
b64_oneline() {
    if base64 --help 2>&1 | grep -q '\-w'; then
        base64 -w0
    else
        base64 | tr -d '\n'
    fi
}

generate_random_secret() {
    # 32 chars, URL-safe-ish (stripped of +/= and newlines).
    openssl rand -base64 48 | tr -d '+/=\n' | cut -c1-32
}

generate_jwt_keys() {
    local priv_current pub_current
    priv_current="$(get_var JWT_PRIVATE_KEY)"
    pub_current="$(get_var JWT_PUBLIC_KEY)"
    if needs_value "$priv_current" || needs_value "$pub_current"; then
        log_info "Generating RS256 JWT keypair..."
        local tmp_priv tmp_pub
        tmp_priv="$(mktemp)"
        tmp_pub="$(mktemp)"
        openssl genrsa -out "$tmp_priv" 2048 2>/dev/null
        openssl rsa -in "$tmp_priv" -pubout -out "$tmp_pub" 2>/dev/null
        local priv_b64 pub_b64
        priv_b64="$(b64_oneline < "$tmp_priv")"
        pub_b64="$(b64_oneline < "$tmp_pub")"
        set_var JWT_PRIVATE_KEY "$priv_b64"
        set_var JWT_PUBLIC_KEY  "$pub_b64"
        rm -f "$tmp_priv" "$tmp_pub"
        log_ok "JWT_PRIVATE_KEY / JWT_PUBLIC_KEY generated"
    else
        log_info "JWT keys already set — keeping them"
    fi
}

generate_postgres_password() {
    local current
    current="$(get_var POSTGRES_PASSWORD)"
    if needs_value "$current"; then
        local pw
        pw="$(generate_random_secret)"
        set_var POSTGRES_PASSWORD "$pw"
        log_ok "POSTGRES_PASSWORD generated"
    else
        log_info "POSTGRES_PASSWORD already set — keeping it"
    fi
}

generate_revalidate_secret() {
    local current
    current="$(get_var DOCS_REVALIDATE_SECRET)"
    if needs_value "$current"; then
        local s
        s="$(generate_random_secret)"
        set_var DOCS_REVALIDATE_SECRET "$s"
        log_ok "DOCS_REVALIDATE_SECRET generated"
    else
        log_info "DOCS_REVALIDATE_SECRET already set — keeping it"
    fi
}

derive_database_url() {
    local user db pw
    user="$(get_var POSTGRES_USER)"
    db="$(get_var POSTGRES_DB)"
    pw="$(get_var POSTGRES_PASSWORD)"
    [[ -n "$user" && -n "$db" && -n "$pw" ]] || { log_err "Cannot derive DATABASE_URL — Postgres vars missing"; exit 1; }
    local url="postgresql://${user}:${pw}@postgres:5432/${db}?schema=public"
    set_var DATABASE_URL "$url"
    log_ok "DATABASE_URL derived"
}

# ---- interactive prompts --------------------------------------------------
prompt_core_values() {
    log_section "Core configuration"
    prompt_if_empty DOMAIN     "Root domain (e.g. example.com)"
    prompt_if_empty ACME_EMAIL "Let's Encrypt contact email"

    log_section "Google OAuth 2.0"
    log_info "Create a client at https://console.cloud.google.com/apis/credentials"
    prompt_if_empty GOOGLE_OAUTH2_CLIENT_ID     "Google OAuth2 Client ID"
    prompt_if_empty GOOGLE_OAUTH2_CLIENT_SECRET "Google OAuth2 Client Secret"
}

prompt_embedding_provider() {
    log_section "Embedding provider"
    local current
    current="$(get_var EMBEDDING_PROVIDER)"
    if [[ -z "$current" ]] || needs_value "$current"; then
        local provider=""
        while true; do
            read -rp "Provider (voyage | openai | google | ollama) [voyage]: " provider || true
            provider="${provider:-voyage}"
            case "$provider" in
                voyage|openai|google|ollama) break ;;
                *) log_warn "Invalid choice: $provider" ;;
            esac
        done
        set_var EMBEDDING_PROVIDER "$provider"
        log_ok "EMBEDDING_PROVIDER=$provider"
    else
        log_info "EMBEDDING_PROVIDER=$current — keeping it"
    fi

    local provider
    provider="$(get_var EMBEDDING_PROVIDER)"

    case "$provider" in
        voyage)
            prompt_if_empty VOYAGE_API_KEY "Voyage AI API key"
            ;;
        openai)
            prompt_if_empty OPENAI_API_KEY "OpenAI API key"
            ;;
        google)
            prompt_if_empty GOOGLE_PROJECT_ID "GCP project ID (for Vertex AI)"
            # Default path inside container — matches compose volume mount.
            if needs_value "$(get_var GOOGLE_APPLICATION_CREDENTIALS)"; then
                set_var GOOGLE_APPLICATION_CREDENTIALS "/run/secrets/gcp-key.json"
                log_ok "GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-key.json"
            fi
            log_info "Ensure the service account mounted at $GCP_KEY has Vertex AI User role."
            ;;
        ollama)
            log_warn "Ollama support fully lands in Track A Chunk 4."
            log_warn "You must run an Ollama container reachable at the URL below."
            prompt_if_empty OLLAMA_BASE_URL "Ollama base URL" "http://ollama:11434"
            ;;
    esac
}

prompt_gcp_storage() {
    log_section "GCP Cloud Storage"
    prompt_if_empty GCP_BUCKET_NAME "GCS bucket name (for uploads)"
}

# ---- derived values -------------------------------------------------------
apply_derived_values() {
    log_section "Deriving dependent values"
    local domain
    domain="$(get_var DOMAIN)"
    [[ -n "$domain" && "$domain" != CHANGE_ME* ]] || { log_err "DOMAIN still unset"; exit 1; }
    set_var GOOGLE_OAUTH2_REDIRECT_URL "https://api.${domain}/auth/google/callback"
    set_var CORS_ALLOWED_ORIGINS "https://docs.${domain},https://app.${domain}"
    log_ok "GOOGLE_OAUTH2_REDIRECT_URL / CORS_ALLOWED_ORIGINS derived from DOMAIN"
    derive_database_url
}

# ---- GCP key file ---------------------------------------------------------
ensure_gcp_key() {
    log_section "GCP service account key"
    mkdir -p "$SECRETS_DIR"
    if [[ ! -f "$GCP_KEY" ]]; then
        log_warn "Missing: $GCP_KEY"
        log_warn "Download the service account JSON from GCP and place it at that path."
        read -rp "Press Enter after placing the file (or Ctrl-C to abort)..." _ || true
    fi
    if [[ ! -f "$GCP_KEY" ]]; then
        log_err "Still missing: $GCP_KEY — aborting."
        exit 1
    fi
    chmod 600 "$GCP_KEY" 2>/dev/null || log_warn "chmod 600 failed (ok on Windows/NTFS)"
    log_ok "GCP key present at $GCP_KEY"
}

# ---- final validation -----------------------------------------------------
validate_required() {
    log_section "Final validation"
    local required=(
        DOMAIN
        ACME_EMAIL
        POSTGRES_PASSWORD
        DATABASE_URL
        JWT_PRIVATE_KEY
        JWT_PUBLIC_KEY
        GOOGLE_OAUTH2_CLIENT_ID
        GOOGLE_OAUTH2_CLIENT_SECRET
        GOOGLE_OAUTH2_REDIRECT_URL
        GCP_BUCKET_NAME
        EMBEDDING_PROVIDER
        DOCS_REVALIDATE_SECRET
    )
    local bad=0
    for var in "${required[@]}"; do
        local v
        v="$(get_var "$var")"
        if [[ -z "$v" ]] || [[ "$v" == CHANGE_ME* ]]; then
            log_err "$var is missing or still CHANGE_ME"
            bad=1
        fi
    done
    [[ $bad -eq 0 ]] || { log_err "Fix the values above and re-run."; exit 1; }
    log_ok "All required variables populated"
}

# ---- compose: build/up ----------------------------------------------------
compose_build_and_up() {
    log_section "Docker compose"
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY_RUN=true — skipping docker build + up"
        return 0
    fi

    local with_proxy="n"
    read -rp "Use bundled Caddy reverse proxy? [y/N]: " with_proxy || true
    with_proxy="${with_proxy:-n}"

    local args=(-f "$COMPOSE_FILE" --env-file "$ENV_FILE")
    if [[ "$with_proxy" =~ ^[Yy]$ ]]; then
        args+=(--profile with-proxy)
        log_info "Using --profile with-proxy (Caddy)"
    else
        log_info "Skipping bundled Caddy — wire api/docs/workspace to external proxy"
    fi

    log_info "Building images..."
    docker compose "${args[@]}" build

    log_info "Starting stack..."
    docker compose "${args[@]}" up -d
}

wait_for_health() {
    if [[ "$DRY_RUN" == "true" ]]; then return 0; fi
    log_section "Waiting for containers to become healthy"
    local deadline=$(( $(date +%s) + 180 ))
    local services=(postgres api docs workspace)
    while [[ $(date +%s) -lt $deadline ]]; do
        local all_ok=1
        for svc in "${services[@]}"; do
            local cid status
            cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q "$svc" 2>/dev/null || true)"
            if [[ -z "$cid" ]]; then
                all_ok=0; break
            fi
            status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo "unknown")"
            case "$status" in
                healthy|running)
                    # Accept "running" only for services without a healthcheck defined.
                    if [[ "$status" == "running" ]]; then
                        local has_hc
                        has_hc="$(docker inspect -f '{{if .State.Health}}yes{{else}}no{{end}}' "$cid")"
                        [[ "$has_hc" == "no" ]] || { all_ok=0; }
                    fi
                    ;;
                *) all_ok=0 ;;
            esac
        done
        if [[ $all_ok -eq 1 ]]; then
            log_ok "All services healthy"
            return 0
        fi
        sleep 5
    done
    log_err "Timed out waiting for services to become healthy (3 min)."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
    exit 1
}

optional_seed() {
    if [[ "$DRY_RUN" == "true" ]]; then return 0; fi
    log_section "Prisma seed (optional)"
    local answer="n"
    read -rp "Run prisma db seed now? [y/N]: " answer || true
    answer="${answer:-n}"
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm migrate \
            sh -c "node_modules/.bin/prisma db seed --schema=apps/api/src/infra/database/prisma/schema.prisma" \
            || log_warn "Seed command exited non-zero (ignore if you have no seed script)."
    else
        log_info "Skipping seed"
    fi
}

write_sentinel() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warn "DRY_RUN=true — not writing sentinel"
        return 0
    fi
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$SENTINEL"
    log_ok "Sentinel written: $SENTINEL"
}

print_summary() {
    local domain
    domain="$(get_var DOMAIN)"
    log_section "Setup complete"
    printf '%sURLs:%s\n' "$C_BOLD" "$C_RESET"
    printf '  docs       https://docs.%s\n' "$domain"
    printf '  workspace  https://app.%s\n'  "$domain"
    printf '  api        https://api.%s\n'  "$domain"
    printf '\n%sNext steps:%s\n' "$C_BOLD" "$C_RESET"
    printf '  1. Point DNS A records for docs.%s, app.%s, api.%s to this VPS IP.\n' "$domain" "$domain" "$domain"
    printf '  2. If using bundled Caddy: TLS provisions automatically on first request.\n'
    printf '  3. Confirm health:  docker compose -f docker-compose.production.yml ps\n'
    printf '  4. Tail logs:       docker compose -f docker-compose.production.yml logs -f api\n'
}

# ---- main -----------------------------------------------------------------
main() {
    check_prereqs
    check_sentinel
    bootstrap_env

    # Auto-generate first so prompts for derived values work cleanly.
    generate_jwt_keys
    generate_postgres_password
    generate_revalidate_secret

    prompt_core_values
    prompt_embedding_provider
    prompt_gcp_storage

    apply_derived_values
    ensure_gcp_key
    validate_required

    compose_build_and_up
    wait_for_health
    optional_seed
    write_sentinel
    print_summary
}

main "$@"
