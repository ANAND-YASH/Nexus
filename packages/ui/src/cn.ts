type ClassValue = string | false | null | undefined;

/** Joins truthy class names. Deliberately tiny: no conflict resolution. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
