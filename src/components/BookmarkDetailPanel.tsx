import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  ExternalLink,
  Copy,
  Check,
  Share2,
  FolderInput,
  Folder,
  Archive,
  Link,
  Star,
  Eye,
  Clock,
  MousePointerClick,
  X,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Bookmark, LinkStatus, Note } from '@/lib/types'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
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

// ==================== 辅助函数 ====================

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '从未'
  const now = Date.now()
  const past = new Date(dateStr).getTime()
  const diff = now - past
  if (diff < 0) return '刚刚'
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} 周前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`
  const years = Math.floor(days / 365)
  return `${years} 年前`
}

function getStatusLabel(status: LinkStatus): string {
  switch (status) {
    case 'ok': return '正常'
    case 'broken': return '失效'
    case 'redirect': return '重定向'
  }
}

function getStatusColor(status: LinkStatus): string {
  switch (status) {
    case 'ok': return 'bg-emerald-500'
    case 'broken': return 'bg-red-500'
    case 'redirect': return 'bg-amber-500'
  }
}

function brighten(rgb: string, factor: number): string {
  const m = rgb.match(/\d+/g)
  if (!m || m.length < 3) return rgb
  const [r, g, b] = m.map((v) => Math.min(255, Math.round(+v * factor)))
  return `rgb(${r},${g},${b})`
}

const FALLBACK_GRADIENTS = [
  { from: '#6366f1', to: '#8b5cf6' },
  { from: '#3b82f6', to: '#06b6d4' },
  { from: '#10b981', to: '#14b8a6' },
  { from: '#f59e0b', to: '#ef4444' },
  { from: '#ec4899', to: '#a855f7' },
  { from: '#64748b', to: '#475569' },
  { from: '#14b8a6', to: '#6366f1' },
  { from: '#f97316', to: '#db2777' },
  { from: '#84cc16', to: '#06b6d4' },
  { from: '#8b5cf6', to: '#ec4899' },
]

function pickFallbackGradient(domain: string): { from: string; to: string } {
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  }
  return FALLBACK_GRADIENTS[Math.abs(hash) % FALLBACK_GRADIENTS.length]
}

// ==================== 组件 ====================

export function BookmarkDetailPanel() {
  const {
    bookmarks,
    selectedBookmarkId,
    selectBookmark,
    updateBookmark,
    toggleFavorite,
    toggleArchive,
    openAddDialog,
    deleteBookmark,
    setSelectedTag,
    addToast,
  } = useStore()

  // ---------- 本地状态 ----------
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [editingDescriptionValue, setEditingDescriptionValue] = useState('')
  const [showNewTagInput, setShowNewTagInput] = useState(false)
  const [newTagValue, setNewTagValue] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  const newTagInputRef = useRef<HTMLInputElement>(null)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [extractedColor, setExtractedColor] = useState<string | null>(null)
  const extractCanvasRef = useRef<HTMLCanvasElement>(null)

  const bookmark = bookmarks.find((b) => b.id === selectedBookmarkId) ?? null

  // 清理定时器
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  // 当选中书签变化时重置编辑状态
  useEffect(() => {
    setEditingDescription(false)
    setEditingDescriptionValue('')
    setShowNewTagInput(false)
    setNewTagValue('')
    setNewNoteContent('')
  }, [selectedBookmarkId])

  // autoFocus 新标签输入
  useEffect(() => {
    if (showNewTagInput && newTagInputRef.current) {
      newTagInputRef.current.focus()
    }
  }, [showNewTagInput])

  // autoFocus 描述编辑
  useEffect(() => {
    if (editingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus()
    }
  }, [editingDescription])

  useEffect(() => {
    if (!bookmark) return
    const domain = getDomain(bookmark.url)
    const src = bookmark.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`

    setExtractedColor(null)

    const canvas = extractCanvasRef.current
    if (!canvas) return

    let blobUrl: string | null = null
    let cancelled = false

    async function extract() {
      try {
        const resp = await fetch(src)
        if (!resp.ok || cancelled) return
        const blob = await resp.blob()
        if (cancelled) return
        blobUrl = URL.createObjectURL(blob)
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('img load failed'))
          img.src = blobUrl!
        })
        if (cancelled || !canvas) return
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 100) {
            r += data[i]
            g += data[i + 1]
            b += data[i + 2]
            count++
          }
        }
        if (count > 0 && !cancelled) {
          setExtractedColor(`rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`)
        }
      } catch {
        // fetch failed (CORS) — fallback to curated gradient
      }
    }

    extract()

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [bookmark?.id])

  // ---------- 操作函数 ----------

  const handleCopy = useCallback(() => {
    if (!bookmark) return
    navigator.clipboard.writeText(bookmark.url)
    setCopied(true)
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [bookmark])

  const handleShare = useCallback(async () => {
    if (!bookmark) return
    if (navigator.share) {
      try {
        await navigator.share({ title: bookmark.title, url: bookmark.url })
      } catch {
        // 用户取消
      }
    } else {
      // 降级为复制链接
      navigator.clipboard.writeText(bookmark.url)
      addToast('链接已复制到剪贴板', 'info')
    }
  }, [bookmark, addToast])

  const handleCopyShortUrl = useCallback(() => {
    if (!bookmark?.shortUrl) return
    navigator.clipboard.writeText(bookmark.shortUrl)
    addToast('短链接已复制', 'success')
  }, [bookmark, addToast])

  const handleRemoveTag = useCallback(
    (tag: string) => {
      if (!bookmark) return
      const newTags = bookmark.tags.filter((t) => t !== tag)
      updateBookmark(bookmark.id, {
        tags: newTags,
        tagSource: bookmark.tagSource === 'ai' ? 'mixed' : bookmark.tagSource,
      })
    },
    [bookmark, updateBookmark]
  )

  const handleAddTag = useCallback(() => {
    if (!bookmark || !newTagValue.trim()) {
      setShowNewTagInput(false)
      setNewTagValue('')
      return
    }
    const tag = newTagValue.trim()
    if (bookmark.tags.includes(tag)) {
      setShowNewTagInput(false)
      setNewTagValue('')
      return
    }
    updateBookmark(bookmark.id, {
      tags: [...bookmark.tags, tag],
      tagSource: bookmark.tagSource === 'ai' ? 'mixed' : 'manual',
    })
    setShowNewTagInput(false)
    setNewTagValue('')
  }, [bookmark, newTagValue, updateBookmark])

  const handleSaveDescription = useCallback(() => {
    if (!bookmark) return
    const trimmed = editingDescriptionValue.trim()
    updateBookmark(bookmark.id, { description: trimmed })
    setEditingDescription(false)
    setEditingDescriptionValue('')
  }, [bookmark, editingDescriptionValue, updateBookmark])

  const handleAddNote = useCallback(() => {
    if (!bookmark || !newNoteContent.trim() || addingNote) return
    setAddingNote(true)
    const note: Note = {
      id: `note-${Date.now()}`,
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
    }
    updateBookmark(bookmark.id, {
      notes: [...bookmark.notes, note],
    })
    setNewNoteContent('')
    setAddingNote(false)
  }, [bookmark, newNoteContent, addingNote, updateBookmark])

  const handleDelete = useCallback(() => {
    if (!bookmark) return
    deleteBookmark(bookmark.id)
    setDeleteDialogOpen(false)
    addToast('书签已删除', 'success')
  }, [bookmark, deleteBookmark, addToast])

  // 推荐标签（简单实现：AI 标签中未被手动选中的）
  const recommendedTags = useMemo(() => {
    if (!bookmark || bookmark.tags.length >= 3) return []
    return bookmark.aiTags.filter((t) => !bookmark.tags.includes(t)).slice(0, 3 - bookmark.tags.length)
  }, [bookmark])

  // ---------- 相关书签推荐 ----------
  const relatedBookmarks = useMemo((): Bookmark[] => {
    if (!bookmark) return []
    const sameFolder = bookmarks.filter(
      (b) => b.id !== bookmark.id && b.folderId === bookmark.folderId
    )
    const tagScored = bookmarks
      .filter((b) => b.id !== bookmark.id && !sameFolder.some((sf) => sf.id === b.id))
      .map((b) => {
        const shared = b.tags.filter((t) => bookmark.tags.includes(t))
        return { bookmark: b, score: shared.length }
      })
      .filter((b) => b.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((b) => b.bookmark)

    const combined = [...sameFolder, ...tagScored]
    // 去重
    const seen = new Set<string>()
    const unique = combined.filter((b) => {
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })

    // 补齐到 4 个
    if (unique.length < 4) {
      const remaining = bookmarks.filter(
        (b) => b.id !== bookmark.id && !unique.some((u) => u.id === b.id)
      )
      const shuffled = [...remaining].sort(() => Math.random() - 0.5)
      unique.push(...shuffled.slice(0, 4 - unique.length))
    }

    return unique.slice(0, 4)
  }, [bookmark, bookmarks])

  // ==================== 空状态 ====================

  const domain = useMemo(() => (bookmark ? getDomain(bookmark.url) : ''), [bookmark?.url])
  const faviconSrc = bookmark?.favicon
    ? bookmark.favicon
    : domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      : ''

  const gradient = useMemo(() => pickFallbackGradient(domain || 'unknown'), [domain])

  const coverBackground = extractedColor
    ? `radial-gradient(circle at 50% 45%, ${brighten(extractedColor, 1.5)}, ${brighten(extractedColor, 0.55)})`
    : `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`

  if (!bookmark) {
    // 移动端不渲染空状态面板（null），桌面端显示空状态提示
    return (
      <div className="hidden lg:flex w-[340px] border-l border-border/50 bg-background flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground/30">
          <MousePointerClick size={48} strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground/50">选择一个书签查看详情</p>
        </div>
      </div>
    )
  }

  // ==================== 渲染内容 ====================

  return (
    <>
      {/* ========== 桌面端：右侧内联面板 / 移动端：全屏覆盖层 ========== */}
      <div className="
        lg:relative lg:w-[340px] lg:border-l lg:border-border/50 lg:flex
        fixed inset-0 z-40
        bg-background flex flex-col
      ">
        <ScrollArea className="flex-1 h-0 min-h-0">
          <div className="px-4 py-4 space-y-3">

          {/* ========== 1. 封面图 — 移动端全宽无边角，桌面端圆角卡片 ========== */}
          <div className="
            -mx-4 lg:mx-0 relative overflow-hidden
            h-80
            lg:rounded-2xl
          ">
            <div
              className="w-full h-full flex items-center justify-center transition-all duration-700"
              style={{ background: coverBackground }}
            >
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-[3rem] opacity-30 blur-2xl"
                  style={{ background: extractedColor || '#6366f1' }}
                />
                <Folder
                  className="relative w-24 h-24 text-white drop-shadow-lg"
                  strokeWidth={1.5}
                />
              </div>
              <canvas ref={extractCanvasRef} className="hidden" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <h2 className="text-white font-semibold text-lg drop-shadow-md line-clamp-2">
                {bookmark.title}
              </h2>
              <div className="text-white/80 text-sm flex items-center gap-1.5 mt-1">
                <img
                  src={faviconSrc}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <span>{domain}</span>
              </div>
            </div>

            {/* 移动端返回按钮 — 与星标同级定位，自动对齐 */}
            <button
              className="lg:hidden absolute top-3 left-3 h-9 w-9 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 flex items-center justify-center transition-colors"
              onClick={() => selectBookmark(null)}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Star 按钮 */}
            <button
              onClick={() => toggleFavorite(bookmark.id)}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40 flex items-center justify-center transition-colors"
            >
              <Star
                size={18}
                className={cn(
                  bookmark.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'fill-none'
                )}
              />
            </button>
          </div>

          {/* ========== 2. 操作栏 ========== */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-1">
            <div className="grid grid-cols-6 gap-0.5">
              {/* 打开 */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 flex-col gap-0.5 text-xs rounded-lg"
                    onClick={() => window.open(bookmark.url, '_blank')}
                  >
                    <ExternalLink size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>打开</TooltipContent>
              </Tooltip>

              {/* 复制 */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 flex-col gap-0.5 text-xs rounded-lg"
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? '已复制' : '复制'}</TooltipContent>
              </Tooltip>

              {/* 分享 */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 flex-col gap-0.5 text-xs rounded-lg"
                    onClick={handleShare}
                  >
                    <Share2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>分享</TooltipContent>
              </Tooltip>

              {/* 移动 */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 flex-col gap-0.5 text-xs rounded-lg"
                    onClick={() => openAddDialog(bookmark)}
                  >
                    <FolderInput size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>移动</TooltipContent>
              </Tooltip>

              {/* 归档 */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 flex-col gap-0.5 text-xs rounded-lg"
                    onClick={() => toggleArchive(bookmark.id)}
                  >
                    <Archive
                      size={14}
                      className={bookmark.isArchived ? 'text-amber-500' : ''}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{bookmark.isArchived ? '取消归档' : '归档'}</TooltipContent>
              </Tooltip>

              {/* 短链 */}
              <Tooltip>
                <TooltipTrigger>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 flex-1 flex-col gap-0.5 text-xs rounded-lg"
                    onClick={handleCopyShortUrl}
                    disabled={!bookmark.shortUrl}
                  >
                    <Link size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>短链</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* ========== 3. 统计卡片 ========== */}
          <div className="grid grid-cols-3 gap-2">
            {/* 累计访问 */}
            <div className="rounded-xl bg-muted/20 border border-border/40 p-3 flex flex-col items-center justify-center text-center">
              <Eye size={14} className="text-muted-foreground mb-1" />
              <span className="text-base font-bold">{bookmark.visitCount}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">累计访问</span>
            </div>

            {/* 最后访问 */}
            <div className="rounded-xl bg-muted/20 border border-border/40 p-3 flex flex-col items-center justify-center text-center">
              <Clock size={14} className="text-muted-foreground mb-1" />
              <span className="text-base font-bold truncate max-w-full">
                {formatRelativeTime(bookmark.lastVisitedAt)}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">最后访问</span>
            </div>

            {/* 链接状态 */}
            <div className="rounded-xl bg-muted/20 border border-border/40 p-3 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className={cn('inline-block w-2 h-2 rounded-full', getStatusColor(bookmark.linkStatus))}
                />
                <span className="text-base font-bold">{getStatusLabel(bookmark.linkStatus)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">链接状态</span>
            </div>
          </div>

          {/* ========== 4. 标签区 ========== */}
          {bookmark.tags.length > 0 && (
            <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {bookmark.tags.map((tag) => {
                  const isAiTag = bookmark.aiTags.includes(tag) && bookmark.tagSource !== 'manual'
                  return (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs border border-solid border-border bg-muted/40 group cursor-pointer hover:bg-muted/60"
                      onClick={() => setSelectedTag(tag)}
                    >
                      <span className="text-xs text-muted-foreground">#</span>
                      {tag}
                      {isAiTag && (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="text-[10px] cursor-default">🤖</span>
                          </TooltipTrigger>
                          <TooltipContent>AI 推荐</TooltipContent>
                        </Tooltip>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveTag(tag)
                        }}
                        className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  )
                })}

                {/* 新增标签按钮 */}
                {showNewTagInput ? (
                  <Input
                    ref={newTagInputRef}
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag()
                      if (e.key === 'Escape') {
                        setShowNewTagInput(false)
                        setNewTagValue('')
                      }
                    }}
                    onBlur={handleAddTag}
                    placeholder="标签名"
                    className="w-24 h-7 text-xs px-2 py-0"
                  />
                ) : null}
                {!showNewTagInput && (
                  <button
                    onClick={() => setShowNewTagInput(true)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/50"
                  >
                    <Plus size={12} />
                    新增标签
                  </button>
                )}
              </div>

              {/* 推荐标签 */}
              {recommendedTags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/60">推荐：</span>
                  {recommendedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!bookmark) return
                        updateBookmark(bookmark.id, {
                          tags: [...bookmark.tags, tag],
                          tagSource: 'mixed',
                        })
                      }}
                      className="inline-flex items-center rounded-md px-2 py-1 text-xs border border-dashed border-muted-foreground/30 text-muted-foreground/60 bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/50 cursor-pointer"
                    >
                      <span className="text-[10px] mr-0.5">#</span>
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 无标签时的空状态标签区 */}
          {bookmark.tags.length === 0 && (
            <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {showNewTagInput ? (
                  <Input
                    ref={newTagInputRef}
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTag()
                      if (e.key === 'Escape') {
                        setShowNewTagInput(false)
                        setNewTagValue('')
                      }
                    }}
                    onBlur={handleAddTag}
                    placeholder="标签名"
                    className="w-24 h-7 text-xs px-2 py-0"
                  />
                ) : null}
                {!showNewTagInput && (
                  <button
                    onClick={() => setShowNewTagInput(true)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/50"
                  >
                    <Plus size={12} />
                    新增标签
                  </button>
                )}
              </div>
              {recommendedTags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground/60">推荐：</span>
                  {recommendedTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!bookmark) return
                        updateBookmark(bookmark.id, {
                          tags: [...bookmark.tags, tag],
                          tagSource: 'mixed',
                        })
                      }}
                      className="inline-flex items-center rounded-md px-2 py-1 text-xs border border-dashed border-muted-foreground/30 text-muted-foreground/60 bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/50 cursor-pointer"
                    >
                      <span className="text-[10px] mr-0.5">#</span>
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== 5. 描述区 ========== */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
            {editingDescription ? (
              <Textarea
                ref={descriptionTextareaRef}
                value={editingDescriptionValue}
                onChange={(e) => setEditingDescriptionValue(e.target.value)}
                onBlur={handleSaveDescription}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingDescription(false)
                    setEditingDescriptionValue('')
                  }
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveDescription()
                  }
                }}
                placeholder="添加描述..."
                className="min-h-[60px] text-sm resize-none"
              />
            ) : bookmark.description ? (
              <div
                onClick={() => {
                  setEditingDescription(true)
                  setEditingDescriptionValue(bookmark.description)
                }}
                className="text-sm leading-relaxed cursor-text"
              >
                {bookmark.description}
              </div>
            ) : bookmark.contentPreview ? (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Badge variant="outline" className="text-[10px] py-0 h-5">
                    🤖 AI 摘要
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground italic">{bookmark.contentPreview}</p>
              </div>
            ) : (
              <p
                onClick={() => {
                  setEditingDescription(true)
                  setEditingDescriptionValue('')
                }}
                className="text-sm text-muted-foreground/50 cursor-text"
              >
                点击添加描述...
              </p>
            )}
          </div>

          {/* ========== 6. 笔记区 ========== */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">笔记</span>
            </div>

            {bookmark.notes.length > 0 ? (
              <div className="space-y-0">
                {bookmark.notes.map((note, idx) => {
                  const isLast = idx === bookmark.notes.length - 1
                  return (
                    <div key={note.id} className="relative flex gap-3">
                      {/* 时间线 */}
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40 mt-1.5 flex-shrink-0" />
                        {!isLast && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      {/* 内容卡片 */}
                      <div className={cn('flex-1 pb-3', isLast ? '' : '')}>
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          {note.isAiGenerated && (
                            <span className="text-[10px] text-muted-foreground/60 mb-1 block">
                              🤖 AI 生成
                            </span>
                          )}
                          <p className="text-sm">{note.content}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                            {new Date(note.createdAt).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic mb-3">暂无笔记</p>
            )}

            {/* 笔记输入框 */}
            <div className="flex items-center gap-2">
              <Input
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
                placeholder="添加一条笔记... Enter 发送"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* ========== 7. 详细信息 ========== */}
          <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground">创建时间</span>
                <p className="text-sm">
                  {new Date(bookmark.createdAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">更新时间</span>
                <p className="text-sm">
                  {new Date(bookmark.updatedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">文件夹</span>
                <p className="text-sm">{bookmark.folderPath || '/'}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">原始 URL</span>
                <p
                  className="text-sm truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(bookmark.url)
                    addToast('URL 已复制', 'success')
                  }}
                  title="点击复制"
                >
                  {bookmark.url}
                </p>
              </div>
            </div>
          </div>

          {/* ========== 8. 相关书签推荐 ========== */}
          {relatedBookmarks.length > 0 && (
            <div className="rounded-xl bg-muted/20 border border-border/40 p-3">
              <span className="text-xs font-medium text-muted-foreground block mb-2">
                相关书签
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {relatedBookmarks.map((rb) => {
                  const rbDomain = getDomain(rb.url)
                  const rbFavicon = rb.favicon
                    ? rb.favicon
                    : `https://www.google.com/s2/favicons?domain=${rbDomain}&sz=32`
                  return (
                    <button
                      key={rb.id}
                      onClick={() => selectBookmark(rb.id)}
                      className="bg-muted/30 rounded-lg p-2.5 min-w-[130px] hover:bg-muted/50 cursor-pointer flex-shrink-0 text-left"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <img
                          src={rbFavicon}
                          alt=""
                          className="w-4 h-4 rounded-sm"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        <span className="text-xs text-muted-foreground truncate">{rbDomain}</span>
                      </div>
                      <p className="text-sm font-medium truncate mb-1.5">{rb.title}</p>
                      {rb.tags.length > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
                          {rb.tags[0]}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ========== 9. 底部操作按钮 ========== */}
          <div className="flex gap-2 justify-end pt-1 pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAddDialog(bookmark)}
              className="h-8 text-xs gap-1.5"
            >
              <Pencil size={13} />
              编辑书签
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={13} />
              删除
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* ========== 删除确认对话框 ========== */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{bookmark.title}" 吗？删除后可前往回收站恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  )
}

export default BookmarkDetailPanel
