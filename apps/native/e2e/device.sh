#!/usr/bin/env bash
set -euo pipefail

FLASHLIGHT_DEFAULT=10

fresh() {
  adb uninstall "$APP_ID" > /dev/null 2>&1 || true
  adb install "$1"
}

measure() {
  local side=$1 walk=$2 iterations=$3 walked
  printf -v walked '%q ' maestro test "$walk" -e "APP_ID=$APP_ID" -e "LINK=$LINK"
  mkdir -p "$OUT/$side"
  flashlight test --bundleId "$APP_ID" --iterationCount "$iterations" \
    --beforeEachCommand "adb shell pm clear $APP_ID" \
    --testCommand "adb shell am start -W -n $APP_ID/.MainActivity" \
    --resultsFilePath "$OUT/$side/startup.json"
  flashlight test --bundleId "$APP_ID" --iterationCount "$iterations" \
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

adb shell cmd overlay list | grep navbar
adb shell cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.gestural
for _ in $(seq 30); do
  [ "$(adb shell settings get secure navigation_mode | tr -d '\r')" = 2 ] && break
  sleep 1
done
if [ "$(adb shell settings get secure navigation_mode | tr -d '\r')" != 2 ]; then
  echo "The emulator would not navigate by gesture, so the walk cannot test a back gesture." >&2
  exit 1
fi
adb shell am start -W -a android.settings.WIRELESS_SETTINGS > /dev/null
before=$(adb shell dumpsys activity activities | grep -m 1 topResumedActivity)
adb shell input swipe 2 400 240 400 250
sleep 2
after=$(adb shell dumpsys activity activities | grep -m 1 topResumedActivity)
echo "A system edge swipe on Settings moved from [$before] to [$after]."
adb shell am force-stop com.android.settings

fresh "$HEAD_APK"
maestro test "$HEAD_WALK" -e "APP_ID=$APP_ID" -e "LINK=$LINK" \
  --format junit --output "$OUT/journey.xml" --debug-output "$OUT/maestro"
echo passed > "$OUT/journey.outcome"

read_both "$FLASHLIGHT_DEFAULT"
verdict=0
judge || verdict=$?
if [ "$verdict" -eq 3 ]; then
  read_both "$((FLASHLIGHT_DEFAULT * 2))"
  verdict=0
  judge --last || verdict=$?
fi
echo "$verdict" > "$OUT/measured.status"
