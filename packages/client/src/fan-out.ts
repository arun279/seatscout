const WIDTH = 24;

export const fannedOut = async <Item>(
  items: readonly Item[],
  work: (item: Item) => Promise<void>,
): Promise<void> => {
  const queue = items[Symbol.iterator]();
  const worker = async () => {
    for (const item of queue) await work(item);
  };
  await Promise.all(Array.from({ length: WIDTH }, worker));
};
