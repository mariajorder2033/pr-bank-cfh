'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { defaultMotion } from '@/lib/content/defaults'
import type { MotionSettings } from '@/lib/content/schemas'

const MotionContext = createContext<MotionSettings>(defaultMotion)

/** Motion constants from admin settings (TRD §9), available to every client component. */
export function MotionProvider({
  value,
  children,
}: {
  value: MotionSettings
  children: ReactNode
}) {
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
}

export const useMotion = () => useContext(MotionContext)
