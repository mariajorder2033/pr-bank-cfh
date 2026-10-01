# Customer Web App

The customer-facing web banking app (ui-ux-design.md §4): login, dashboard, account history, transfers, cards, and settings. React + Vite, built on `@pr-bank/design-tokens` and the `@pr-bank/domain` model.

## Demo mode

`DEMO_MODE` (in `src/config.ts`) is on by default. In this mode the app runs an **in-browser demo backend** (`src/api/mock.ts`) that implements the customer API contract against the real domain ledger:

- Sign-in is simulated — enter any username and password; nothing you type leaves the browser.
- Accounts, transactions, and cards are sample data held in memory, reset on reload.
- Transfers really move money: own-account transfers settle immediately, domestic transfers go pending then settle, and amounts over CHF 1,000 require a step-up code (any 6 digits).
- One seeded transaction shows a maker-checker **correction** as a reversal + replacement (ADR 0002), not an in-place edit.

To point the app at the real services instead, implement the `Backend` interface (`src/api/types.ts`) with HTTP clients and pass it to `<App>` in `src/main.tsx`, once the identity provider is chosen and the app can obtain access tokens.

## Scripts

```sh
npm run dev --workspace @pr-bank/web       # Vite dev server
npm run build --workspace @pr-bank/web     # type-checked production build to dist/
npm run preview --workspace @pr-bank/web   # serve the built app
```

## Accessibility

Targets WCAG 2.1 AA (ui-ux-design.md §6): token colours are contrast-checked, every control has a visible label or `aria-label`, the step-up dialog traps focus, in-app navigation moves focus to the new page, amounts use tabular figures, and motion respects `prefers-reduced-motion`.
