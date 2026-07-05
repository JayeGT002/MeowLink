import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Trash2,
  AlertTriangle,
  Star,
  X,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Bookmark } from '@/lib/types'

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export default function BookmarkDetailPanel() {
  const {
    bookmarks,
    selectedBookmarkId,
    selectBookmark,
    updateBookmark,
    deleteBookmark: removeBookmark,
    openAddDialog,
  } = useStore()

  const bookmark = selectedBookmarkId ? bookmarks.find((b) => b.id === selectedBookmarkId) ?? null : null

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const descInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsEditingTitle(false)
    setIsEditingDesc(false)
  }, [bookmark?.id])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) titleInputRef.current.focus()
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDesc && descInputRef.current) descInputRef.current.focus()
  }, [isEditingDesc])

  const startEditTitle = useCallback(() => {
    if (!bookmark) return
    setEditTitle(bookmark.title)
    setIsEditingTitle(true)
  }, [bookmark])

  const saveTitle = useCallback(() => {
    if (!bookmark) return
    const trimmed = editTitle.trim()
    if (trimmed && trimmed !== bookmark.title) {
      updateBookmark(bookmark.id, { title: trimmed })
    }
    setIsEditingTitle(false)
  }, [editTitle, bookmark, updateBookmark])

  const startEditDesc = useCallback(() => {
    if (!bookmark) return
    setEditDesc(bookmark.description || '')
    setIsEditingDesc(true)
  }, [bookmark])

  const saveDesc = useCallback(() => {
    if (!bookmark) return
    const trimmed = editDesc.trim()
    if (trimmed !== (bookmark.description || '')) {
      updateBookmark(bookmark.id, { description: trimmed })
    }
    setIsEditingDesc(false)
  }, [editDesc, bookmark, updateBookmark])

  const handleDeleteConfirm = useCallback(() => {
    if (!bookmark) return
    removeBookmark(bookmark.id)
    setDeleteDialogOpen(false)
  }, [bookmark, removeBookmark])

  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    if (!bookmark) return
    navigator.clipboard.writeText(bookmark.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [bookmark])

  const handleOpenExternal = useCallback(() => {
    if (!bookmark) return
    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
  }, [bookmark])

  if (!bookmark) return null

  const domain = getDomain(bookmark.url)

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-xs font-medium text-muted-foreground">书签详情</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => selectBookmark(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* ---- 1. favicon + 标题 ---- */}
          <div className="flex items-start gap-3">
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="w-8 h-8 rounded-md flex-shrink-0 mt-0.5"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-muted flex-shrink-0 mt-0.5 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <div className="flex-1 min-w-0 group/title">
                  {isEditingTitle ? (
                    <Input
                      ref={titleInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={saveTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveTitle()
                        else if (e.key === 'Escape') setIsEditingTitle(false)
                      }}
                      className="text-sm font-semibold h-8 py-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={startEditTitle}
                      className="flex items-center gap-1.5 text-left hover:opacity-80 transition-opacity"
                    >
                      <h2 className="text-sm font-semibold leading-tight truncate">{bookmark.title}</h2>
                      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/title:opacity-100 shrink-0" />
                    </button>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 shrink-0"
                  onClick={() => openAddDialog(bookmark)}>
                  <Pencil className="h-3 w-3" />编辑
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-3 w-3" />删除
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{bookmark.url}</p>
            </div>
          </div>

          {/* ---- 3. Domain + action row ---- */}
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-muted/20 border border-border/40 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                  alt=""
                  className="w-4 h-4 rounded flex-shrink-0"
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
                <span className="text-xs text-muted-foreground truncate">{domain}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>在浏览器中打开</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>复制链接</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* ---- 描述 ---- */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">描述</span>
              {!isEditingDesc && (
                <Button variant="ghost" size="icon" className="h-5 w-5"
                  onClick={startEditDesc}>
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
            </div>
            {isEditingDesc ? (
              <Textarea
                ref={descInputRef}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') saveDesc()
                }}
                rows={3}
                className="resize-none text-sm"
                placeholder="添加描述..."
              />
            ) : bookmark.description ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{bookmark.description}</p>
            ) : (
              <button
                onClick={startEditDesc}
                className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-text text-left w-full"
              >
                添加描述...
              </button>
            )}
          </div>

          {/* ---- 标签 ---- */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
            <span className="text-xs font-medium text-muted-foreground">标签</span>
            <div className="mt-2">
              {bookmark.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {bookmark.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无标签</p>
              )}
            </div>
          </div>

          {/* ---- 信息 ---- */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
            <span className="text-xs font-medium text-muted-foreground">信息</span>
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>创建时间</span>
                <span>{new Date(bookmark.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <div className="flex justify-between">
                <span>更新时间</span>
                <span>{new Date(bookmark.updatedAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                删除书签
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{bookmark.title}」吗？将移入回收站。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
