import { describe, expect, it } from 'vitest';
import {
  ApprovalError,
  approve,
  assertApproved,
  reject,
  requestApproval,
} from './maker-checker.js';

const request = () =>
  requestApproval({
    id: 'req-1',
    makerId: 'alice',
    justification: ' Duplicate posting ',
    payload: 1,
  });

describe('maker-checker', () => {
  it('requires a justification note', () => {
    expect(() =>
      requestApproval({ id: 'r', makerId: 'alice', justification: '  ', payload: null }),
    ).toThrow(ApprovalError);
    expect(request().justification).toBe('Duplicate posting');
  });

  it('does not let the maker approve their own request', () => {
    expect(() => approve(request(), 'alice', '2026-10-01T10:00:00Z')).toThrow(ApprovalError);
  });

  it('records the checker and is decided only once', () => {
    const approved = approve(request(), 'bob', '2026-10-01T10:00:00Z');
    expect(approved).toMatchObject({ status: 'approved', checkerId: 'bob' });
    expect(() => assertApproved(approved)).not.toThrow();
    expect(() => reject(approved, 'carol', '2026-10-01T10:05:00Z')).toThrow(ApprovalError);
  });

  it('treats pending, rejected and self-approved requests as not approved', () => {
    expect(() => assertApproved(request())).toThrow(ApprovalError);
    expect(() => assertApproved(reject(request(), 'bob', 'now'))).toThrow(ApprovalError);
    const forged = { ...request(), status: 'approved' as const, checkerId: 'alice' };
    expect(() => assertApproved(forged)).toThrow(ApprovalError);
  });
});
