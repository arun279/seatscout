export const signal = () => {
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
