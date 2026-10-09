export interface Measured {
  readonly weighed: number;
  readonly said: string;
  readonly refused: string | undefined;
}

export interface Kind {
  readonly report?: string;
  readonly measure: (text: string) => Measured;
  readonly missing: (path: string) => string;
}
