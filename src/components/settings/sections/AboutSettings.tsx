'use client'

import {
  BookOpen,
  ExternalLink,
  Github,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState, useCallback } from 'react'

export default function AboutSettings() {
  const [copied, setCopied] = useState(false)

  const handleCopyDebug = useCallback(() => {
    const info = {
      app: '喵链 MeowLink',
      version: 'v0.1.0',
      build: '2026-07-05',
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
    }
    navigator.clipboard.writeText(JSON.stringify(info, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [])

  return (
    <div className="space-y-8">
      {/* 应用信息 */}
      <section>
        <h3 className="text-base font-semibold mb-4">应用信息</h3>
        <div className="flex items-center gap-4 p-5 rounded-xl border bg-muted/20">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">喵链 MeowLink</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              本地优先的智能书签管理器
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>v0.1.0</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <span>构建于 2026-07-05</span>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* 开源与法律 */}
      <section>
        <h3 className="text-base font-semibold mb-4">开源与法律</h3>
        <p className="text-xs text-muted-foreground mb-3">
          所有数据存储在浏览器 IndexedDB 中，不会上传到任何服务器。
        </p>
        <div className="space-y-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-start gap-3 h-10 rounded-xl border border-border/40 bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-muted/30 w-full"
          >
              <Github className="w-4 h-4 shrink-0" />
              <span className="text-sm">开源协议 (MIT)</span>
              <ExternalLink className="w-3 h-3 shrink-0 ml-auto" />
            </a>
          <Button variant="outline" className="w-full justify-start gap-3 h-10">
            <BookOpen className="w-4 h-4 shrink-0" />
            <span className="text-sm">第三方依赖许可</span>
          </Button>
        </div>
      </section>

      <div className="border-t" />

      {/* 反馈 */}
      <section>
        <h3 className="text-base font-semibold mb-4">反馈</h3>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3 h-10">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="text-sm">提交反馈</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-10"
            onClick={handleCopyDebug}
          >
            {copied ? <Check className="w-4 h-4 shrink-0 text-emerald-500" /> : <Copy className="w-4 h-4 shrink-0" />}
            <span className="text-sm">{copied ? '已复制调试信息' : '复制调试信息'}</span>
          </Button>
        </div>
      </section>
    </div>
  )
}
