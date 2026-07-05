'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSettings, type SettingsSection } from '@/contexts/SettingsContext'
import GeneralSettings from '@/components/settings/sections/GeneralSettings'
import AppearanceSettings from '@/components/settings/sections/AppearanceSettings'
import DataSettings from '@/components/settings/sections/DataSettings'
import SyncSettings from '@/components/settings/sections/SyncSettings'
import ShortcutSettings from '@/components/settings/sections/ShortcutSettings'
import AboutSettings from '@/components/settings/sections/AboutSettings'

interface SettingsContentProps {
  section: SettingsSection
  onClose: () => void
}

const SECTION_TITLES: Record<SettingsSection, string> = {
  general: '通用设置',
  appearance: '外观',
  data: '数据管理',
  sync: '同步与账户',
  shortcuts: '快捷键',
  about: '关于',
}

export default function SettingsContent({ section, onClose }: SettingsContentProps) {
  const { saveToast, clearToast } = useSettings()

  // 2 秒后自动清除 Toast
  useEffect(() => {
    if (!saveToast) return
    const timer = setTimeout(clearToast, 2000)
    return () => clearTimeout(timer)
  }, [saveToast, clearToast])

  const renderSection = () => {
    switch (section) {
      case 'general':   return <GeneralSettings />
      case 'appearance': return <AppearanceSettings />
      case 'data':      return <DataSettings />
      case 'sync':      return <SyncSettings />
      case 'shortcuts': return <ShortcutSettings />
      case 'about':     return <AboutSettings />
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
      {/* 标题栏 + 保存提示 */}
      <div className="px-8 py-4 border-b border-border/40 flex items-center justify-between shrink-0">
        <h2 className="text-lg font-semibold">{SECTION_TITLES[section]}</h2>

        {/* 自动保存 Toast — 纯灰度 */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full"
            >
              <motion.svg
                width="14" height="14" viewBox="0 0 14 14" fill="none"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <path d="M11.5 3.5L5.5 10.5L2.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
              已自动保存
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[640px] px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
