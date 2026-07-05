'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ============================================================
// 类型定义
// ============================================================

export type ThemeMode = 'light' | 'dark' | 'system'
export type AccentColor = 'slate' | 'violet' | 'indigo' | 'blue' | 'emerald' | 'orange' | 'red' | 'pink'
export type DensityMode = 'compact' | 'comfortable' | 'spacious'
export type DateFormat = 'zh' | 'us' | 'iso'
export type LanguageMode = 'zh-CN' | 'en' | 'ja'
export type FontMode = 'system' | 'sans' | 'mono'
export type SyncFrequency = 'realtime' | '15min' | 'hourly' | 'manual'
export type ConflictResolution = 'cloud' | 'local' | 'ask'
export type DefaultView = 'card' | 'list'
export type SettingsSection =
  | 'general'
  | 'appearance'
  | 'data'
  | 'sync'
  | 'shortcuts'
  | 'about'

export interface SettingsState {
  // 通用
  language: LanguageMode
  dateFormat: DateFormat
  defaultView: DefaultView
  defaultFolder: string
  newBookmarkFolder: string
  desktopNotifications: boolean
  favoriteUpdateNotify: boolean

  // 外观
  theme: ThemeMode
  accentColor: AccentColor
  density: DensityMode
  font: FontMode

  // 同步
  autoSync: boolean
  syncFrequency: SyncFrequency
  wifiOnlySync: boolean
  syncCoverImages: boolean
  offlineAccess: boolean
  conflictResolution: ConflictResolution
}

const defaultSettings: SettingsState = {
  language: 'zh-CN',
  dateFormat: 'zh',
  defaultView: 'list',
  defaultFolder: 'folder-root',
  newBookmarkFolder: 'folder-unsorted',
  desktopNotifications: false,
  favoriteUpdateNotify: false,

  theme: 'light',
  accentColor: 'slate',
  density: 'comfortable',
  font: 'system',

  autoSync: true,
  syncFrequency: 'realtime',
  wifiOnlySync: false,
  syncCoverImages: true,
  offlineAccess: true,
  conflictResolution: 'ask',
}

// ============================================================
// Context
// ============================================================

interface SettingsContextValue {
  settings: SettingsState
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void
  resetSettings: () => void
  saveToast: boolean
  clearToast: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

const STORAGE_KEY = 'meowlink-settings'

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) }
      }
    } catch {}
    return defaultSettings
  })
  const [saveToast, setSaveToast] = useState(false)

  // 持久化到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings])

  const updateSetting = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaveToast(true)
  }, [])

  const clearToast = useCallback(() => {
    setSaveToast(false)
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    setSaveToast(true)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, saveToast, clearToast }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
