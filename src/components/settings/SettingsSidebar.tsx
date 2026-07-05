'use client'

import { useState, useCallback } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import type { SettingsSection } from '@/contexts/SettingsContext'
import {
  Settings,
  Palette,
  Database,
  Cloud,
  Keyboard,
  Info,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSelect: (section: SettingsSection) => void
}

const MENU_ITEMS: { key: SettingsSection; icon: React.ElementType; label: string }[] = [
  { key: 'general', icon: Settings, label: '通用' },
  { key: 'appearance', icon: Palette, label: '外观' },
  { key: 'data', icon: Database, label: '数据管理' },
  { key: 'sync', icon: Cloud, label: '同步与账户' },
  { key: 'shortcuts', icon: Keyboard, label: '快捷键' },
  { key: 'about', icon: Info, label: '关于' },
]

export default function SettingsSidebar({ activeSection, onSelect }: SettingsSidebarProps) {
  return (
    <>
      {/* ============================================================
          桌面端：垂直侧边栏
          ============================================================ */}
      <div className="hidden md:flex flex-col w-[200px] lg:w-[240px] border-r border-border/40 shrink-0 bg-muted/20">
        {/* 标题 */}
        <div className="px-4 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold">设置</h2>
        </div>

        {/* 菜单项 */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-auto">
          {MENU_ITEMS.map(({ key, icon: Icon, label }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className={cn(
                  'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  isActive
                    ? 'bg-muted/50 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                )}
              >
                {/* 选中指示器 */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        {/* 底部版本号 */}
        <div className="px-4 py-3 border-t border-border/40">
          <p className="text-xs text-muted-foreground">喵链 MeowLink v0.1.0</p>
        </div>
      </div>

      {/* ============================================================
          移动端：水平滚动标签栏
          ============================================================ */}
      <div className="md:hidden border-b border-border/40 bg-muted/20 shrink-0">
        <div className="flex items-center gap-0.5 px-3 py-2.5 overflow-x-auto scrollbar-none">
          {MENU_ITEMS.map(({ key, icon: Icon, label }) => {
            const isActive = activeSection === key
            return (
              <button
                key={key}
                onClick={() => onSelect(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-muted/50 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

export { MENU_ITEMS }
