'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Per-admin voorkeur "wide mode". Wanneer aan: max-width van pages
 * wordt overschreven via CSS-rule (.admin-wide ... in globals.css).
 * Persisteert in localStorage. Default = uit (compacte ~1280px layout).
 */

const LS_KEY = 'admin.layout.wide.v1'

type Ctx = {
  wide: boolean
  toggle: () => void
  hydrated: boolean
}

const AdminWidthContext = createContext<Ctx>({
  wide: false,
  toggle: () => undefined,
  hydrated: false,
})

export function AdminWidthProvider({ children }: { children: React.ReactNode }) {
  const [wide, setWide] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_KEY)
      if (raw === '1') setWide(true)
    } catch {
      // negeer
    }
    setHydrated(true)
  }, [])

  const toggle = useCallback(() => {
    setWide((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(LS_KEY, next ? '1' : '0')
      } catch {
        // negeer
      }
      return next
    })
  }, [])

  return (
    <AdminWidthContext.Provider value={{ wide, toggle, hydrated }}>
      {children}
    </AdminWidthContext.Provider>
  )
}

export function useAdminWidth(): Ctx {
  return useContext(AdminWidthContext)
}
