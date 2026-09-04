import type { Answer } from "./contract.js";

export const FETCHED_AT = 1000;

export const answerOf = (body: unknown, status: number): Answer => ({
  status,
  body: JSON.stringify(body),
  fetchedAt: FETCHED_AT,
});
