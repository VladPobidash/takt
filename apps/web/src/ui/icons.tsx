import type { ReactNode } from "react";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const BackIcon = () => (
  <Icon>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const ChevronDownIcon = () => (
  <Icon>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const MinusIcon = () => (
  <Icon>
    <path d="M6 12h12" />
  </Icon>
);
export const PlusIcon = () => (
  <Icon>
    <path d="M12 6v12M6 12h12" />
  </Icon>
);
export const ImportIcon = () => (
  <Icon>
    <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
  </Icon>
);
export const EditIcon = () => (
  <Icon>
    <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
  </Icon>
);
export const WarningIcon = () => (
  <Icon>
    <path d="M12 4l9 16H3l9-16zM12 10v4M12 17.5v.5" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
);
