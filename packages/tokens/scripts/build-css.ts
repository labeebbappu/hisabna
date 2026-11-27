import { writeFileSync } from 'node:fs';
import { generateCss } from '../src/css.ts';

writeFileSync(new URL('../tokens.css', import.meta.url), generateCss());
