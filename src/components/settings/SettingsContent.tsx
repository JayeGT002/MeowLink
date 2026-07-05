'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSettings, type SettingsSection } from '@/contexts/SettingsContext'
import GeneralSettings from '@/components/settings/sections/GeneralSettings'
import DataSettings from '@/components/settings/sections/DataSettings'
import SyncSettings from '@/components/settings/sections/SyncSettings'
import AboutSettings from '@/components/settings/sections/AboutSettings'
import UserSettings from '@/components/settings/sections/UserSettings'
import AISettings from '@/components/settings/sections/AISettings'

interface SettingsContentProps {
  section: SettingsSection
  onClose: () => void
  /** 移动端模式：不渲染内联标题头部（标题已在父组件 sticky header 中） */
  mobile?: boolean
}

const SECTION_TITLES: Record<SettingsSection, string> = {
  user: '用户设置',
  general: '通用设置',
  ai: 'AI设置',
  data: '数据管理',
  sync: '同步设置',
  about: '关于',
}

export default function SettingsContent({ section, onClose, mobile = false }: SettingsContentProps) {
  const { saveToast, clearToast } = useSettings()

  useEffect(() => {
    if (!saveToast) return
    const timer = setTimeout(clearToast, 2000)
    return () => clearTimeout(timer)
  }, [saveToast, clearToast])

  const renderSection = () => {
    switch (section) {
      case 'user':    return <UserSettings />
      case 'general': return <GeneralSettings />
      case 'ai':      return <AISettings />
      case 'data':    return <DataSettings />
      case 'sync':    return <SyncSettings />
      case 'about':   return <AboutSettings />
    }
  }

  // 移动端：直接渲染内容（标题在父组件 sticky header 中）
  if (mobile) {
    return (
      <div className="max-w-[640px] px-5 py-4">
        {/* 保存提示 Toast */}
        <AnimatePresence>
          {saveToast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full mb-3 w-fit"
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
    )
  }

  // 桌面端：带标题头部的完整布局
  return (
    <div className="md:flex-1 md:min-w-0 md:flex md:flex-col md:overflow-hidden">
      <div className="px-8 py-4 border-b border-border/40 flex items-center justify-between md:shrink-0">
        <h2 className="text-lg font-semibold">{SECTION_TITLES[section]}</h2>

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

      <div className="md:flex-1 md:min-h-0 md:overflow-auto">
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
