export const modal = (dialog: HTMLDialogElement): (() => void) => {
  dialog.showModal();
  dialog
    .querySelector<HTMLElement>(`[data-term="${dialog.dataset["focus"]}"]`)
    ?.focus();
  return () => dialog.close();
};
