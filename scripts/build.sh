#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Bundling ESM → CJS with esbuild..."
mkdir -p dist
npx esbuild index.js \
  --bundle \
  --platform=node \
  --target=node20 \
  --outfile=dist/bundle.cjs \
  --format=cjs \
  --legal-comments=none

echo ""
echo "Packing 3 binaries with pkg..."
npx pkg dist/bundle.cjs \
  --targets node20-win-x64,node20-macos-x64,node20-linux-x64 \
  --output bin/comandinha-print

echo ""
echo "Done."
ls -lh bin/
