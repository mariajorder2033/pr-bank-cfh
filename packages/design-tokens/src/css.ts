import {
  colors,
  COLOR_ROLES,
  layout,
  motion,
  spacingPx,
  typography,
  type ThemeName,
} from './tokens.js';

const rem = (px: number) => `${px / 16}rem`;

function colorDeclarations(theme: ThemeName, indent: string): string {
  return [
    ...COLOR_ROLES.map((role) => `${indent}--color-${role}: ${colors[theme][role]};`),
    `${indent}color-scheme: ${theme};`,
  ].join('\n');
}

/**
 * CSS custom properties. Light is the default; dark follows `prefers-color-scheme` unless the
 * user picked a theme in-app (FR-62), which sets `data-theme` on the root element.
 */
export function toCss(): string {
  const base = [
    `  --font-family: ${typography.fontFamily};`,
    `  --font-variant-numeric-money: ${typography.moneyNumeric};`,
    ...Object.entries(typography.sizePx).map(([name, px]) => `  --font-size-${name}: ${rem(px)};`),
    ...Object.entries(typography.lineHeight).map(
      ([name, value]) => `  --line-height-${name}: ${value};`,
    ),
    ...spacingPx.map((px, i) => `  --space-${i + 1}: ${px}px;`),
    `  --layout-gutter-mobile: ${layout.mobileGutterPx}px;`,
    `  --layout-max-width: ${layout.maxContentWidthPx}px;`,
    `  --touch-target-min: ${layout.minTouchTargetPx}px;`,
    `  --motion-duration: ${motion.durationMs}ms;`,
  ].join('\n');

  return `/* Generated from @pr-bank/design-tokens. Do not edit. */
:root {
${colorDeclarations('light', '  ')}
${base}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
${colorDeclarations('dark', '    ')}
  }
}

:root[data-theme='dark'] {
${colorDeclarations('dark', '  ')}
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration: 0ms;
  }
}
`;
}

export function toJson(): string {
  return `${JSON.stringify({ colors, typography, spacingPx, layout, motion }, null, 2)}\n`;
}
