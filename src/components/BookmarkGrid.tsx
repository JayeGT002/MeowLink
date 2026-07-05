'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import {
  ArrowUpDown,
  Check,
  FileQuestion,
  Plus,
  SearchX,
  Trash2,
  Filter,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Bookmark, Folder, SortMode } from '@/lib/types'
import { useDebounce } from '@/hooks/useDebounce'
import { storage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import BookmarkList from '@/components/BookmarkList'
import BookmarkDetailPanel from '@/components/BookmarkDetailPanel'
import SearchBar from '@/components/SearchBar'

// ============================================================
// 辅助函数
// ============================================================

/** 递归获取某文件夹及其所有子孙文件夹的 ID 列表 */
function getChildFolderIds(folderId: string, folders: Folder[]): string[] {
  const ids: string[] = [folderId]
  const queue = [folderId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const f of folders) {
      if (f.parentId === current) {
        ids.push(f.id)
        queue.push(f.id)
      }
    }
  }
  return ids
}

/** 排序标签映射 */
const SORT_LABELS: Record<SortMode, string> = {
  recent: '最近添加',
  name: '名称 A-Z',
  oldest: '最早添加',
}

/** 排序选项列表 */
const SORT_OPTIONS: SortMode[] = ['recent', 'name', 'oldest']

// ============================================================
// 组件
// ============================================================

