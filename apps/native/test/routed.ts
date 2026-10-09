interface Routed {
  readonly routes: readonly {
    readonly name: string;
    readonly state?: Routed | undefined;
  }[];
}

export const routesIn = (state: Routed | undefined): readonly string[] =>
  (state?.routes ?? []).flatMap((route) =>
    route.state === undefined ? [route.name] : routesIn(route.state),
  );
