#!/bin/bash
set -e

pnpm install --no-frozen-lockfile

# Only run DB push if the db package has a push script
if pnpm --filter @workspace/db run push-force 2>/dev/null; then
  echo "DB schema pushed"
else
  echo "Skipping DB push (not applicable)"
fi
