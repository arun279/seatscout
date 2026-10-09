const BASELINE = ".github/workflows/baseline.yml";
const WORKFLOW = ".github/workflows/ci.yml";

export const DEVICE_CLAIMS = [
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
    says: /The judge rounds this commit's median and the previous run's worst to those same places/,
    holds: "the precision each measure is compared at",
    pattern: "roundedTo(value, axis.decimals)",
    paths: ["tools/device/src"],
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
    pattern: 'application.$["android:gwpAsanMode"] = "never"',
    paths: ["apps/native/plugins"],
    files: 1,
  },
];
