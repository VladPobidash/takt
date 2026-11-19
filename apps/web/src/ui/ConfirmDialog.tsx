import { useEffect, useRef } from "react";

/**
 * A modal question with a destructive action, on the native <dialog> element:
 * focus is trapped, Escape cancels, the backdrop dims the page.
 */
export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (props.open && !element.open) element.showModal();
    if (!props.open && element.open) element.close();
  }, [props.open]);

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        props.onCancel();
      }}
      className="m-auto w-[min(22rem,calc(100vw-2rem))] rounded-control bg-bg p-4 text-text shadow-xl backdrop:bg-black/50"
    >
      <h2 className="text-[17px] font-extrabold">{props.title}</h2>
      <p className="mt-1 text-[14px] font-medium text-muted">{props.text}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="h-11 flex-1 rounded-control bg-surface text-[15px] font-bold"
        >
          {props.cancelLabel}
        </button>
        <button
          type="button"
          onClick={props.onConfirm}
          className="h-11 flex-1 rounded-control bg-accent text-[15px] font-bold text-accent-fg"
        >
          {props.confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
