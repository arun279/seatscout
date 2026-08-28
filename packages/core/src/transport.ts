export interface FetchResponse {
  readonly status: number;
  readonly text: () => Promise<string>;
}

export type Fetch = (
  url: string,
  init?: {
    readonly method?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly body?: string;
  },
) => Promise<FetchResponse>;
