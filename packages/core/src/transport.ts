export interface FetchResponse {
  readonly status: number;
  readonly text: () => Promise<string>;
}

export interface FetchInit {
  readonly cache?: "no-store";
  readonly method?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export type Fetch = (url: string, init?: FetchInit) => Promise<FetchResponse>;
