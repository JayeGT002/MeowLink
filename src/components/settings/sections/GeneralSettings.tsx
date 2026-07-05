'use client'

import { useSettings } from '@/contexts/SettingsContext'
import { useStore } from '@/lib/store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { LayoutGrid, List, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GeneralSettings() {
  const { settings, updateSetting } = useSettings()
  const autoTagEnabled = useStore((s) => s.autoTagEnabled)
  const setAutoTagEnabled = useStore((s) => s.setAutoTagEnabled)

  return (
    <div className="space-y-8">
      {/* 语言与地区 */}
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">日期格式</Label>
            <div className="flex gap-2">
              {(['zh', 'us', 'iso'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => updateSetting('dateFormat', fmt)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm border transition-colors',
                    settings.dateFormat === fmt
                      ? 'bg-muted/50 text-foreground border-border/40'
                      : 'border-border/40 hover:bg-muted/30'
                  )}
                >
                  {fmt === 'zh' ? '2026年7月5日' : fmt === 'us' ? '07/05/2026' : '2026-07-05'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border/40" />

      {/* 默认行为 */}
      <section>
        <h3 className="text-base font-semibold mb-4">默认行为</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">默认视图</Label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSetting('defaultView', 'card')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border border-border/40 transition-colors',
                  settings.defaultView === 'card'
                    ? 'bg-muted/50 text-foreground border-border/40'
                    : 'border-border/40 hover:bg-muted/30'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-sm">卡片</span>
              </button>
              <button
                onClick={() => updateSetting('defaultView', 'list')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border border-border/40 transition-colors',
                  settings.defaultView === 'list'
                    ? 'bg-muted/50 text-foreground border-border/40'
                    : 'border-border/40 hover:bg-muted/30'
                )}
              >
                <List className="w-4 h-4" />
                <span className="text-sm">列表</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">默认收藏夹</Label>
            <Select value={settings.defaultFolder} onValueChange={(v) => updateSetting('defaultFolder', v)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="folder-root">全部书签</SelectItem>
                <SelectItem value="folder-unsorted">未分类</SelectItem>
                <SelectItem value="folder-favorites">收藏夹</SelectItem>
                <SelectItem value="folder-dev">开发工具</SelectItem>
                <SelectItem value="folder-frontend">前端</SelectItem>
                <SelectItem value="folder-design">设计灵感</SelectItem>
                <SelectItem value="folder-reading">阅读清单</SelectItem>
                <SelectItem value="folder-ai">AI 探索</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">新书签保存位置</Label>
            <Select value={settings.newBookmarkFolder} onValueChange={(v) => updateSetting('newBookmarkFolder', v)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="folder-unsorted">未分类</SelectItem>
                <SelectItem value="folder-root">全部书签</SelectItem>
                <SelectItem value="folder-dev">开发工具</SelectItem>
                <SelectItem value="folder-frontend">前端</SelectItem>
                <SelectItem value="folder-backend">后端</SelectItem>
                <SelectItem value="folder-design">设计灵感</SelectItem>
                <SelectItem value="folder-reading">阅读清单</SelectItem>
                <SelectItem value="folder-ai">AI 探索</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="border-t border-border/40" />

      {/* AI 功能 */}
      <section>
        <h3 className="text-base font-semibold mb-4">AI 功能</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                自动标签
              </Label>
              <p className="text-xs text-muted-foreground">添加书签时 AI 自动识别标签，无需手动输入</p>
            </div>
            <Switch
              checked={autoTagEnabled}
              onCheckedChange={setAutoTagEnabled}
            />
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* 通知 */}
      <section>
        <h3 className="text-base font-semibold mb-4">通知</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">启用桌面通知</Label>
              <p className="text-xs text-muted-foreground">书签变更时通过系统通知提醒</p>
            </div>
            <Switch
              checked={settings.desktopNotifications}
              onCheckedChange={(v) => updateSetting('desktopNotifications', v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">收藏夹更新提醒</Label>
              <p className="text-xs text-muted-foreground">收藏的网页内容更新时发送通知</p>
            </div>
            <Switch
              checked={settings.favoriteUpdateNotify}
              onCheckedChange={(v) => updateSetting('favoriteUpdateNotify', v)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
