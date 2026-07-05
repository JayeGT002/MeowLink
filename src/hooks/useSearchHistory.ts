import { useState, useCallback } from 'react'

const STORAGE_KEY = 'meowlink-recent-searches'
const MAX_ITEMS = 10

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.slice(0, MAX_ITEMS)
    }
  } catch {}
  return []
}

function saveHistory(history: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {}
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(loadHistory)

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    setHistory((prev) => {
      const filtered = prev.filter((item) => item !== trimmed)
      const next = [trimmed, ...filtered].slice(0, MAX_ITEMS)
      saveHistory(next)
      return next
    })
  }, [])

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item !== query)
      saveHistory(next)
      return next
    })
  }, [])

  return { history, addToHistory, removeFromHistory }
}
