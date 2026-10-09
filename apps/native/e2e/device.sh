#!/usr/bin/env bash
set -euo pipefail

adb install "$APK"
adb logcat -b crash -c
if ! maestro test "$WALK" -e "APP_ID=$APP_ID" -e "LINK=$LINK" \
  --format junit --output "$OUT/journey.xml" --debug-output "$OUT/maestro"; then
  fatal="$(adb logcat -b crash -d | grep -m 1 -E 'Fatal signal|FATAL EXCEPTION' || true)"
  if [ -n "$fatal" ]; then
    echo "::error::The app crashed during the walk, so the step that failed was waiting on a dead app: $fatal"
    adb logcat -b crash -d
  fi
  exit 1
fi
echo passed > "$OUT/journey.outcome"
