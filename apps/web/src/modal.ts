export const modal = (dialog: HTMLDialogElement) => {
  dialog.showModal();
  dialog
    .querySelector<HTMLElement>(`[data-term="${dialog.dataset.focus}"]`)
    ?.focus();
  return () => dialog.close();
};
