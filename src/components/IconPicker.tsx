'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ALL_ICONS, FOLDER_ICONS, getIconComponent, type IconDef } from '@/lib/folder-icons'
import { Folder } from 'lucide-react'

interface IconPickerProps {
  currentIcon?: string
  onSelect: (iconName: string) => void
  children?: React.ReactNode
}

export default function IconPicker({ currentIcon, onSelect, children }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
    if (!open) {
      setSearch('')
    }
  }, [open])

  // 搜索过滤
  const filteredIcons = useMemo(() => {
    if (!search.trim()) return null // null = 显示分类视图
    const q = search.toLowerCase()
    return ALL_ICONS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q)
    )
  }, [search])

  const handleSelect = useCallback(
    (iconName: string) => {
      onSelect(iconName)
      setOpen(false)
    },
    [onSelect]
  )

  // 当前图标的预览
  const CurrentIconComp = currentIcon ? getIconComponent(currentIcon) : null

  const trigger = children || (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
      {CurrentIconComp ? (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <div className="w-4 h-4 text-current">
          {(CurrentIconComp as any)({ theme: 'outline', size: 16, fill: 'currentColor' })}
        </div>
      ) : (
        <Folder className="h-4 w-4" />
      )}
    </Button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] max-w-[calc(100vw-2rem)] p-0" align="start" side="auto">
        {/* 搜索框 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索图标…"
            className="border-0 bg-transparent h-7 text-sm px-0 focus-visible:outline-none focus-visible:border-foreground/30 placeholder:text-muted-foreground/50"
          />
        </div>

        <ScrollArea className="h-[320px]">
          <div className="p-2">
            {filteredIcons !== null ? (
              // ====== 搜索结果 ======
              filteredIcons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">无匹配图标</p>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {filteredIcons.map((icon) => (
                    <IconButton
                      key={icon.name}
                      icon={icon}
                      isSelected={currentIcon === icon.name}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )
            ) : (
              // ====== 分类视图 ======
              <div className="flex flex-col gap-3">
                {FOLDER_ICONS.map((cat) => (
                  <div key={cat.category}>
                    <p className="text-[10px] font-medium text-muted-foreground px-1 mb-1.5 uppercase tracking-wider">
                      {cat.category}
                    </p>
                    <div className="grid grid-cols-7 gap-1">
                      {cat.icons.map((icon) => (
                        <IconButton
                          key={icon.name}
                          icon={icon}
                          isSelected={currentIcon === icon.name}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// IconButton 小图标按钮 — 纯灰度选中态
// ============================================================
function IconButton({
  icon,
  isSelected,
  onSelect,
}: {
  icon: IconDef
  isSelected: boolean
  onSelect: (name: string) => void
}) {
  const IconComp = icon.component

  return (
    <button
      type="button"
      title={icon.label}
      className={cn(
        'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
        isSelected
          ? 'bg-muted/50 text-foreground ring-1 ring-border/40'
          : 'text-foreground/60 hover:bg-muted/30 hover:text-foreground'
      )}
      onClick={() => onSelect(icon.name)}
    >
      <IconComp theme="outline" size={16} fill="currentColor" />
    </button>
  )
}
