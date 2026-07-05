'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ============================================================
// 类型定义
// ============================================================

export type ThemeMode = 'light' | 'dark' | 'system'
export type LanguageMode = 'zh-CN' | 'en' | 'ja'
export type SyncFrequency = 'realtime' | '15min' | 'hourly' | 'manual'
export type ConflictResolution = 'cloud' | 'local' | 'ask'
export type SettingsSection =
  | 'user'
  | 'general'
  | 'ai'
  | 'data'
  | 'sync'
  | 'about'

export interface SettingsState {
  // 用户设置
  avatar: string
  nickname: string
  password: string
  f2aEnabled: boolean

  // 通用设置
  language: LanguageMode
  theme: ThemeMode

  // AI 设置
  aiEnabled: boolean
  aiBaseUrl: string
  aiApiKey: string
  aiModel: string
  aiDefaultLanguage: string
  aiPrompt: string

  // 同步
  autoSync: boolean
  syncFrequency: SyncFrequency
  wifiOnlySync: boolean
  syncCoverImages: boolean
  offlineAccess: boolean
  conflictResolution: ConflictResolution
}

const defaultSettings: SettingsState = {
  avatar: '',
  nickname: '',
  password: '',
  f2aEnabled: false,

  language: 'zh-CN',
  theme: 'light',

  aiEnabled: false,
  aiBaseUrl: '',
  aiApiKey: '',
  aiModel: '',
  aiDefaultLanguage: 'zh-CN',
  aiPrompt: '',

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
