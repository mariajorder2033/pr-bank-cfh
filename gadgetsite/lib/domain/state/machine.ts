export class IllegalTransition extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
  ) {
    super(`Illegal transition: ${from} → ${to}`)
    this.name = 'IllegalTransition'
  }
}

export type Machine<S extends string> = {
  readonly states: readonly S[]
  canTransition(from: S, to: S): boolean
  assertTransition(from: S, to: S): void
  next(from: S): readonly S[]
}

/** A transition table; every state change in the app goes through one of these. */
export function defineMachine<S extends string>(edges: Record<S, readonly S[]>): Machine<S> {
  const states = Object.keys(edges) as S[]
  const allowed = new Map(states.map((s) => [s, new Set(edges[s])]))
  const canTransition = (from: S, to: S) => allowed.get(from)?.has(to) ?? false
  return {
    states,
    canTransition,
    assertTransition(from, to) {
      if (!canTransition(from, to)) throw new IllegalTransition(from, to)
    },
    next: (from) => edges[from] ?? [],
  }
}
