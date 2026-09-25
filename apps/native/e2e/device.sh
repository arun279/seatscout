#!/usr/bin/env bash
set -euo pipefail

journey=(maestro test apps/native/e2e/journey.yaml -e "APP_ID=$APP_ID" -e "LINK=$LINK")
printf -v journeyed '%q ' "${journey[@]}"

adb install -r "$APK"
"${journey[@]}" --format junit --output "$OUT/journey.xml" --debug-output "$OUT/maestro"
echo passed > "$OUT/journey.outcome"

flashlight test --bundleId "$APP_ID" \
  --testCommand "adb shell am start -W -n $APP_ID/.MainActivity" \
  --resultsFilePath "$OUT/startup.json"
flashlight test --bundleId "$APP_ID" \
  --testCommand "$journeyed" \
  --resultsFilePath "$OUT/journey.json"
