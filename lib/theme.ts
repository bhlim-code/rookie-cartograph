export const THEME_COOKIE = "cartograph-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const THEMES = ["system", "light", "dark"] as const;

export type Theme = (typeof THEMES)[number];

export function parseTheme(value: string | null | undefined): Theme {
  return THEMES.find((theme) => theme === value) ?? "system";
}

/**
 * Reads the persisted theme synchronously before the first paint. The html
 * element always exists at this point, so setting the attribute here avoids a
 * flash of the wrong palette without making the root layout dynamic.
 */
export const themeInitScript = `(function(){try{var match=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(system|light|dark)(?:;|$)/);var theme=match?match[1]:"system";document.documentElement.dataset.theme=theme;}catch(error){document.documentElement.dataset.theme="system";}})();`;
