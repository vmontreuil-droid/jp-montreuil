'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { cleanupOldShopKeys, SHOP_LS_KEYS } from '@/lib/shop/storage'

const STORAGE_KEY = SHOP_LS_KEYS.wishlist

type WishlistState = {
  ids: Set<string>
  hydrated: boolean
}

type WishlistActions = {
  has: (id: string) => boolean
  toggle: (id: string) => void
  add: (id: string) => void
  remove: (id: string) => void
  clear: () => void
  count: number
  list: string[]
}

const Ctx = createContext<(WishlistState & WishlistActions) | null>(null)

/**
 * Wishlist context — pure localStorage. Cross-tab sync via storage-event
 * (open dezelfde site in 2 tabs, een hart toevoegen → andere tab leest
 * meteen mee). Geport van allardphilippe.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Best-effort opkuis van oude key-versies (no-op als alles up-to-date)
    cleanupOldShopKeys()
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as string[]
        if (Array.isArray(parsed)) setIds(new Set(parsed))
      }
    } catch {
      // private browsing of corrupt → start leeg
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
    } catch { /* storage full */ }
  }, [ids, hydrated])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      try {
        const parsed = e.newValue ? (JSON.parse(e.newValue) as string[]) : []
        if (Array.isArray(parsed)) setIds(new Set(parsed))
      } catch { /* noop */ }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const has = useCallback((id: string) => ids.has(id), [ids])
  const add = useCallback((id: string) => {
    setIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev); next.add(id); return next
    })
  }, [])
  const remove = useCallback((id: string) => {
    setIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev); next.delete(id); return next
    })
  }, [])
  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])
  const clear = useCallback(() => setIds(new Set()), [])

  return (
    <Ctx.Provider value={{
      ids, hydrated, has, add, remove, toggle, clear,
      count: ids.size, list: [...ids],
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWishlist() vereist een WishlistProvider in de tree')
  return ctx
}
