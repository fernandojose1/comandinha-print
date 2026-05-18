#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "Building Comandinha Print binaries..."
echo "Targets: win-x64, macos-x64, linux-x64"
echo ""

npx pkg . --output bin/comandinha-print

echo ""
echo "Done."
ls -lh bin/
