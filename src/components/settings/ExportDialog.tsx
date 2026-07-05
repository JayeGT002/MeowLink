import { useState, useCallback, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { exportBookmarks } from '@/lib/import-export'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  FileCode,
  FileSpreadsheet,
  FileText,
  FileArchive,
  Check,
  Globe,
  FolderTree,
  Filter,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// 导出格式定义
// ============================================================
interface FormatOption {
  id: 'html' | 'csv' | 'enex' | 'md'
  label: string
  icon: React.ElementType
  desc: string
  ext: string
}

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'html', label: 'HTML', icon: FileCode, desc: '导入 Chrome / Firefox / Edge', ext: '.html' },
  { id: 'csv', label: 'CSV', icon: FileSpreadsheet, desc: 'Excel 分析 / 数据库导入', ext: '.csv' },
  { id: 'enex', label: 'ENEX', icon: FileArchive, desc: '迁移至 Evernote / Notion', ext: '.enex' },
  { id: 'md', label: 'Markdown', icon: FileText, desc: '纯文本阅读 / GitHub 存档', ext: '.md' },
]

// ============================================================
// 导出范围定义
// ============================================================
interface ScopeOption {
  id: 'all' | 'folder' | 'filter' | 'favorites'
  label: string
  icon: React.ElementType
  hint: string
}

