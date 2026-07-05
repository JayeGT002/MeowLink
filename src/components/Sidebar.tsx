import { useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useStorageQuota } from '@/hooks/useStorageQuota'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Settings } from 'lucide-react'
import FolderTree from './FolderTree'
import ThemeToggle from './ThemeToggle'

interface SidebarProps {
  onOpenSettings?: () => void
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const { tags, selectedTag, setSelectedTag } = useStore()
  const { usedFormatted, quotaFormatted, percentage, supported } = useStorageQuota()

  const handleTagClick = useCallback(
    (tagName: string) => setSelectedTag(selectedTag === tagName ? null : tagName),
    [selectedTag, setSelectedTag]
  )

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* 文件夹树 */}
      <ScrollArea className="flex-1 px-3 pt-3">
        <FolderTree />
      </ScrollArea>

      {/* 底部用户 + 存储卡片 */}
      <div className="px-3 py-3 shrink-0">
        <div className="rounded-xl bg-sidebar-accent/40 border border-sidebar-border/50 p-3 space-y-3">
          {/* 用户行 */}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
                ME
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">MeowLink User</p>
              <p className="text-[10px] text-muted-foreground truncate">本地用户</p>
            </div>
            <ThemeToggle />
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-sidebar-foreground"
                onClick={onOpenSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* 存储条 */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              {supported ? (
                <span>{usedFormatted} / {quotaFormatted}</span>
              ) : (
                <span>存储信息不可用</span>
              )}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden bg-sidebar-border">
              <div
                className="h-full rounded-full bg-sidebar-primary/40 transition-all"
                style={{ width: `${supported ? percentage : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
