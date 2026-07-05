import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Search, X, Clock, Hash } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchHistory } from '@/hooks/useSearchHistory'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
}

export default function SearchBar({ className }: SearchBarProps) {
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const bookmarks = useStore((s) => s.bookmarks)
  const tags = useStore((s) => s.tags)
  const setSelectedTag = useStore((s) => s.setSelectedTag)
  const selectedTag = useStore((s) => s.selectedTag)

  const { history, addToHistory, removeFromHistory } = useSearchHistory()

  const [value, setValue] = useState(searchQuery)
  const [isOpen, setIsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const debouncedQuery = useDebounce(value, 200)

  // 检测是否正在输入 # 标签搜索
  const isTagSearch = value.includes('#')
  const hashQuery = useMemo(() => {
    if (!isTagSearch) return ''
    const hashIndex = value.lastIndexOf('#')
    return value.slice(hashIndex + 1).toLowerCase()
  }, [value, isTagSearch])

  // 标签补全建议
  const tagSuggestions = useMemo(() => {
    if (!isTagSearch || !hashQuery) return []
    return tags
      .filter((t) => t.name.toLowerCase().includes(hashQuery))
      .slice(0, 8)
  }, [isTagSearch, hashQuery, tags])

  // 收集全部标签名用于过滤
  const allTagNames = useMemo(() => tags.map((t) => t.name), [tags])

  // 活跃标签 Token（搜索框中的标签过滤条件）
  const activeTags = useMemo(() => {
    if (!isTagSearch) return []
    const tagRegex = /#(\S+)/g
    const result: string[] = []
    let match: RegExpExecArray | null
    while ((match = tagRegex.exec(value)) !== null) {
      const tagName = match[1]
      if (allTagNames.includes(tagName)) {
        result.push(tagName)
      }
    }
    return result
  }, [value, isTagSearch, allTagNames])

  useEffect(() => {
    setValue(searchQuery)
  }, [searchQuery])

  // 当选中标签时，更新搜索框
  useEffect(() => {
    if (selectedTag && !value.includes(`#${selectedTag}`)) {
      const tagPart = value.includes('#') ? '' : ' '
      setValue((prev) => prev + (prev.endsWith(' ') ? '' : ' ') + `#${selectedTag}`)
      setSearchQuery(selectedTag)
    }
  }, [selectedTag, setSearchQuery])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setExpanded(false)
        inputRef.current?.blur()
      }
      if (e.key === 'Enter') {
        addToHistory(value)
        setIsOpen(false)
        // 如果有活跃标签，触发过滤
        if (activeTags.length > 0) {
          setSelectedTag(activeTags[0])
        }
      }
    },
    [value, addToHistory, activeTags, setSelectedTag]
  )

  const matchingCount = (() => {
    if (!debouncedQuery.trim()) return null
    const q = debouncedQuery.toLowerCase()
    // 移除 #tag 前缀后搜索
    const searchText = q.replace(/#\S+/g, '').trim()
    if (!searchText) {
      // 纯标签搜索，返回包含所有标签的书签数量
      const searchTags = activeTags.length > 0 ? activeTags : []
      if (searchTags.length === 0) return null
      return bookmarks.filter((b) =>
        searchTags.every((t) => b.tags.includes(t))
      ).length
    }
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(searchText) ||
        b.description.toLowerCase().includes(searchText) ||
        b.tags.some((t) => t.toLowerCase().includes(searchText)) ||
        b.url.toLowerCase().includes(searchText)
    ).length
  })()

  const handleClear = () => {
    setValue('')
    setSearchQuery('')
    inputRef.current?.focus()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    setSearchQuery(newValue)
  }

  const handleHistoryClick = (item: string) => {
    setValue(item)
    setSearchQuery(item)
    setIsOpen(false)
  }

  const handleTagClick = (tagName: string) => {
    setSelectedTag(tagName)
    // 如果正在输入 #，自动补全
    if (isTagSearch) {
      const beforeHash = value.slice(0, value.lastIndexOf('#'))
      setValue(beforeHash + '#' + tagName + ' ')
      setSearchQuery(tagName)
    }
    setIsOpen(false)
  }

  const handleTagSuggestionClick = (tagName: string) => {
    const beforeHash = value.slice(0, value.lastIndexOf('#'))
    const newValue = beforeHash + '#' + tagName + ' '
    setValue(newValue)
    setSearchQuery(tagName)
  }

  // 移除活跃标签 Token
  const handleRemoveActiveTag = (tagName: string) => {
    const newValue = value.replace(new RegExp(`#${tagName}\\s?`, 'g'), '').trim()
    setValue(newValue)
    setSearchQuery(newValue)
    if (selectedTag === tagName) {
      setSelectedTag(null)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {!expanded && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={() => {
            setExpanded(true)
            setTimeout(() => inputRef.current?.focus(), 100)
          }}
        >
          <Search className="h-4 w-4" />
        </Button>
      )}

      <div className={cn(
        expanded ? 'flex' : 'hidden md:flex',
        'relative w-full'
      )}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="搜索书签、标签或描述... 输入 # 搜索标签"
          className={cn(
            'flex h-9 w-full rounded-xl border border-border/40 bg-muted/20 pl-10 pr-4 text-sm',
            'placeholder:text-muted-foreground/60',
            'focus-visible:outline-none focus-visible:border-foreground/30 focus-visible:bg-muted'
          )}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border/40 bg-popover shadow-float p-3">
          {value.trim() && (
            <div className="text-xs text-muted-foreground mb-2 px-2">
              {matchingCount !== null && matchingCount > 0
                ? `找到 ${matchingCount} 个匹配书签`
                : debouncedQuery.trim()
                  ? '未找到匹配结果'
                  : null}
            </div>
          )}

          {/* 活跃标签 Token */}
          {activeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-2">
              <span className="text-xs text-muted-foreground">当前过滤：</span>
              {activeTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary text-xs px-2 py-0.5"
                >
                  #{t}
                  <button
                    onClick={() => handleRemoveActiveTag(t)}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* # 标签补全下拉 */}
          {isTagSearch && tagSuggestions.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                <Hash className="h-3 w-3 inline mr-1" />标签补全
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {tagSuggestions.map((tag) => (
                  <button
                    key={tag.id}
                    className={cn(
                      'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors',
                      'border border-border/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => handleTagSuggestionClick(tag.name)}
                  >
                    # {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 搜索历史 */}
          {!value.trim() && history.length > 0 && (
            <>
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                最近搜索
              </div>
              <div className="space-y-0.5 mb-3">
                {history.map((item) => (
                  <div key={item} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/30 transition-colors group/hist">
                    <button
                      className="flex flex-1 items-center gap-2 min-w-0"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{item}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromHistory(item)
                      }}
                      className="shrink-0 opacity-0 group-hover/hist:opacity-100 rounded-full p-0.5 hover:bg-muted transition-all"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 标签筛选（原来的彩色标签按钮改为淡色） */}
          {!isTagSearch && (
            <>
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                标签筛选
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    className={cn(
                      'inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-medium transition-colors',
                      'border border-border/40 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                    )}
                    onClick={() => handleTagClick(tag.name)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
