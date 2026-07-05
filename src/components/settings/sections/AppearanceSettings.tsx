'use client'

import { useStore } from '@/lib/store'
import { useSettings } from '@/contexts/SettingsContext'
import type { ThemeMode, AccentColor, DensityMode, FontMode } from '@/contexts/SettingsContext'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCENT_COLORS: { key: AccentColor; color: string; label: string }[] = [
  { key: 'slate', color: '#64748b', label: 'Slate' },
  { key: 'violet', color: '#8b5cf6', label: 'Violet' },
  { key: 'indigo', color: '#6366f1', label: 'Indigo' },
  { key: 'blue', color: '#3b82f6', label: 'Blue' },
  { key: 'emerald', color: '#10b981', label: 'Emerald' },
  { key: 'orange', color: '#f97316', label: 'Orange' },
  { key: 'red', color: '#ef4444', label: 'Red' },
  { key: 'pink', color: '#ec4899', label: 'Pink' },
]

const THEME_OPTIONS: { key: ThemeMode; icon: React.ElementType; label: string; desc: string }[] = [
  { key: 'light', icon: Sun, label: '亮色', desc: '清爽明亮的白色主题' },
  { key: 'dark', icon: Moon, label: '暗色', desc: '护眼的深色主题' },
  { key: 'system', icon: Monitor, label: '跟随系统', desc: '自动匹配系统设置' },
]

const DENSITY_OPTIONS: DensityMode[] = ['compact', 'comfortable', 'spacious']
const FONT_OPTIONS: { key: FontMode; label: string }[] = [
  { key: 'system', label: '系统默认' },
  { key: 'sans', label: '无衬线 (Inter)' },
  { key: 'mono', label: '等宽 (JetBrains Mono)' },
]

export default function AppearanceSettings() {
  const { settings, updateSetting } = useSettings()
  const storeSetTheme = useStore((s) => s.setTheme)

  return (
    <div className="space-y-8">
      {/* 主题模式 */}
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

      <div className="border-t" />

      {/* 强调色 */}
      <section>
        <h3 className="text-base font-semibold mb-4">强调色</h3>
        <div className="flex items-center gap-3 flex-wrap">
          {ACCENT_COLORS.map(({ key, color }) => (
            <button
              key={key}
              onClick={() => updateSetting('accentColor', key)}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                settings.accentColor === key && 'ring-2 ring-offset-2 ring-primary'
              )}
              style={{ backgroundColor: color }}
              title={key}
            >
              {settings.accentColor === key && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="border-t" />

      {/* 界面密度 */}
      <section>
        <h3 className="text-base font-semibold mb-4">界面密度</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-muted-foreground w-12">紧凑</span>
            <Slider
              value={[DENSITY_OPTIONS.indexOf(settings.density)]}
              onValueChange={([v]) => updateSetting('density', DENSITY_OPTIONS[v])}
              min={0}
              max={2}
              step={1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">宽松</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>当前：{settings.density === 'compact' ? '紧凑' : settings.density === 'comfortable' ? '舒适' : '宽松'}</span>
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* 字体 */}
      <section>
        <h3 className="text-base font-semibold mb-4">字体</h3>
        <div className="space-y-2">
          {FONT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => updateSetting('font', key)}
              className={cn(
                'w-full text-left px-4 py-2.5 rounded-xl border border-border/40 transition-colors text-sm',
                settings.font === key
                  ? 'bg-muted/50 text-foreground border-border/40'
                  : 'border-border/40 hover:bg-muted/30'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
