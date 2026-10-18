/** Minimal inline icon set (stroke icons, 24×24, currentColor). Decorative by default. */
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Icon>
);
export const BookIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Icon>
);
export const DbIcon = (p: P) => (
  <Icon {...p}>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
  </Icon>
);
export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />
  </Icon>
);
export const PauseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none" />
  </Icon>
);
export const ResetIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);
export const LinkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </Icon>
);
export const DownloadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </Icon>
);
export const ImageIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </Icon>
);
export const ChevronIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const InfoIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);
export const SlidersIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);
export const ClockIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
export const ArrowIcon = ({ dir, ...p }: P & { dir: 'up' | 'down' | 'flat' }) => (
  <Icon {...p}>
    {dir === 'up' && <path d="M12 19V5M5 12l7-7 7 7" />}
    {dir === 'down' && <path d="M12 5v14M5 12l7 7 7-7" />}
    {dir === 'flat' && <path d="M5 12h14" />}
  </Icon>
);
export const WarnIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </Icon>
);
