import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { fakeUpstream } from "@seatscout/core/testing";

export const ASKING = "/?area=75006&date=2026-08-28&partySize=2";
export const TONIGHT: string = `${ASKING}&movie=245569`;

const WCAG: readonly string[] = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
];

const CROSS_ORIGIN = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
};

export const answeredByTheCorpus = async (page: Page): Promise<void> => {
  const upstream = fakeUpstream({
    seed: 4,
    standInAuditoriums: true,
    standInTheaters: true,
  });
  await page.route("https://www.fandango.com/napi/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CROSS_ORIGIN });
      return;
    }
    const answer = await upstream(route.request().url());
    await route.fulfill({
      status: answer.status,
      contentType: "application/json",
      headers: CROSS_ORIGIN,
      body: await answer.text(),
    });
  });
};

export const violationsOn = async (
  page: Page,
): Promise<readonly { readonly id: string; readonly targets: unknown }[]> =>
  (await new AxeBuilder({ page }).withTags([...WCAG]).analyze()).violations.map(
    (violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }),
  );
