'use client'

import { useSettings } from '@/contexts/SettingsContext'
import { useStore } from '@/lib/store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ThemeMode } from '@/contexts/SettingsContext'

const THEME_OPTIONS: { key: ThemeMode; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'light', icon: Sun, label: '亮色', desc: '清爽明亮的白色主题' },
  { key: 'dark', icon: Moon, label: '暗色', desc: '护眼的深色主题' },
  { key: 'system', icon: Monitor, label: '跟随系统', desc: '自动匹配系统设置' },
]

export default function GeneralSettings() {
  const { settings, updateSetting } = useSettings()
  const storeSetTheme = useStore((s) => s.setTheme)

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-4">语言与地区</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">界面语言</Label>
            <Select value={settings.language} onValueChange={(v) => updateSetting('language', v as any)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="border-t border-border/40" />

      <section>
        <h3 className="text-base font-semibold mb-4">主题模式</h3>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ key, icon: Icon, label, desc }) => (
            <button
              key={key}
              onClick={() => {
                updateSetting('theme', key)
                storeSetTheme(key)
              }}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                settings.theme === key
                  ? 'border-primary ring-2 ring-primary/20 bg-accent/50'
                  : 'border-border hover:border-muted-foreground/30'
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{label}</span>
              <span className="text-[10px] text-muted-foreground">{desc}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
