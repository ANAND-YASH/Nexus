'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards. Lets a
 * component render a time-zone-neutral value first and the viewer's local
 * one once it is running in their browser.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const MINUTE = 60_000;
const currentMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE;

function subscribeMinute(onChange: () => void) {
  const id = setInterval(onChange, MINUTE / 4);
  return () => clearInterval(id);
}

/** The current time, to the minute; re-renders as minutes pass. */
export function useMinuteClock(): number {
  return useSyncExternalStore(subscribeMinute, currentMinute, currentMinute);
}