// ============================================================
// 统一导出对话框
// ============================================================
interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const {
    bookmarks,
    folders,
    selectedFolderId,
    searchQuery,
    selectedTag,
  } = useStore()

  const [format, setFormat] = useState<'html' | 'csv' | 'enex' | 'md'>('html')
  const [scope, setScope] = useState<'all' | 'folder' | 'filter' | 'favorites'>('all')
  const [includeDeleted, setIncludeDeleted] = useState(false)

  // ---------- 计算各范围的条目数 ----------
  const scopeCounts = useMemo(() => {
    const all = bookmarks.filter((b) => !b.isDeleted).length
    const favorites = bookmarks.filter((b) => !b.isDeleted && b.isFavorite).length

    let folderCount = 0
    if (selectedFolderId) {
      if (selectedFolderId === 'folder-root') {
        folderCount = all
      } else if (selectedFolderId === 'folder-favorites') {
        folderCount = favorites
      } else {
        const ids = new Set<string>([selectedFolderId])
        const stack = [selectedFolderId]
        while (stack.length > 0) {
          const currentId = stack.pop()!
          for (const f of folders) {
            if (f.parentId === currentId) {
              ids.add(f.id)
              stack.push(f.id)
            }
          }
        }
        folderCount = bookmarks.filter((b) => !b.isDeleted && ids.has(b.folderId)).length
      }
    }

    let filterCount = 0
    const hasFilter = !!(searchQuery.trim() || selectedTag)
    if (hasFilter) {
      let result = bookmarks.filter((b) => !b.isDeleted)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        result = result.filter((b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
      if (selectedTag) {
        result = result.filter((b) => b.tags.includes(selectedTag))
      }
      filterCount = result.length
    }

    return { all, folder: folderCount, filter: filterCount, favorites }
  }, [bookmarks, folders, selectedFolderId, searchQuery, selectedTag])

  // ---------- 构建导出书签列表 ----------
  const getExportBookmarks = useCallback(() => {
    let result = includeDeleted
      ? [...bookmarks]
      : bookmarks.filter((b) => !b.isDeleted)

    switch (scope) {
      case 'favorites':
        result = result.filter((b) => b.isFavorite)
        break
      case 'folder':
        if (selectedFolderId) {
          if (selectedFolderId === 'folder-root') break
          if (selectedFolderId === 'folder-favorites') {
            result = result.filter((b) => b.isFavorite)
            break
          }
          const ids = new Set<string>([selectedFolderId])
          const stack = [selectedFolderId]
          while (stack.length > 0) {
            const currentId = stack.pop()!
            for (const f of folders) {
              if (f.parentId === currentId) {
                ids.add(f.id)
                stack.push(f.id)
              }
            }
          }
          result = result.filter((b) => ids.has(b.folderId))
        }
        break
      case 'filter':
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          result = result.filter((b) =>
            b.title.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.tags.some((t) => t.toLowerCase().includes(q))
          )
        }
        if (selectedTag) {
          result = result.filter((b) => b.tags.includes(selectedTag))
        }
        break
    }
    return result
  }, [bookmarks, includeDeleted, scope, selectedFolderId, searchQuery, selectedTag, folders])

  const handleExport = useCallback(async () => {
    const list = getExportBookmarks()
    if (list.length === 0) return
    try {
      await exportBookmarks(format, list, folders)
      onOpenChange(false)
    } catch {}
  }, [format, getExportBookmarks, folders, onOpenChange])

  const hasActiveFilter = !!(searchQuery.trim() || selectedTag)
  const currentCount = (() => {
    switch (scope) {
      case 'all': return scopeCounts.all
      case 'folder': return scopeCounts.folder
      case 'filter': return scopeCounts.filter
      case 'favorites': return scopeCounts.favorites
    }
  })()

  const folderName = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.name
    : undefined

  // ---------- Scope options with dynamic labels ----------
  const scopeOptions: ScopeOption[] = useMemo(() => [
    { id: 'all', label: '全部书签', icon: Globe, hint: `${scopeCounts.all} 条` },
    {
      id: 'folder',
      label: folderName ? `"${folderName}"` : '当前文件夹',
      icon: FolderTree,
      hint: selectedFolderId ? `${scopeCounts.folder} 条` : '未选择',
    },
    {
      id: 'filter',
      label: '筛选结果',
      icon: Filter,
      hint: hasActiveFilter ? `${scopeCounts.filter} 条` : '未激活',
    },
    { id: 'favorites', label: '收藏夹', icon: Star, hint: `${scopeCounts.favorites} 条` },
  ], [scopeCounts, folderName, selectedFolderId, hasActiveFilter])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>导出书签</DialogTitle>
          <DialogDescription>
            选择导出范围和文件格式 — 所有格式均为有损导出，如需完整备份请使用 JSON 完整导出
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* ---- 导出范围 ---- */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 select-none">
              导出范围
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {scopeOptions.map((opt) => {
                const isActive = scope === opt.id
                const isDisabled =
                  (opt.id === 'folder' && !selectedFolderId) ||
                  (opt.id === 'filter' && !hasActiveFilter)

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isDisabled}
                    className={cn(
                      'group relative flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150',
                      isActive
                        ? 'border-foreground/15 bg-accent shadow-sm'
                        : 'border-border/80 hover:border-border hover:bg-accent/40',
                      isDisabled && 'opacity-30 cursor-not-allowed'
                    )}
                    onClick={() => setScope(opt.id as typeof scope)}
                  >
                    <span className="flex items-center gap-1.5">
                      <opt.icon className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        isActive ? 'text-foreground' : 'text-muted-foreground/70'
                      )} />
                      <span className={cn(
                        'text-[13px] font-medium leading-tight',
                        isActive ? 'text-foreground' : 'text-foreground/80'
                      )}>
                        {opt.label}
                      </span>
                    </span>
                    <span className={cn(
                      'text-[11px] leading-tight',
                      isActive ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    )}>
                      {opt.hint}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <Separator className="my-0" />

          {/* ---- 文件格式 ---- */}
          <section className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 select-none">
              文件格式
            </h4>
            <div className="grid grid-cols-2 gap-1.5">
              {FORMAT_OPTIONS.map((opt) => {
                const isSelected = format === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      'group relative flex flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-all duration-150',
                      isSelected
                        ? 'border-foreground/20 bg-accent/80'
                        : 'border-border/80 hover:border-border hover:bg-accent/40'
                    )}
                    onClick={() => setFormat(opt.id)}
                  >
                    <div className="flex items-start justify-between">
                      <opt.icon className={cn(
                        'h-4 w-4 shrink-0',
                        isSelected ? 'text-foreground' : 'text-muted-foreground/60'
                      )} />
                      {isSelected && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-foreground">
                          <Check className="h-2.5 w-2.5 text-background" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className={cn(
                        'text-[13px] font-medium leading-tight',
                        isSelected ? 'text-foreground' : 'text-foreground/80'
                      )}>
                        {opt.label}
                      </p>
                      <p className="text-[11px] leading-tight text-muted-foreground/60">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <Separator className="my-0" />

          {/* ---- 高级选项 ---- */}
          <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <Label
                htmlFor="include-deleted"
                className="text-[13px] font-medium cursor-pointer leading-tight"
              >
                包含已删除书签
              </Label>
              <span className="text-[11px] text-muted-foreground/60 leading-tight">
                将回收站中的书签一并导出
              </span>
            </div>
            <Switch
              id="include-deleted"
              checked={includeDeleted}
              onCheckedChange={setIncludeDeleted}
            />
          </div>
        </div>

        {/* ---- 底部操作栏 ---- */}
        <div className="flex items-center justify-between border-t border-border/60 px-6 py-3.5">
          <span className="text-xs text-muted-foreground tabular-nums">
            共 <span className="font-semibold text-foreground/70">{currentCount}</span> 条书签
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button size="sm" onClick={handleExport} disabled={currentCount === 0}>
              导出 {FORMAT_OPTIONS.find((f) => f.id === format)?.ext}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
