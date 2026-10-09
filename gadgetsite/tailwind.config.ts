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
      fontFamily: { sans: ['Outfit Variable', 'Outfit', 'system-ui', 'sans-serif'] },
      // One easing curve for the whole site: the reference store's "fast start, soft stop"
      // (TRD §9), so every motion feels like the same product.
      transitionTimingFunction: { smooth: 'cubic-bezier(.22,.8,.2,1)' },
      keyframes: {
        fi: { from: { opacity: '0' }, to: { opacity: '1' } },
        rise: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        mq: { to: { transform: 'translateX(-50%)' } },
        wipe: { from: { clipPath: 'inset(0 0 100% 0)' }, to: { clipPath: 'inset(0)' } },
        pop: { '50%': { transform: 'scale(1.15)' } },
      },
      animation: {
        fi: 'fi .35s cubic-bezier(.22,.8,.2,1) both',
        rise: 'rise .5s cubic-bezier(.22,.8,.2,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        mq: 'mq 30s linear infinite',
        wipe: 'wipe .2s cubic-bezier(.22,.8,.2,1)',
        pop: 'pop .35s cubic-bezier(.22,.8,.2,1)',
      },
    },
  },
} satisfies Config
