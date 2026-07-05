'use client'

import { useRef, useState } from 'react'
import { useSettings } from '@/contexts/SettingsContext'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Camera, Shield, Eye, EyeOff } from 'lucide-react'

export default function UserSettings() {
  const { settings, updateSetting } = useSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      updateSetting('avatar', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const initials = settings.nickname
    ? settings.nickname.slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-base font-semibold mb-4">个人资料</h3>
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <Avatar className="w-20 h-20">
              <AvatarImage src={settings.avatar || undefined} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium">
              {settings.nickname || '未设置昵称'}
            </p>
            <p className="text-xs text-muted-foreground">点击相机图标上传头像</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">昵称</Label>
            <Input
              value={settings.nickname}
              onChange={(e) => updateSetting('nickname', e.target.value)}
              placeholder="输入你的昵称"
              className="w-64"
            />
          </div>
        </div>
      </section>

      <div className="border-t border-border/40" />

      <section>
        <h3 className="text-base font-semibold mb-4">安全设置</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">登录密码</Label>
            <div className="relative w-64">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={settings.password}
                onChange={(e) => updateSetting('password', e.target.value)}
                placeholder="设置登录密码"
                className="pr-10"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                双因素认证 (F2A)
              </Label>
              <p className="text-xs text-muted-foreground">开启后登录时需要额外的验证码</p>
            </div>
            <Switch
              checked={settings.f2aEnabled}
              onCheckedChange={(v) => updateSetting('f2aEnabled', v)}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
