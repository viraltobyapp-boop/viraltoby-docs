#!/bin/sh

# Generate htpasswd from environment variables
ADMIN_USER="${DOCS_ADMIN_USER:-admin}"
ADMIN_PASS="${DOCS_ADMIN_PASS:-viraltoby2026}"

htpasswd -cb /etc/nginx/.htpasswd "$ADMIN_USER" "$ADMIN_PASS"

exec nginx -g "daemon off;"
