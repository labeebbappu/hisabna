import { color, fontFamily, radius, spacing, themes, typeStyle, type Theme } from './tokens.ts';

function colorVars(theme: Theme): string {
  return Object.entries(color)
    .map(([name, pair]) => `  --${name}: ${pair[theme]};`)
    .join('\n');
}

/** Builds tokens.css: dark is the default, light applies for data-theme="light" or a light OS setting. */
export function generateCss(): string {
  const [first] = themes;
  const other = themes.filter((t) => t !== first);
  const shared = [
    ...Object.entries(spacing).map(([n, v]) => `  --${n}: ${v};`),
    ...Object.entries(radius).map(([n, v]) => `  --${n}: ${v};`),
    ...Object.entries(fontFamily).map(([n, v]) => `  --font-${n}: ${v};`),
  ].join('\n');

  const lightBlocks = other
    .map(
      (t) =>
        `@media (prefers-color-scheme: ${t}) {\n  :root:not([data-theme="${first}"]) {\n${colorVars(t)
          .split('\n')
          .map((l) => `  ${l}`)
          .join('\n')}\n    color-scheme: ${t};\n  }\n}\n[data-theme="${t}"] {\n${colorVars(t)}\n  color-scheme: ${t};\n}`,
    )
    .join('\n');

  const classes = Object.entries(typeStyle)
    .map(([name, s]) => {
      const ls = 'letterSpacing' in s ? ` letter-spacing: ${s.letterSpacing};` : '';
      return `.${name} { font-size: ${s.fontSize}; line-height: ${s.lineHeight}; font-weight: ${s.fontWeight};${ls} }`;
    })
    .join('\n');

  return `/* Hisabna design tokens. Generated from src/tokens.ts: run \`pnpm --filter @hisabna/tokens build\`. */
:root, [data-theme="${first}"] {
${colorVars(first)}
  color-scheme: ${first};
}
${lightBlocks}
:root {
${shared}
}
${classes}
`;
}
