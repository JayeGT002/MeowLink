'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Trash2,
  HardDrive,
  FileJson,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useStorageQuota } from '@/hooks/useStorageQuota'
import { Button } from '@/components/ui/button'
import { importBookmarksFromHTML, importBookmarksFromJSON, exportBookmarksAsJSON, downloadBookmarksJSON } from '@/lib/import-export'
import ExportDialog from '@/components/settings/ExportDialog'
import { cn } from '@/lib/utils'

export default function DataSettings() {
  const { initialize, bookmarks } = useStore()
  const { used, quota, percentage, usedFormatted, quotaFormatted, supported } = useStorageQuota()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const handleImportClick = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const isJSON = file.name.endsWith('.json')
      const count = isJSON
        ? await importBookmarksFromJSON(text)
        : await importBookmarksFromHTML(text)
      setImportResult({ success: true, message: `成功导入 ${count} 条书签` })
      await initialize()
    } catch {
      setImportResult({ success: false, message: '导入失败，请检查文件格式' })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [initialize])

  const handleFullExport = useCallback(async () => {
    try {
      const json = await exportBookmarksAsJSON()
      downloadBookmarksJSON(json)
    } catch {}
  }, [])

  const handleClearAll = useCallback(async () => {
    const { storage } = await import('@/lib/storage')
    await storage.clearAllAndReSeed()
    await initialize()
    setClearConfirm(false)
  }, [initialize])

  return (
    <div className="space-y-8">
      {/* 本地存储信息 */}
      <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background border border-border/50">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">本地存储</p>
            <p className="text-[11px] text-muted-foreground/70">
              IndexedDB
              {supported && (
                <>
                  <span className="mx-1.5 text-border/80" aria-hidden>|</span>
                  <span className="tabular-nums">{usedFormatted}</span>
                  <span className="text-muted-foreground/40"> / </span>
                  <span className="tabular-nums">{quotaFormatted}</span>
                </>
              )}
            </p>
          </div>
          {supported && (
            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
              {percentage}%
            </span>
          )}
        </div>
        {supported && (
          <div className="px-4 pb-3.5">
            <div className="h-1.5 w-full rounded-full bg-border/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/20 transition-all duration-500"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 导入 */}
      <section>
        <h3 className="text-base font-semibold mb-4">导入</h3>
        <div
          className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={handleImportClick}
        >
          <Upload className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm font-medium">拖拽或点击选择文件</p>
          <p className="text-xs text-muted-foreground mt-1">支持 JSON 备份 · Netscape HTML 书签 · 浏览器导出文件</p>
        </div>
        <Button
          variant="outline"
          className="w-full mt-3"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
          选择文件导入
        </Button>
        {importResult && (
          <div className={cn(
            'flex items-center gap-2 p-3 rounded-xl text-sm mt-3',
            importResult.success
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
          )}>
            {importResult.success ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {importResult.message}
          </div>
        )}
      </section>

      {/* 导出 */}
      <section>
        <h3 className="text-base font-semibold mb-4">导出</h3>
        <p className="text-xs text-muted-foreground mb-3">当前共 {bookmarks.length} 条书签</p>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={handleFullExport}
          >
            <FileJson className="w-4 h-4 shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">完整导出</p>
              <p className="text-xs text-muted-foreground">JSON 无损备份（含标签、文件夹、元数据）</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={() => setExportDialogOpen(true)}
          >
            <Upload className="w-4 h-4 shrink-0 rotate-180" />
            <div className="text-left">
              <p className="text-sm font-medium">更多格式…</p>
              <p className="text-xs text-muted-foreground">HTML / CSV / ENEX / Markdown</p>
            </div>
          </Button>
        </div>
        <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} />
      </section>

      <div className="border-t" />

      {/* 数据清除 */}
      <section>
        <div className="space-y-3">
          {!clearConfirm ? (
            <Button variant="outline" className="w-full justify-start gap-3 h-10 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" onClick={() => setClearConfirm(true)}>
              <Trash2 className="w-4 h-4 shrink-0 text-red-500" />
              <span className="text-sm text-red-600 dark:text-red-400">重置所有数据</span>
            </Button>
          ) : (
            <div className="p-3 rounded-xl border border-border/40 bg-muted/20 space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">确定要删除所有书签数据吗？此操作不可撤销。</p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleClearAll}>确认重置</Button>
                <Button size="sm" variant="ghost" onClick={() => setClearConfirm(false)}>取消</Button>
              </div>
            </div>
          )}
        </div>
      </section>

      <input ref={fileInputRef} type="file" accept=".json,.html,.htm" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
