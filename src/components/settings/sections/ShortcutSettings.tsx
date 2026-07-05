'use client'

import { Kbd } from '@/components/ui/kbd'

const SHORTCUTS = [
  { keys: ['⌘', 'K'], action: '打开搜索' },
  { keys: ['⌘', 'D'], action: '添加书签' },
  { keys: ['⌘', 'E'], action: '编辑选中书签' },
  { keys: ['⌘', 'F'], action: '在书签中查找' },
  { keys: ['Delete'], action: '删除选中书签' },
  { keys: ['Esc'], action: '关闭弹窗 / 取消操作' },
  { keys: ['⌘', 'B'], action: '切换侧边栏' },
  { keys: ['⌘', 'Shift', 'D'], action: '全局快速添加书签' },
  { keys: ['⌘', 'Enter'], action: '在新标签页打开' },
]

export default function ShortcutSettings() {
  return (
    <div className="space-y-8">
      {/* 全局快捷键 */}
      <section>
        <h3 className="text-base font-semibold mb-4">全局快捷键</h3>
        <div className="space-y-3">
          <div className="bg-muted/20 rounded-xl border border-border/40 p-4">
            <p className="text-xs text-muted-foreground">
              全局快捷键（如 ⌘+Shift+D 快速添加书签）需要安装浏览器扩展或桌面客户端才能在任何应用中触发。当前为预留设置。
            </p>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">快速添加书签</label>
              <p className="text-xs text-muted-foreground mb-1.5">从任意应用快速保存当前页面</p>
              <Kbd className="text-xs">⌘</Kbd>
              <span className="text-xs mx-1">+</span>
              <Kbd className="text-xs">⇧</Kbd>
              <span className="text-xs mx-1">+</span>
              <Kbd className="text-xs">D</Kbd>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* 应用内快捷键 */}
      <section>
        <h3 className="text-base font-semibold mb-4">应用内快捷键</h3>
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium py-2.5 px-4 text-muted-foreground">快捷键</th>
                <th className="text-left font-medium py-2.5 px-4 text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((item) => (
                <tr key={item.action} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, i) => (
                        <span key={i}>
                          <Kbd className="text-xs">{key}</Kbd>
                          {i < item.keys.length - 1 && <span className="text-xs mx-0.5 text-muted-foreground">+</span>}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-foreground">{item.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
