'use client'

import type { SettingsSection } from '@/contexts/SettingsContext'
import {
  UserCog,
  Settings,
  Sparkles,
  Database,
  Cloud,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSelect: (section: SettingsSection) => void
}

const MENU_ITEMS: { key: SettingsSection; icon: React.ElementType; label: string }[] = [
  { key: 'user', icon: UserCog, label: '用户设置' },
  { key: 'general', icon: Settings, label: '通用设置' },
  { key: 'ai', icon: Sparkles, label: 'AI设置' },
  { key: 'data', icon: Database, label: '数据管理' },
  { key: 'sync', icon: Cloud, label: '同步设置' },
  { key: 'about', icon: Info, label: '关于' },
]

export default function SettingsSidebar({ activeSection, onSelect }: SettingsSidebarProps) {
  return (
    <>
      {/* ========== 桌面端：左侧垂直侧边栏 ========== */}
      <div className="w-[200px] lg:w-[240px] border-r border-border/40 shrink-0 bg-muted/20 flex flex-col">
        <div className="px-4 py-4 border-b border-border/40 shrink-0">
          <h2 className="text-lg font-semibold">设置</h2>
        </div>

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
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            )
          })}
        </nav>

        <div className="px-4 py-3 border-t border-border/40 shrink-0">
          <p className="text-xs text-muted-foreground">喵链 MeowLink v0.1.0</p>
        </div>
      </div>
    </>
  )
}

export { MENU_ITEMS }
