#!/usr/bin/env bash
set -euo pipefail

fresh() {
  adb uninstall "$APP_ID" > /dev/null 2>&1 || true
  adb install "$1"
}

measure() {
  local side=$1 walk=$2 walked
  printf -v walked '%q ' maestro test "$walk" -e "APP_ID=$APP_ID" -e "LINK=$LINK"
  mkdir -p "$OUT/$side"
  flashlight test --bundleId "$APP_ID" \
    --beforeEachCommand "adb shell pm clear $APP_ID" \
    --testCommand "$walked" \
    --resultsFilePath "$OUT/$side/journey.json"
}

fresh "$HEAD_APK"
maestro test "$HEAD_WALK" -e "APP_ID=$APP_ID" -e "LINK=$LINK" \
  --format junit --output "$OUT/journey.xml" --debug-output "$OUT/maestro"
echo passed > "$OUT/journey.outcome"

held=(--no-baseline)
if [ -n "${BASE_APK:-}" ]; then
  fresh "$BASE_APK"
  measure base "${BASE_WALK:?}"
  held=(--base-journey "$OUT/base/journey.json")
fi
fresh "$HEAD_APK"
measure head "$HEAD_WALK"
verdict=0
node tools/device/src/index.ts --head-journey "$OUT/head/journey.json" "${held[@]}" \
  > "$OUT/device.md" || verdict=$?
echo "$verdict" > "$OUT/measured.status"
