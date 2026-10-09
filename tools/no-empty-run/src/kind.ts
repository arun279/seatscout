export type Measured =
  | {
      readonly weighed: number;
      readonly said: string;
      readonly refused?: undefined;
    }
  | {
      readonly weighed: number;
      readonly said?: undefined;
      readonly refused: string;
    };

export interface Kind {
  readonly report?: string;
  readonly measure: (text: string) => Measured;
  readonly missing: (path: string) => string;
}
