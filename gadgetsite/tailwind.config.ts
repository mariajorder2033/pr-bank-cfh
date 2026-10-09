import type { Config } from 'tailwindcss'

// Tokens are CSS variables so admin theme settings and light/dark both flow through.
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.ts'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        pn: 'var(--pn)',
        tx: 'var(--tx)',
        mut: 'var(--mut)',
        sand: 'var(--sand)',
        band: 'var(--br)',
        sale: 'var(--sale)',
        ok: 'var(--ok)',
        ink: '#14181b',
      },
      fontFamily: { sans: ['Outfit', 'system-ui', 'sans-serif'] },
      keyframes: {
        fi: { from: { opacity: '0' }, to: { opacity: '1' } },
        mq: { to: { transform: 'translateX(-50%)' } },
        wipe: { from: { clipPath: 'inset(0 0 100% 0)' }, to: { clipPath: 'inset(0)' } },
        pop: { '50%': { transform: 'scale(1.15)' } },
      },
      animation: {
        fi: 'fi .3s ease both',
        mq: 'mq 30s linear infinite',
        wipe: 'wipe .2s ease-out',
        pop: 'pop .35s',
      },
    },
  },
} satisfies Config
