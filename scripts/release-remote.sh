#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOY_HOST:?Configure DEPLOY_HOST}"
: "${DEPLOY_USER:?Configure DEPLOY_USER}"
: "${DEPLOY_SSH_KEY:?Configure DEPLOY_SSH_KEY}"
: "${DEPLOY_KNOWN_HOSTS:?Configure pinned DEPLOY_KNOWN_HOSTS}"
: "${GITHUB_REPOSITORY:?Missing repository}"
: "${GITHUB_SHA:?Missing immutable revision}"
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || exit 2
[[ "$DEPLOY_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ ]] || exit 2
[[ "$GITHUB_REPOSITORY" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]] || exit 2
[[ "$GITHUB_SHA" =~ ^[a-f0-9]{40}$ ]] || exit 2
prefix="ghcr.io/${GITHUB_REPOSITORY,,}"
private_dir=$(mktemp -d)
trap 'rm -f "$private_dir/key" "$private_dir/known_hosts"; rmdir "$private_dir"' EXIT
chmod 700 "$private_dir"
printf '%s\n' "$DEPLOY_SSH_KEY" > "$private_dir/key"
printf '%s\n' "$DEPLOY_KNOWN_HOSTS" > "$private_dir/known_hosts"
chmod 600 "$private_dir/key" "$private_dir/known_hosts"
# The host must already contain reviewed compose/config files and its private env file.
# Never rewrite secrets, migrate databases, prune images or reset volumes here.
ssh -i "$private_dir/key" -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile="$private_dir/known_hosts" "$DEPLOY_USER@$DEPLOY_HOST" \
 "cd /opt/eventconnect && export IMAGE_PREFIX='$prefix' RELEASE_TAG='$GITHUB_SHA' && docker compose --env-file .env.compose -f docker-compose.production.yml config --quiet && docker compose --env-file .env.compose -f docker-compose.production.yml pull && docker compose --env-file .env.compose -f docker-compose.production.yml run --rm --no-deps backend node scripts/verify-release-indexes.js && docker compose --env-file .env.compose -f docker-compose.production.yml up -d --no-build --wait --wait-timeout 120 && curl --fail --silent http://127.0.0.1:5000/ready >/dev/null && curl --fail --silent http://127.0.0.1:3000/ >/dev/null"
