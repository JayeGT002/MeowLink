'use client'

import { useSettings } from '@/contexts/SettingsContext'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Cloud, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function SyncSettings() {
  const { settings, updateSetting } = useSettings()

  return (
    <div className="space-y-8">
      {/* 账户 */}
      <section>
        <h3 className="text-base font-semibold mb-4">账户</h3>
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20">
          <Avatar className="h-10 w-10 bg-foreground/10">
            <AvatarFallback className="bg-foreground/15 text-foreground/60 text-sm font-medium">DU</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Demo User</p>
            <p className="text-xs text-muted-foreground">demo@meowlink.local</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <User className="w-3.5 h-3.5" />
            退出登录
          </Button>
        </div>
      </section>

      <div className="border-t" />

      {/* 同步设置 */}
      <section>
        <h3 className="text-base font-semibold mb-4">同步设置</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">自动同步</Label>
              <p className="text-xs text-muted-foreground">书签变更时自动同步到云端</p>
            </div>
            <Switch checked={settings.autoSync} onCheckedChange={(v) => updateSetting('autoSync', v)} />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">同步频率</Label>
            <Select value={settings.syncFrequency} onValueChange={(v) => updateSetting('syncFrequency', v as any)} disabled={!settings.autoSync}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">实时</SelectItem>
                <SelectItem value="15min">每 15 分钟</SelectItem>
                <SelectItem value="hourly">每小时</SelectItem>
                <SelectItem value="manual">手动</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">仅在 WiFi 下同步</Label>
              <p className="text-xs text-muted-foreground">移动网络下不自动同步</p>
            </div>
            <Switch checked={settings.wifiOnlySync} onCheckedChange={(v) => updateSetting('wifiOnlySync', v)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">同步封面图</Label>
              <p className="text-xs text-muted-foreground">可能消耗额外流量和存储空间</p>
            </div>
            <Switch checked={settings.syncCoverImages} onCheckedChange={(v) => updateSetting('syncCoverImages', v)} />
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* 离线模式 */}
      <section>
        <h3 className="text-base font-semibold mb-4">离线模式</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">允许离线访问</Label>
              <p className="text-xs text-muted-foreground">离线时仍可浏览和搜索已同步的本地书签</p>
            </div>
            <Switch checked={settings.offlineAccess} onCheckedChange={(v) => updateSetting('offlineAccess', v)} />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/40">
            <Cloud className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">离线模式下，所有操作将在恢复网络后自动同步。</p>
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* 冲突解决 */}
      <section>
        <h3 className="text-base font-semibold mb-4">冲突解决</h3>
        <p className="text-xs text-muted-foreground mb-3">当本地数据与云端数据发生冲突时的处理方式</p>
        <div className="space-y-2">
          {([
            { key: 'cloud', label: '优先云端', desc: '以云端数据为准，覆盖本地' },
            { key: 'local', label: '优先本地', desc: '以本地数据为准，覆盖云端' },
            { key: 'ask', label: '询问我', desc: '每次冲突时手动选择' },
          ] as const).map(({ key, label, desc }) => (
            <button
              key={key}
              onClick={() => updateSetting('conflictResolution', key)}
              className={cn(
                'w-full text-left px-4 py-2.5 rounded-xl border border-border/40 transition-colors',
                settings.conflictResolution === key
                  ? 'bg-muted/50 text-foreground border-border/40'
                  : 'border-border/40 hover:bg-muted/30'
              )}
            >
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
