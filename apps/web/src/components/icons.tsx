import type { SVGProps } from 'react';

/**
 * Inline stroke icons on a 24px grid. Decorative by default: pair them with
 * visible text or an `aria-label` on the control.
 */
export type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={16}
      height={16}
      {...props}
    >
      {children}
    </svg>
  );
}

export const DashboardIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.5" />
    <rect x="3.5" y="14.5" width="7" height="6" rx="1.5" />
  </Icon>
);

export const ProjectsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2.2h7.4a2 2 0 0 1 2 2v7.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
  </Icon>
);

export const TasksIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.3 4.6-4.8" />
  </Icon>
);

export const GoalsIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.75" fill="currentColor" />
  </Icon>
);

export const KnowledgeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z" />
    <path d="M5 16.5a3 3 0 0 1 3-3h10.5" />
    <path d="M9 8.5h5.5" />
  </Icon>
);

export const InsightsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5c.6 3.9 2.6 5.9 6.5 6.5-3.9.6-5.9 2.6-6.5 6.5-.6-3.9-2.6-5.9-6.5-6.5 3.9-.6 5.9-2.6 6.5-6.5Z" />
    <path d="M18.5 15.5c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5Z" />
  </Icon>
);

export const ContextIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="7" r="2.25" />
    <circle cx="18" cy="6" r="2.25" />
    <circle cx="12" cy="17.5" r="2.25" />
    <path d="m8.2 7 7.5-.8M7.2 9l3.7 6.5M16.9 8.1l-3.8 7.4" />
  </Icon>
);

export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m7 10 5 5 5-5" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const SignOutIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14" />
    <path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5" />
  </Icon>
);

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.75" />
    <path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.1 1.1M17.3 17.3l1.1 1.1M5.6 18.4l1.1-1.1M17.3 6.7l1.1-1.1" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z" />
  </Icon>
);

export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="11.5" rx="2" />
    <path d="M9 20h6M12 16v4" />
  </Icon>
);

export const OfflineIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 3.5l17 17" />
    <path d="M8.6 8.7A10.7 10.7 0 0 0 4 11.2M2 8.3A14.5 14.5 0 0 1 6.1 6M10.5 5.6A14.5 14.5 0 0 1 22 8.3M15.6 11.3a10.7 10.7 0 0 1 4.4 2.1M7.4 14.5a6.4 6.4 0 0 1 7.3-.6" />
    <circle cx="12" cy="18.5" r="0.75" fill="currentColor" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4.3 2.9 17.2a2 2 0 0 0 1.7 3h14.8a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 17h.01" />
  </Icon>
);

export const ClockIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const InboxIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 13.5 6 5.5a2 2 0 0 1 1.9-1.4h8.2A2 2 0 0 1 18 5.5l2.5 8" />
    <path d="M3.5 13.5V18a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4.5h-5a3 3 0 0 1-6 0Z" />
  </Icon>
);
