import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { argv, stdout } from "node:process";
import { parseArgs } from "node:util";

const REASON =
  /the bootstrap answered \d{3}|\/napi\/[\w/-]+ (?:answered \d{3}|could not be reached)/;

const UNREAD =
  "The nightly contract check could not read the live Source, so nothing was judged.";
const JUDGED =
  "The nightly contract check read the live Source, and it no longer answers as this repository records.";

const { values } = parseArgs({
  args: argv.slice(2),
  options: {
    report: { type: "string" },
    log: { type: "string" },
    out: { type: "string" },
  },
});

const readOr = (path, fallback) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return fallback;
  }
};

const report = JSON.parse(readOr(values.report, '{"testResults":[]}'));
const unread = report.testResults.length === 0;

const named = unread
  ? [REASON.exec(readOr(values.log, ""))?.[0] ?? "the run named no reason"]
  : report.testResults.flatMap((file) =>
      file.assertionResults
        .filter((test) => test.status === "failed")
        .flatMap((test) =>
          test.meta.contract?.length ? test.meta.contract : [test.fullName],
        ),
    );

const findings = named.length > 0 ? named : ["the run failed without a test"];

writeFileSync(
  values.out,
  `${unread ? UNREAD : JUDGED}\n\n${findings.map((line) => `- ${line}\n`).join("")}`,
);

stdout.write(
  `${createHash("sha256")
    .update(findings.map((line) => line.replaceAll(/\d/g, "")).join("\n"))
    .digest("hex")
    .slice(0, 12)}\n`,
);
