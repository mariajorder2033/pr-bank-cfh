import { useEffect, useId, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'input:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Modal bottom sheet for step-up MFA and confirmations (ui-ux-design.md §2.4, §4.2):
 * keeps the page in context instead of navigating away. Focus moves in on open, stays
 * inside while open, and returns to where it was on close.
 */
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const sheet = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheet.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'Tab' && sheet.current) {
        const focusable = [...sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="sheet-backdrop" onClick={() => onCloseRef.current()}>
      <div
        ref={sheet}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className="sheet__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
