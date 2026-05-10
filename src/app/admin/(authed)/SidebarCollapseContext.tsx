'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Gedeelde state tussen AdminShell (die de aside-width moet kennen) en
 * SidebarNav (die de toggle-knop rendert + interne layout aanpast).
 *
 * Beide componenten zitten boven/onder elkaar in de tree, dus context is
 * het netste. localStorage-hydratatie gebeurt hier centraal — voorkomt
 * twee bronnen die uit sync kunnen lopen.
 */

const LS_KEY = 'admin.sidebar.collapsed.v1'

type Ctx = {
  collapsed: boolean
  toggle: () => void
  hydrated: boolean
}

const SidebarCollapseContext = createContext<Ctx>({
  collapsed: false,
  toggle: () => undefined,
  hydrated: false,
})

export function SidebarCollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_KEY)
      if (raw === '1') setCollapsed(true)
    } catch {
      // negeer
    }
    setHydrated(true)
  }, [])

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
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
    <SidebarCollapseContext.Provider value={{ collapsed, toggle, hydrated }}>
      {children}
    </SidebarCollapseContext.Provider>
  )
}

export function useSidebarCollapse(): Ctx {
  return useContext(SidebarCollapseContext)
}
