'use client'

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { SettingsProvider } from '@/contexts/SettingsContext'
import type { SettingsSection } from '@/contexts/SettingsContext'
import SettingsSidebar from '@/components/settings/SettingsSidebar'
import SettingsContent from '@/components/settings/SettingsContent'
import { Button } from '@/components/ui/button'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')

  const handleSelect = useCallback((section: SettingsSection) => {
    setActiveSection(section)
  }, [])

  return (
    <div className="flex h-full flex-col md:flex-row">
      {/* 左侧菜单 */}
      <SettingsSidebar activeSection={activeSection} onSelect={handleSelect} />

      {/* 右侧内容 */}
      <SettingsContent section={activeSection} onClose={onClose} />
    </div>
  )
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <SettingsProvider>
      <AnimatePresence>
        {open && (
          <>
            {/* 背景遮罩 + flex 居中容器 */}
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* 背景 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => onOpenChange(false)}
              />

              {/* 面板 — 移动端全屏，桌面端居中弹窗 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative bg-background rounded-2xl md:rounded-2xl rounded-none border border-border/40 shadow-float overflow-hidden flex flex-col
                  fixed inset-0 md:static
                  md:w-[65vw] md:max-w-[880px] md:h-[65vh] md:max-h-[680px]"
              >
              {/* 顶部栏：关闭按钮 */}
              <div className="absolute top-3 right-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* 双层布局 */}
              <div className="flex-1 min-h-0">
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
