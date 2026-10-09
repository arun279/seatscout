export interface Measured {
  readonly weighed: number;
  readonly said: string;
  readonly refused?: string;
}

export interface Kind {
  readonly report?: string;
  readonly measure: (text: string) => Measured;
  readonly refusal: (path: string) => string;
  readonly missing: (path: string) => string;
}
