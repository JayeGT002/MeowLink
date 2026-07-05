import { useCallback, useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Star,
  FileQuestion,
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Trash2,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Bookmark } from '@/lib/types'

// ============================================================
// BookmarkList - 书签列表组件
// ============================================================
interface BookmarkListProps {
  bookmarks: Bookmark[]
  isTrashView?: boolean
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

// ============================================================
// 回收站行操作（恢复 + 彻底删除）
// ============================================================
function TrashRowActions({ bookmark }: { bookmark: Bookmark }) {
  const { restoreBookmark, permanentlyDeleteBookmark } = useStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleRestore = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      restoreBookmark(bookmark.id)
    },
    [bookmark.id, restoreBookmark]
  )

  const handlePermanentDeleteConfirm = useCallback(() => {
    permanentlyDeleteBookmark(bookmark.id)
    setDeleteDialogOpen(false)
  }, [bookmark.id, permanentlyDeleteBookmark])

  return (
    <>
      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRestore}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>恢复</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>彻底删除</TooltipContent>
        </Tooltip>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                彻底删除
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要彻底删除「{bookmark.title}」吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              彻底删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// ============================================================
// 操作按钮组（收藏 + 外链 + 复制 + 编辑 + 删除）
// ============================================================
function RowActions({ bookmark }: { bookmark: Bookmark }) {
  const { toggleFavorite, deleteBookmark: removeBookmark, openAddDialog } = useStore()
  const [copied, setCopied] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      navigator.clipboard.writeText(bookmark.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    },
    [bookmark.url]
  )

  const handleFavoriteToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      toggleFavorite(bookmark.id)
    },
    [bookmark.id, toggleFavorite]
  )

  const handleOpenExternal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.open(bookmark.url, '_blank', 'noopener,noreferrer')
    },
    [bookmark.url]
  )

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      openAddDialog(bookmark)
    },
    [bookmark, openAddDialog]
  )

  const handleDeleteConfirm = useCallback(() => {
    removeBookmark(bookmark.id)
    setDeleteDialogOpen(false)
  }, [bookmark.id, removeBookmark])

  return (
    <>
      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* 收藏 */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', bookmark.isFavorite && 'text-amber-500')}
              onClick={handleFavoriteToggle}
            >
              <Star className="w-4 h-4" fill={bookmark.isFavorite ? 'currentColor' : 'none'} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{bookmark.isFavorite ? '取消收藏' : '收藏'}</TooltipContent>
        </Tooltip>

        {/* 外链 */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleOpenExternal}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新标签页打开</TooltipContent>
        </Tooltip>

        {/* 复制 */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>复制链接</TooltipContent>
        </Tooltip>

        {/* 编辑 */}
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>编辑</TooltipContent>
        </Tooltip>

        {/* 删除 */}
        <Tooltip>
          <TooltipTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>删除</TooltipContent>
        </Tooltip>
      </div>

      {/* 删除确认弹窗 */}
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
    </>
  )
}

// ============================================================
// BookmarkList 主组件
// ============================================================
export default function BookmarkList({ bookmarks, isTrashView }: BookmarkListProps) {
  const { selectedBookmarkId, selectBookmark, folders } = useStore()

  const folderNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of folders) {
      map.set(f.id, f.name)
    }
    return map
  }, [folders])

  function formatDeleteTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMinutes < 1) return '刚刚'
    if (diffMinutes < 60) return `${diffMinutes} 分钟前`
    if (diffHours < 24) return `${diffHours} 小时前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-CN')
  }

  const handleClick = useCallback(
    (bookmark: Bookmark) => {
      if (isTrashView) return
      if (selectedBookmarkId === bookmark.id) {
        selectBookmark(null)
      } else {
        selectBookmark(bookmark.id)
      }
    },
    [selectedBookmarkId, selectBookmark, isTrashView]
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent, bookmark: Bookmark) => {
      e.stopPropagation()
      if (!isTrashView) {
        window.open(bookmark.url, '_blank', 'noopener,noreferrer')
      }
    },
    [isTrashView]
  )

  return (
    <div className="space-y-0.5">
      {bookmarks.map((bookmark) => {
        const domain = getDomain(bookmark.url)
        const visibleTags = bookmark.tags.slice(0, 2)
        const isSelected = selectedBookmarkId === bookmark.id
        const folderName = folderNameMap.get(bookmark.folderId) || '未分类'

        return (
          <motion.div
            key={bookmark.id}
            layout
            layoutId={bookmark.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            onClick={() => handleClick(bookmark)}
            onDoubleClick={(e) => handleDoubleClick(e, bookmark)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group select-none',
              isSelected
                ? 'bg-accent'
                : 'hover:bg-accent/50'
            )}
          >
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="w-5 h-5 rounded flex-shrink-0"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="w-5 h-5 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                <FileQuestion className="w-3 h-3 text-muted-foreground/50" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{bookmark.title}</p>
              {isTrashView ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="truncate">{folderName}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="flex-shrink-0">删除于 {formatDeleteTime(bookmark.updatedAt)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="truncate">{domain}</span>
                  {visibleTags.length > 0 && (
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {visibleTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 h-4 leading-none"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {bookmark.tags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{bookmark.tags.length - 2}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            {isTrashView ? (
              <TrashRowActions bookmark={bookmark} />
            ) : (
              <RowActions bookmark={bookmark} />
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
