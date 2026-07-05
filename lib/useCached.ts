'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

// Stale-while-revalidate: paint instantly from sessionStorage,
// then refresh from the network in the background.
export function useCached<T>(key: string, url: string) {
  const [data, setData] = useState<T | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const raw = sessionStorage.getItem(`cache:${key}`)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(data === null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const fresh = await res.json()
      if (!res.ok || fresh?.error) return
      if (!mounted.current) return
      setData(fresh)
      setLoading(false)
      try { sessionStorage.setItem(`cache:${key}`, JSON.stringify(fresh)) } catch {}
    } catch {
      if (mounted.current) setLoading(false)
    }
  }, [key, url])

  useEffect(() => {
    mounted.current = true
    refresh()
    return () => { mounted.current = false }
  }, [refresh])

  // Allow local mutation (optimistic updates) + keep cache in sync
  const mutate = useCallback((updater: (prev: T | null) => T | null) => {
    setData(prev => {
      const next = updater(prev)
      try { sessionStorage.setItem(`cache:${key}`, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return { data, loading, refresh, mutate }
}
