#!/usr/bin/env bash
set -euo pipefail

FLASHLIGHT_DEFAULT=10
COLD_LAUNCHES=20

fresh() {
  adb uninstall "$APP_ID" > /dev/null 2>&1 || true
  adb install "$1"
}

cold_launches() {
  local launches=()
  for _ in $(seq "$1"); do
    adb shell am force-stop "$APP_ID"
    launches+=("$(adb shell am start -W -n "$APP_ID/.MainActivity" | tr -d '\r' | awk '/^TotalTime:/ { print $2 }')")
  done
  local IFS=,
  echo "[${launches[*]}]"
}

measure() {
  local side=$1 walk=$2 times=$3 walked
  printf -v walked '%q ' maestro test "$walk" -e "APP_ID=$APP_ID" -e "LINK=$LINK"
  mkdir -p "$OUT/$side"
  cold_launches "$((COLD_LAUNCHES * times))" > "$OUT/$side/startup.json"
  flashlight test --bundleId "$APP_ID" --iterationCount "$((FLASHLIGHT_DEFAULT * times))" \
    --beforeEachCommand "adb shell pm clear $APP_ID" \
    --testCommand "$walked" \
    --resultsFilePath "$OUT/$side/journey.json"
}

read_both() {
  if [ -n "${BASE_APK:-}" ]; then
    fresh "$BASE_APK"
    measure base "${BASE_WALK:?}" "$1"
  fi
  fresh "$HEAD_APK"
  measure head "$HEAD_WALK" "$1"
}

judge() {
  local held=(--no-baseline)
  if [ -n "${BASE_APK:-}" ]; then
    held=(--base-startup "$OUT/base/startup.json" --base-journey "$OUT/base/journey.json")
  fi
  node tools/device/src/index.ts \
    --head-startup "$OUT/head/startup.json" --head-journey "$OUT/head/journey.json" \
    "${held[@]}" "$@" > "$OUT/device.md"
}

fresh "$HEAD_APK"
maestro test "$HEAD_WALK" -e "APP_ID=$APP_ID" -e "LINK=$LINK" \
  --format junit --output "$OUT/journey.xml" --debug-output "$OUT/maestro"
echo passed > "$OUT/journey.outcome"

read_both 1
verdict=0
judge || verdict=$?
if [ "$verdict" -eq 3 ]; then
  read_both 2
  verdict=0
  judge --last || verdict=$?
fi
echo "$verdict" > "$OUT/measured.status"
