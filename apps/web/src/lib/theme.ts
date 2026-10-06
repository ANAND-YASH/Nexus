/** Theme preference shared by the pre-paint script and the switcher. */
export const THEME_STORAGE_KEY = 'nexus-theme';

export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Runs before first paint (see the root layout) so the page never flashes
 * the wrong theme. Must stay self-contained: it is inlined as a string.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){}})();`;