export default function BookmarkGrid() {
  const {
    bookmarks,
    folders,
    searchQuery,
    selectedFolderId,
    selectedTag,
    sortMode,
    setSortMode,
    setSelectedFolderId,
    setSelectedTag,
    setSearchQuery,
    openAddDialog,
    sidebarOpen,
    selectedBookmarkId,
  } = useStore()

  const debouncedSearch = useDebounce(searchQuery, 300)
  const isTrashView = selectedFolderId === 'folder-trash'
  const [deletedBookmarks, setDeletedBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    if (isTrashView) {
      storage.getDeletedBookmarks().then(setDeletedBookmarks)
    }
  }, [isTrashView, bookmarks])

  // ---------- 筛选逻辑 ----------
  const filteredBookmarks = useMemo(() => {
    if (isTrashView) {
      let result: Bookmark[] = [...deletedBookmarks]
      if (debouncedSearch.trim()) {
        const query = debouncedSearch.trim().toLowerCase()
        result = result.filter(
          (b) =>
            b.title.toLowerCase().includes(query) ||
            b.url.toLowerCase().includes(query) ||
            b.description.toLowerCase().includes(query) ||
            b.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }
      switch (sortMode) {
        case 'name':
          result.sort((a, b) => a.title.localeCompare(b.title))
          break
        case 'oldest':
          result.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
          break
        case 'recent':
        default:
          result.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          break
      }
      return result
    }

    let result: Bookmark[] = [...bookmarks]

    // 优先使用 MiniSearch 进行全文检索
    if (debouncedSearch.trim()) {
      const matchedIds = storage.search(debouncedSearch.trim())
      if (matchedIds.length > 0) {
        const idSet = new Set(matchedIds)
        result = result.filter((b) => idSet.has(b.id))
      } else {
        // MiniSearch 无结果时回退到子串匹配
        const query = debouncedSearch.trim().toLowerCase()
        result = result.filter(
          (b) =>
            b.title.toLowerCase().includes(query) ||
            b.url.toLowerCase().includes(query) ||
            b.description.toLowerCase().includes(query) ||
            b.tags.some((tag) => tag.toLowerCase().includes(query))
        )
      }
    }

    if (selectedFolderId === 'folder-favorites') {
      result = result.filter((b) => b.isFavorite)
    } else if (selectedFolderId) {
      const folderIds = getChildFolderIds(selectedFolderId, folders)
      result = result.filter((b) => folderIds.includes(b.folderId))
    }

    if (selectedTag) {
      result = result.filter((b) => b.tags.includes(selectedTag))
    }

    switch (sortMode) {
      case 'name':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'oldest':
        result.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        break
      case 'recent':
      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        break
    }

    return result
  }, [bookmarks, deletedBookmarks, selectedFolderId, selectedTag, debouncedSearch, sortMode, folders, isTrashView])

  // ---------- 事件处理 ----------
  const handleClearFilters = useCallback(() => {
    setSelectedFolderId(null)
    setSelectedTag(null)
    setSearchQuery('')
  }, [setSelectedFolderId, setSelectedTag, setSearchQuery])

  // ============================================================
  // 渲染
  // ============================================================

  const hasActiveFilter =
    selectedFolderId !== null ||
    selectedTag !== null ||
    debouncedSearch.trim() !== ''

  const isEmpty = filteredBookmarks.length === 0

  return (
    <div className="flex flex-col h-full relative">
      {/* ========== 内容区 + 详情面板（横向布局） ========== */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：书签列表（自适应剩余宽度） */}
        <div className="flex-1 min-w-0 overflow-auto pr-1 md:pr-4 lg:pr-6 pb-16 md:pb-0">
          {/* 工具栏：搜索框靠左 + 添加/排序图标按钮靠右 */}
          <div className="flex items-center gap-2 px-1 mb-3">
            {/* 搜索框 — 靠左，自动填充剩余宽度 */}
            <SearchBar className="flex-1" />

            {/* 桌面端右侧按钮组 */}
            <div className="hidden sm:flex items-center gap-1 shrink-0">
              {isTrashView ? (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Trash2 className="h-4 w-4" />
                  <span className="font-medium">回收站</span>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => openAddDialog()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>添加书签 (Cmd+D)</TooltipContent>
                </Tooltip>
              )}

              {/* 排序 */}
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => setSortMode(option)}
                      className="flex items-center justify-between"
                    >
                      <span>{SORT_LABELS[option]}</span>
                      {sortMode === option && (
                        <Check className="w-4 h-4 ml-2" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 清除筛选 */}
              {hasActiveFilter && !isTrashView && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={handleClearFilters}
                >
                  清除筛选
                </Button>
              )}
            </div>

            {/* 移动端排序 + 筛选按钮 */}
            <div className="flex sm:hidden items-center gap-1 shrink-0">
              {isTrashView ? (
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" />
                  回收站
                </span>
              ) : (
                <>
                  {/* 移动端排序 */}
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      {SORT_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option}
                          onClick={() => setSortMode(option)}
                          className="flex items-center justify-between"
                        >
                          <span>{SORT_LABELS[option]}</span>
                          {sortMode === option && (
                            <Check className="w-4 h-4 ml-2" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* 移动端清除筛选 */}
                  {hasActiveFilter && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={handleClearFilters}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              {isTrashView ? (
                <>
                  <Trash2 className="w-16 h-16 text-muted-foreground/20 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">
                    回收站为空
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    被删除的书签将会显示在这里
                  </p>
                </>
              ) : debouncedSearch.trim() ? (
                <SearchX className="w-16 h-16 text-muted-foreground/20 mb-4" />
              ) : (
                <FileQuestion className="w-16 h-16 text-muted-foreground/20 mb-4" />
              )}

              {!isTrashView && debouncedSearch.trim() ? (
                <>
                  <p className="text-lg font-medium text-muted-foreground">
                    没有找到匹配「{debouncedSearch}」的书签
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    请尝试更换搜索关键词
                  </p>
                </>
              ) : !isTrashView && (
                <>
                  <p className="text-lg font-medium text-muted-foreground">
                    这里还没有书签
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    尝试调整筛选条件或添加新的书签
                  </p>
                </>
              )}

              {hasActiveFilter && !isTrashView && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleClearFilters}
                >
                  清除筛选条件
                </Button>
              )}
            </div>
          ) : (
            <BookmarkList
              bookmarks={filteredBookmarks}
              isTrashView={isTrashView}
            />
          )}
        </div>

        {/* 右侧：书签详情面板 */}
        <BookmarkDetailPanel />
      </div>

      {/* ============================================================
          移动端浮动添加按钮（FAB）— sm 以下可见
          侧边栏或详情面板打开时隐藏
          ============================================================ */}
      {!isTrashView && !sidebarOpen && !selectedBookmarkId && (
        <Button
          variant="default"
          size="icon"
          className="sm:hidden fixed bottom-6 right-4 z-30 h-12 w-12 rounded-2xl shadow-float"
          onClick={() => openAddDialog()}
        >
          <Plus className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
