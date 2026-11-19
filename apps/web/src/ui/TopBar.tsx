import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useApp } from "../app-context.tsx";
import type { MessageKey } from "../i18n/en.ts";
import { ChevronDownIcon } from "./icons.tsx";

const SECTIONS: { path: string; label: MessageKey }[] = [
  { path: "/library", label: "nav.library" },
  { path: "/settings", label: "nav.settings" },
];

/**
 * Top bar of the main screens (52 px): the section switcher on the left, contextual
 * actions on the right. There is no bottom navigation (design system, principle 7).
 */
export function MainTopBar({ current, actions }: { current: MessageKey; actions?: ReactNode }) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !menu.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-2 px-3">
      <div ref={menu} className="relative min-w-0">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("nav.menu")}
          onClick={() => setOpen(!open)}
          className="flex h-11 min-w-0 items-center gap-2 rounded-control pr-1"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-badge bg-accent text-[15px] font-extrabold text-accent-fg">
            T
          </span>
          <span className="truncate text-[20px] font-extrabold tracking-[-0.02em]">
            {t(current)}
          </span>
          <ChevronDownIcon />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute left-0 top-12 z-20 w-56 rounded-control border border-line bg-bg p-1 shadow-lg"
          >
            {SECTIONS.map((section) => (
              <Link
                key={section.path}
                href={section.path}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={`flex h-11 items-center rounded-badge px-3 text-[15px] font-semibold ${
                  location.startsWith(section.path) ? "bg-surface" : ""
                }`}
              >
                {t(section.label)}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1">{actions}</div>
    </header>
  );
}

/** A square icon button with a 44 px touch target; always needs a label for screen readers. */
export function IconButton(props: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "plain" | "surface";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`grid size-11 shrink-0 place-items-center rounded-control disabled:opacity-40 ${
        props.variant === "surface" ? "bg-surface" : ""
      }`}
    >
      {props.children}
    </button>
  );
}
