/** Design tokens for Hisabna. Source of truth; `tokens.css` is generated from this file. */

export const themes = ['dark', 'light'] as const;
export type Theme = (typeof themes)[number];

type Pair = Readonly<Record<Theme, string>>;

/** Colours per theme. Dark is the default and the brand's face. */
export const color = {
  /** App background (Ink). */
  bg: { dark: '#101820', light: '#f5f6f8' },
  /** Cards, sheets and input fields on bg. */
  surface: { dark: '#19222c', light: '#ffffff' },
  /** Secondary buttons, pressed states and chips. */
  'surface-high': { dark: '#243040', light: '#eceff3' },
  /** Decorative dividers. Not for control borders. */
  line: { dark: '#2c3948', light: '#d8dee5' },
  /** Borders of inputs and other controls (3:1 or more). */
  'line-strong': { dark: '#66758a', light: '#7a8794' },
  /** Primary text. */
  text: { dark: '#f3f5f7', light: '#101820' },
  /** Secondary text, labels and hints. */
  'text-muted': { dark: '#9aa6b2', light: '#56626f' },
  /** Signal yellow. Primary-action fill and brand mark. Never yellow text on light surfaces. */
  accent: { dark: '#fee715', light: '#fee715' },
  /** Text and icons placed on accent fills. */
  'on-accent': { dark: '#101820', light: '#101820' },
  /** Money you are owed. Always paired with words or an arrow. */
  owed: { dark: '#3dd6c6', light: '#0b7a6b' },
  /** Money you owe. Always paired with words or an arrow. */
  owe: { dark: '#ff7a59', light: '#b8431f' },
  /** Keyboard focus ring: 2px solid, 2px offset. */
  focus: { dark: '#fee715', light: '#101820' },
} as const satisfies Record<string, Pair>;

export type ColorName = keyof typeof color;

export const spacing = {
  'space-1': '4px',
  'space-2': '8px',
  'space-3': '12px',
  'space-4': '16px',
  'space-6': '24px',
  'space-8': '32px',
  'space-12': '48px',
} as const;

export const radius = {
  'radius-sm': '8px',
  'radius-md': '16px',
  'radius-lg': '24px',
  'radius-pill': '999px',
} as const;

export const fontFamily = {
  sans: '"Inter", "IBM Plex Sans Arabic", system-ui, sans-serif',
  arabic: '"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif',
} as const;

export interface TypeStyle {
  readonly fontSize: string;
  readonly lineHeight: string;
  readonly fontWeight: number;
  readonly letterSpacing?: string;
}

export const typeStyle = {
  'display-xl': { fontSize: '40px', lineHeight: '44px', fontWeight: 800, letterSpacing: '-0.02em' },
  'display-l': { fontSize: '32px', lineHeight: '36px', fontWeight: 800, letterSpacing: '-0.02em' },
  amount: { fontSize: '28px', lineHeight: '32px', fontWeight: 700 },
  title: { fontSize: '20px', lineHeight: '28px', fontWeight: 600 },
  body: { fontSize: '16px', lineHeight: '24px', fontWeight: 400 },
  'body-sm': { fontSize: '14px', lineHeight: '20px', fontWeight: 400 },
  label: { fontSize: '13px', lineHeight: '16px', fontWeight: 600 },
  caption: { fontSize: '12px', lineHeight: '16px', fontWeight: 400 },
} as const satisfies Record<string, TypeStyle>;
