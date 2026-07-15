#!/bin/bash
set -e
cd "$(dirname "$0")"

VERSION=$(git rev-parse --short HEAD)
FILES=(index.html tools.html)

restore() {
  for f in "${FILES[@]}"; do
    [ -f "$f.bak" ] && mv "$f.bak" "$f"
  done
}
trap restore EXIT

for f in "${FILES[@]}"; do
  cp "$f" "$f.bak"
  sed -i '' "s/__VERSION__/$VERSION/g" "$f"
done

wrangler pages deploy . --project-name myip --branch main "$@"
