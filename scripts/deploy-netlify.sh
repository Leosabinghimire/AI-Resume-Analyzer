#!/usr/bin/env bash
# Deploy the frontend to Netlify from a Linux shell (WSL works on Windows).
#
# Netlify's Next.js runtime must build on Linux: a Windows build records the server handler with a
# backslash path and every route 404s. This script builds a clean clone of the pushed main branch.
#
# Requires Node 22, a Netlify login (`npx netlify-cli login` once, or NETLIFY_AUTH_TOKEN), and:
#   NETLIFY_SITE_ID=<site id> ./scripts/deploy-netlify.sh
set -euo pipefail

: "${NETLIFY_SITE_ID:?Set NETLIFY_SITE_ID to the Netlify site id}"
REPO="${REPO:-https://github.com/Leosabinghimire/AI-Resume-Analyzer.git}"
BRANCH="${BRANCH:-main}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$WORK"
cd "$WORK/frontend"
echo "Deploying commit $(git rev-parse --short HEAD)"
npm ci --no-fund --no-audit --loglevel=error

# --functions is required for CLI deploys; without it the Next.js server handler is not uploaded
# and the site serves 404s. BACKEND_URL is read from the site's Netlify environment variables.
npx -y netlify-cli@27.13.0 deploy --build --prod --functions .netlify/functions-internal --site "$NETLIFY_SITE_ID"
