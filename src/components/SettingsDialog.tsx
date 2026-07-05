'use client'

import { useState, useCallback } from 'react'
import { X, ChevronLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SettingsProvider } from '@/contexts/SettingsContext'
import type { SettingsSection } from '@/contexts/SettingsContext'
import SettingsSidebar, { MENU_ITEMS } from '@/components/settings/SettingsSidebar'
import SettingsContent from '@/components/settings/SettingsContent'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SECTION_TITLES: Record<SettingsSection, string> = {
  user: '用户设置',
  general: '通用设置',
  ai: 'AI设置',
  data: '数据管理',
  sync: '同步设置',
  about: '关于',
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  // 移动端：null = 显示菜单列表；非 null = 显示某 section 详情
  const [activeSection, setActiveSection] = useState<SettingsSection | null>(null)

  const handleSelect = useCallback((section: SettingsSection) => {
    setActiveSection(section)
  }, [])

  const handleBack = useCallback(() => {
    setActiveSection(null)
  }, [])

  // 桌面端默认选中第一个 section
  const desktopSection = activeSection ?? 'user'

  // ============================================================
  // 桌面端：左侧侧边栏 + 右侧内容
  // ============================================================
  const DesktopLayout = (
    <>
      <SettingsSidebar
        activeSection={desktopSection}
        onSelect={handleSelect}
      />
      <SettingsContent section={desktopSection} onClose={onClose} />
    </>
  )

  // ============================================================
  // 移动端菜单列表（初始页）
  // ============================================================
  const MobileMenu = (
    <div className="flex flex-col h-full">
      {/* 头部：标题 + 关闭 */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40 shrink-0">
        <h2 className="text-lg font-semibold">设置</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 菜单列表 */}
      <nav className="flex-1 overflow-auto px-3 py-2">
        <div className="space-y-0.5">
          {MENU_ITEMS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors text-muted-foreground hover:bg-muted/30 hover:text-foreground active:bg-muted/50"
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground/40" />
            </button>
          ))}
        </div>
      </nav>

      {/* 底部版本 */}
      <div className="px-5 py-3 border-t border-border/40 shrink-0">
        <p className="text-xs text-muted-foreground">喵链 MeowLink v0.1.0</p>
      </div>
    </div>
  )

  // ============================================================
  // 移动端详情页（section 内容 + 返回按钮）
  // ============================================================
  const MobileDetail = activeSection && (
    <div className="flex flex-col h-full">
      {/* 头部：返回 + 标题 + 关闭 */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-border/40 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={handleBack}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-base font-semibold flex-1 truncate">
          {SECTION_TITLES[activeSection]}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full shrink-0"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-auto">
        <SettingsContent section={activeSection} onClose={onClose} mobile />
      </div>
    </div>
  )

  return (
    <>
      {/* ========== 桌面端布局 ========== */}
      <div className="hidden md:flex md:flex-row md:h-full">
        {DesktopLayout}
      </div>

      {/* ========== 移动端布局 ========== */}
      <div className="md:hidden flex flex-col h-full">
        {activeSection === null ? MobileMenu : MobileDetail}
      </div>
    </>
  )
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <SettingsProvider>
      <AnimatePresence>
        {open && (
          <>
            {/* 背景遮罩 + flex 居中容器 */}
            <div className="fixed inset-0 z-50 md:flex md:items-center md:justify-center">
              {/* 背景 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50 z-0"
                onClick={() => onOpenChange(false)}
              />

              {/* 面板 — 移动端全屏，桌面端居中弹窗 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={cn(
                  'z-10 bg-background border border-border/40 shadow-float overflow-hidden flex flex-col',
                  'absolute inset-0 md:relative md:inset-auto',
                  'md:rounded-2xl rounded-none',
                  'md:w-[65vw] md:max-w-[880px] md:h-[65vh] md:max-h-[680px]'
                )}
              >
                {/* 桌面端关闭按钮（绝对定位） */}
                <div className="absolute top-3 right-3 z-10 hidden md:block">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* 面板内容 */}
                <div className="flex-1 min-h-0 md:overflow-hidden">
                  <SettingsPanel onClose={() => onOpenChange(false)} />
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </SettingsProvider>
  )
}
