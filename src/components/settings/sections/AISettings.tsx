'use client'

import { useSettings } from '@/contexts/SettingsContext'
import { useStore } from '@/lib/store'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles } from 'lucide-react'

export default function AISettings() {
  const { settings, updateSetting } = useSettings()
  const setAutoTagEnabled = useStore((s) => s.setAutoTagEnabled)

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-4">AI 功能</h3>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              启用 AI
            </Label>
            <p className="text-xs text-muted-foreground">开启后可使用 AI 自动标签、智能搜索等功能</p>
          </div>
          <Switch
            checked={settings.aiEnabled}
            onCheckedChange={(v) => {
              updateSetting('aiEnabled', v)
              setAutoTagEnabled(v)
            }}
          />
        </div>
      </section>

      <div className="border-t border-border/40" />

      <section>
        <h3 className="text-base font-semibold mb-4">BYOK 配置</h3>
        <p className="text-xs text-muted-foreground mb-5">使用你自己的 API Key 连接 AI 服务（Bring Your Own Key）</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Base URL</Label>
            <Input
              value={settings.aiBaseUrl}
              onChange={(e) => updateSetting('aiBaseUrl', e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full max-w-md"
              disabled={!settings.aiEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">API Key</Label>
            <Input
              type="password"
              value={settings.aiApiKey}
              onChange={(e) => updateSetting('aiApiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full max-w-md"
              disabled={!settings.aiEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">模型名称</Label>
            <Input
              value={settings.aiModel}
              onChange={(e) => updateSetting('aiModel', e.target.value)}
              placeholder="gpt-4o"
              className="w-full max-w-md"
              disabled={!settings.aiEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">默认语言</Label>
            <Select
              value={settings.aiDefaultLanguage}
              onValueChange={(v) => updateSetting('aiDefaultLanguage', v)}
              disabled={!settings.aiEnabled}
            >
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
            <Label className="text-sm font-medium">提示词 (Prompt)</Label>
            <Textarea
              value={settings.aiPrompt}
              onChange={(e) => updateSetting('aiPrompt', e.target.value)}
              placeholder="自定义 AI 提示词，用于指导 AI 的行为和输出格式..."
              className="w-full max-w-md min-h-[120px]"
              disabled={!settings.aiEnabled}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
