const BASELINE = ".github/workflows/baseline.yml";
const WORKFLOW = ".github/workflows/ci.yml";
const POOLED =
  /are three of the pooled standard deviation: 0\.7 FPS, 9\.6 per cent CPU and 7\.1 MB/;

const limit = (says, holds, pattern) => ({
  adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
  says,
  holds,
  pattern,
  paths: ["tools/device/src"],
  files: 1,
});

export const DEVICE_CLAIMS = [
  limit(POOLED, "the frame rate's limit", "drift: 0.7,"),
  limit(POOLED, "the CPU's limit", "drift: 9.6,"),
  limit(POOLED, "the memory's limit", "drift: 7.1,"),
  limit(
    /The walk's limit, 31576 ms, comes from the ten alone/,
    "the walk's limit",
    "drift: 31576,",
  ),
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /\*\*What the emulator reads is measured on main, held to the run before/,
    holds: "the Flashlight reading of the walk",
    pattern: "flashlight test",
    paths: [".github", "apps/native/e2e"],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /it runs on main as a trend with an alarm/,
    holds: "a pull request that runs the reading",
    pattern: "e2e/measure.sh",
    paths: [WORKFLOW],
    files: 0,
    witness: [BASELINE],
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /files an issue labelled `device-red`/,
    holds: "the alarm the reading on main files",
    pattern: "gh issue create --label device-red",
    paths: [BASELINE],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /A push never\s+cancels a reading in progress/,
    holds: "the Baseline concurrency that lets a reading finish",
    pattern: "cancel-in-progress: false",
    paths: [BASELINE],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /The judge rounds both medians and the figure past which a measure is worse to those same places/,
    holds: "the precision each measure is compared at",
    pattern: "roundedTo(value, axis.decimals)",
    paths: ["tools/device/src"],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /A reading that did not hold is kept as `device-reading-worse`/,
    holds: "the artifact a reading that did not hold leaves",
    pattern: "'device-reading-worse'",
    paths: [BASELINE],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /run Baseline on main from the Actions tab with `accept` set to the reason/,
    holds: "the input that keeps a reading by hand",
    pattern: "inputs.accept",
    paths: [BASELINE],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /`android` job reads them with `cache-read-only`/,
    holds: "the pull request's read-only Gradle caches",
    pattern: "cache-read-only: true",
    paths: [WORKFLOW],
    files: 1,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /The Gradle init script\s+`\.github\/gradle\/preinstalled-android-tools\.gradle` sets every Android project/,
    holds: "the two Android builds that pin the runner's NDK and CMake",
    pattern:
      "--init-script ../../../.github/gradle/preinstalled-android-tools.gradle",
    paths: [".github/workflows"],
    files: 2,
  },
  {
    adr: "0006-gates-cite-a-standard-or-measure-a-regression.md",
    says: /sets\s+`android:gwpAsanMode` to `never` on the application/,
    holds: "the Android app's GWP-ASan setting",
    pattern: '"android:gwpAsanMode"',
    paths: ["apps/native/plugins"],
    files: 1,
  },
];
