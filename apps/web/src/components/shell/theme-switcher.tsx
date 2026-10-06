'use client';

import { cn } from '@nexus/ui';
import { useEffect, useSyncExternalStore, type ComponentType } from 'react';
import {
  MonitorIcon,
  MoonIcon,
  SunIcon,
  type IconProps,
} from '@/components/icons';
import { THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

const OPTIONS: {
  value: ThemePreference;
  label: string;
  icon: ComponentType<IconProps>;
}[] = [
  { value: 'system', label: 'System', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
];

const DARK_QUERY = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keeps other tabs in sync.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function applyTheme(preference: ThemePreference) {
  const dark =
    preference === 'dark' ||
    (preference === 'system' && window.matchMedia(DARK_QUERY).matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

function setPreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable: the choice lasts for this page only.
  }
  applyTheme(preference);
  listeners.forEach((listener) => listener());
}

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    () => 'system' as const,
  );

  // Follow OS changes while on "System" (and apply cross-tab changes).
  useEffect(() => {
    applyTheme(preference);
    if (preference !== 'system') return;
    const query = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [preference]);

  return (
    <fieldset>
      <legend className="mb-1.5 text-2xs font-medium tracking-wide text-fg-subtle uppercase">
        Theme
      </legend>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              'flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring',
              preference === value
                ? 'bg-surface text-fg shadow-xs'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              name="nexus-theme"
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value)}
              className="sr-only"
            />
            <Icon width={14} height={14} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
