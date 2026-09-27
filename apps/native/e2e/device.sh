#!/usr/bin/env bash
set -euo pipefail

adb install "$APK"
maestro test "$WALK" -e "APP_ID=$APP_ID" -e "LINK=$LINK" \
  --format junit --output "$OUT/journey.xml" --debug-output "$OUT/maestro"
echo passed > "$OUT/journey.outcome"
