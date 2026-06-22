#!/usr/bin/env bash
# Sync info@autotorental.com from our mail server (IMAP) into admin inbox.
set -euo pipefail
cd /opt/autorental/packages/api
export NODE_ENV=production
npx medusa exec ./src/scripts/sync-inbox.ts 2>&1
