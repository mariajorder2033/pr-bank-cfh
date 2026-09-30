import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast.js';
import { toCss, toJson } from './css.js';
import {
  colors,
  COLOR_ROLES,
  spacingPx,
  SPACING_UNIT_PX,
  type ColorRole,
  type ThemeName,
} from './tokens.js';

const themes: ThemeName[] = ['light', 'dark'];
const TEXT_ROLES: ColorRole[] = [
  'text-primary',
  'text-secondary',
  'success',
  'danger',
  'warning',
  'encrypted',
];
const BACKGROUNDS: ColorRole[] = ['background', 'surface'];

describe('design tokens', () => {
  describe.each(themes)('%s theme meets WCAG 2.1 AA (ui-ux-design.md §6)', (theme) => {
    const palette = colors[theme];

    it.each(TEXT_ROLES.flatMap((fg) => BACKGROUNDS.map((bg) => [fg, bg] as const)))(
      '%s on %s has at least 4.5:1 text contrast',
      (fg, bg) => {
        expect(contrastRatio(palette[fg], palette[bg])).toBeGreaterThanOrEqual(4.5);
      },
    );

    it('has at least 4.5:1 for text on primary buttons', () => {
      expect(contrastRatio(palette['on-primary'], palette.primary)).toBeGreaterThanOrEqual(4.5);
    });

    it.each(['primary', 'border'] as const)('%s has at least 3:1 against backgrounds', (role) => {
      for (const bg of BACKGROUNDS) {
        expect(contrastRatio(palette[role], palette[bg])).toBeGreaterThanOrEqual(3);
      }
    });
  });

  it('uses multiples of the 8px spacing unit', () => {
    expect(spacingPx.every((px) => px % SPACING_UNIT_PX === 0)).toBe(true);
  });

  it('emits every colour role for both themes, honouring system and in-app theme choice', () => {
    const css = toCss();
    for (const role of COLOR_ROLES) {
      expect(css.match(new RegExp(`--color-${role}:`, 'g'))).toHaveLength(3);
    }
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(":root:not([data-theme='light'])");
    expect(css).toContain(":root[data-theme='dark']");
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(JSON.parse(toJson()).colors.dark.primary).toBe(colors.dark.primary);
  });
});
