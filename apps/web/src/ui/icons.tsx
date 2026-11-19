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
export const SlidersIcon = () => (
  <Icon>
    <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="8" cy="16" r="2" />
  </Icon>
);
export const ShareIcon = () => (
  <Icon>
    <path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />
  </Icon>
);
export const UpIcon = () => (
  <Icon>
    <path d="M6 15l6-6 6 6" />
  </Icon>
);
export const CloseIcon = () => (
  <Icon>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const PreviousIcon = () => (
  <Icon>
    <path d="M18 5l-9 7 9 7V5zM6 5v14" />
  </Icon>
);
export const NextIcon = () => (
  <Icon>
    <path d="M6 5l9 7-9 7V5zM18 5v14" />
  </Icon>
);
export const PlayIcon = () => (
  <Icon>
    <path d="M8 5l11 7-11 7V5z" fill="currentColor" />
  </Icon>
);
export const CompactIcon = () => (
  <Icon>
    <path d="M4 12h16M12 3v5M9 6l3 3 3-3M12 21v-5M9 18l3-3 3 3" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
);
