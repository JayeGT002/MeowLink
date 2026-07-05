import { useCallback } from 'react'
import { useStore } from '@/lib/store'
import { useStorageQuota } from '@/hooks/useStorageQuota'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Settings, PanelLeftClose } from 'lucide-react'
import { cn } from '@/lib/utils'
import FolderTree from './FolderTree'
import ThemeToggle from './ThemeToggle'

interface SidebarProps {
  onOpenSettings?: () => void
}

export default function Sidebar({ onOpenSettings }: SidebarProps) {
  const { tags, selectedTag, setSelectedTag, toggleSidebar } = useStore()
  const { usedFormatted, quotaFormatted, percentage, supported } = useStorageQuota()

  const handleTagClick = useCallback(
    (tagName: string) => setSelectedTag(selectedTag === tagName ? null : tagName),
    [selectedTag, setSelectedTag]
  )

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center">
            <span className="text-[10px] font-bold text-sidebar-primary-foreground">M</span>
          </div>
          <span className="text-sm font-bold text-sidebar-foreground">喵链 MeowLink</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {onOpenSettings && (
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-sidebar-foreground"
                  onClick={onOpenSettings}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-sidebar-foreground"
                onClick={toggleSidebar}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>收起侧边栏</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* 文件夹树 */}
      <ScrollArea className="flex-1 px-2">
        <FolderTree />
      </ScrollArea>

      {/* 底部 */}
      <div className="px-4 py-3 border-t border-sidebar-border space-y-3 shrink-0">
        {/* 用户信息 */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-sidebar-primary text-sidebar-primary-foreground">
              ME
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">MeowLink User</p>
            <p className="text-[10px] text-muted-foreground truncate">本地用户</p>
          </div>
        </div>

        {/* 存储 */}
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            {supported ? (
              <span>{usedFormatted} / {quotaFormatted}</span>
            ) : (
              <span>存储信息不可用</span>
            )}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-sidebar-border">
            <div
              className="h-full rounded-full bg-foreground/20 transition-all"
              style={{ width: `${supported ? percentage : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
