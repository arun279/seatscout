#!/usr/bin/env bash
set -euo pipefail

printf -v walked '%q ' maestro test "$WALK" -e "APP_ID=$APP_ID" -e "LINK=$LINK"
flashlight test --bundleId "$APP_ID" \
  --beforeEachCommand "adb shell pm clear $APP_ID" \
  --testCommand "$walked" \
  --resultsFilePath "$OUT/journey.json"
