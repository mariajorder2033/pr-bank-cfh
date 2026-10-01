import { BRAND_NAME } from '../config';

export function Brand() {
  return (
    <span className="brand">
      <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <rect width="32" height="32" rx="7" />
        <path d="M9 22V10h7.5a4 4 0 0 1 0 8H13v4z" />
      </svg>
      <span className="brand__name">{BRAND_NAME}</span>
    </span>
  );
}
