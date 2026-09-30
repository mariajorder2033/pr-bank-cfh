import { writeFileSync } from 'node:fs';
import { toCss, toJson } from './css.js';

const dist = new URL('.', import.meta.url);
writeFileSync(new URL('tokens.css', dist), toCss());
writeFileSync(new URL('tokens.json', dist), toJson());
