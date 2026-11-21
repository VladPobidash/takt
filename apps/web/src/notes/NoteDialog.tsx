import { useEffect, useRef, useState } from "react";
import { useApp } from "../app-context.tsx";

/** A bottom sheet to write, change or delete one personal note. */
export function NoteDialog(props: {
  /** Null when closed. */
  target: { title: string; text: string } | null;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const { t } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState("");
  const open = props.target !== null;
  const initial = props.target?.text ?? "";

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setText(initial);
      element.showModal();
    }
    if (!open && element.open) element.close();
  }, [open, initial]);

  return (
    <dialog
      ref={dialog}
      aria-label={props.target?.title}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-xl rounded-t-[12px] bg-bg p-0 text-text shadow-xl backdrop:bg-black/40"
    >
      <form
        className="px-4 pb-[max(1rem,var(--safe-bottom))] pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          props.onSave(text);
        }}
      >
        <h2 className="text-[17px] font-extrabold">{props.target?.title}</h2>
        <p className="mb-2 text-[13px] font-medium text-muted">{t("notes.onlyYou")}</p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={t("notes.text")}
          placeholder={t("notes.placeholder")}
          rows={3}
          className="w-full resize-none rounded-control bg-surface px-3 py-2 text-[16px] font-semibold outline-none placeholder:text-muted"
        />
        <div className="mt-3 flex gap-2">
          {initial !== "" && (
            <button
              type="button"
              onClick={() => props.onSave("")}
              className="h-11 rounded-control border border-line px-4 text-[15px] font-bold text-muted"
            >
              {t("notes.delete")}
            </button>
          )}
          <button
            type="button"
            onClick={props.onClose}
            className="ml-auto h-11 rounded-control bg-surface px-4 text-[15px] font-bold"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            className="h-11 rounded-control bg-accent px-4 text-[15px] font-bold text-accent-fg"
          >
            {t("notes.save")}
          </button>
        </div>
      </form>
    </dialog>
  );
}
