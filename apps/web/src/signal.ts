export interface Signal {
  readonly subscribe: (onChange: () => void) => () => boolean;
  readonly notify: () => void;
}

export const signal = (): Signal => {
  const listeners = new Set<() => void>();
  return {
    subscribe: (onChange: () => void) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    notify: () => {
      for (const listener of listeners) listener();
    },
  };
};
