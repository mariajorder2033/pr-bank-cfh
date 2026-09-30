/**
 * Maker-checker (four-eyes) approval for regulated admin actions (PRD FR-77, FR-78).
 * A request needs a justification note and must be decided by someone other than its maker.
 */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest<T> {
  readonly id: string;
  readonly makerId: string;
  readonly justification: string;
  readonly payload: T;
  readonly status: ApprovalStatus;
  readonly checkerId: string | null;
  readonly decidedAt: string | null;
}

export type Approved<T> = ApprovalRequest<T> & {
  readonly status: 'approved';
  readonly checkerId: string;
  readonly decidedAt: string;
};

export class ApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalError';
  }
}

export function requestApproval<T>(input: {
  id: string;
  makerId: string;
  justification: string;
  payload: T;
}): ApprovalRequest<T> {
  const justification = input.justification.trim();
  if (!justification) {
    throw new ApprovalError('A justification note is required');
  }
  return Object.freeze({
    ...input,
    justification,
    status: 'pending',
    checkerId: null,
    decidedAt: null,
  });
}

export function approve<T>(
  request: ApprovalRequest<T>,
  checkerId: string,
  decidedAt: string,
): Approved<T> {
  assertDecidable(request, checkerId);
  return Object.freeze({ ...request, status: 'approved', checkerId, decidedAt });
}

export function reject<T>(
  request: ApprovalRequest<T>,
  checkerId: string,
  decidedAt: string,
): ApprovalRequest<T> {
  assertDecidable(request, checkerId);
  return Object.freeze({ ...request, status: 'rejected', checkerId, decidedAt });
}

export function assertApproved<T>(request: ApprovalRequest<T>): asserts request is Approved<T> {
  if (
    request.status !== 'approved' ||
    request.checkerId === null ||
    request.checkerId === request.makerId
  ) {
    throw new ApprovalError(`Request ${request.id} is not approved by a second person`);
  }
}

function assertDecidable(request: ApprovalRequest<unknown>, checkerId: string): void {
  if (request.status !== 'pending') {
    throw new ApprovalError(`Request ${request.id} is already ${request.status}`);
  }
  if (checkerId === request.makerId) {
    throw new ApprovalError('The checker must be a different person from the maker');
  }
}
