import { act } from "@testing-library/react";

Object.assign(HTMLDialogElement.prototype, {
  showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  },
  close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    setTimeout(() =>
      act(() => {
        this.dispatchEvent(new Event("close"));
      }),
    );
  },
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (
    !(form instanceof HTMLFormElement) ||
    form.getAttribute("method") !== "dialog"
  )
    return;
  event.preventDefault();
  form.closest("dialog")?.close();
});
