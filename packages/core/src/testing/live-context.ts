import type {} from "vitest";
import type { Answer } from "./contract.js";

export type { Answer };

declare module "vitest" {
  interface ProvidedContext {
    readonly liveSeatMaps: readonly Answer[];
    readonly liveArea: Answer;
    readonly liveSchedule: Answer;
    readonly liveListing: Answer;
    readonly liveSearch: {
      readonly origin: string;
      readonly area: string;
      readonly movie: string;
      readonly date: string;
      readonly headers: Readonly<Record<string, string>>;
    };
  }
  interface TaskMeta {
    contract?: readonly string[];
  }
}
