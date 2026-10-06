import type { ComponentType } from 'react';
import {
  ContextIcon,
  DashboardIcon,
  GoalsIcon,
  InsightsIcon,
  KnowledgeIcon,
  ProjectsIcon,
  SettingsIcon,
  TasksIcon,
  type IconProps,
} from '@/components/icons';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  /** What the section is for; used by its "coming next" placeholder. */
  summary: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const PRIMARY_NAV: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      {
        href: '/',
        label: 'Dashboard',
        icon: DashboardIcon,
        summary: 'Your projects, tasks, goals and knowledge at a glance.',
      },
      {
        href: '/projects',
        label: 'Projects',
        icon: ProjectsIcon,
        summary:
          'Create and organize projects, track their status and see the tasks and documents attached to each one.',
      },
      {
        href: '/tasks',
        label: 'Tasks',
        icon: TasksIcon,
        summary:
          'Plan and work through tasks with priorities, due dates and project links, filtered the way you work.',
      },
      {
        href: '/goals',
        label: 'Goals',
        icon: GoalsIcon,
        summary:
          'Set goals with target dates, pause or complete them, and connect the knowledge that supports them.',
      },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        href: '/knowledge',
        label: 'Knowledge',
        icon: KnowledgeIcon,
        summary:
          'Capture and search documents, link them to your work and run AI analysis on them.',
      },
      {
        href: '/insights',
        label: 'Insights',
        icon: InsightsIcon,
        summary:
          'Review AI document analyses — summaries, key points, action items and suggested relationships — in one place.',
      },
      {
        href: '/context',
        label: 'Context',
        icon: ContextIcon,
        summary:
          'Explore the people, technologies and topics in your work and how they connect across projects, tasks, goals and documents.',
      },
    ],
  },
];

export const SETTINGS_NAV: NavItem = {
  href: '/settings',
  label: 'Settings',
  icon: SettingsIcon,
  summary: 'Manage your account and how NEXUS looks.',
};

export const ALL_NAV_ITEMS: NavItem[] = [
  ...PRIMARY_NAV.flatMap((group) => group.items),
  SETTINGS_NAV,
];

export function isActive(href: string, pathname: string): boolean {
  return href === '/'
    ? pathname === '/'
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function findNavItem(pathname: string): NavItem | undefined {
  return ALL_NAV_ITEMS.find((item) => isActive(item.href, pathname));
}

export function navItem(href: string): NavItem {
  const item = ALL_NAV_ITEMS.find((candidate) => candidate.href === href);
  if (!item) throw new Error(`Unknown navigation item: ${href}`);
  return item;
}
