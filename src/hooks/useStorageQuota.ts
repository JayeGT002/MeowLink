import { useState, useEffect, useCallback } from 'react'

interface StorageQuota {
  used: number
  quota: number
  percentage: number
  supported: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function useStorageQuota() {
  const [quota, setQuota] = useState<StorageQuota>({
    used: 0,
    quota: 0,
    percentage: 0,
    supported: false,
  })

  const refresh = useCallback(async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage ?? 0
        const total = estimate.quota ?? 0
        setQuota({
          used,
          quota: total,
          percentage: total > 0 ? Math.round((used / total) * 100) : 0,
          supported: true,
        })
      } else {
        setQuota((prev) => ({ ...prev, supported: false }))
      }
    } catch {
      setQuota((prev) => ({ ...prev, supported: false }))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    ...quota,
    usedFormatted: formatBytes(quota.used),
    quotaFormatted: formatBytes(quota.quota),
    refresh,
  }
}
