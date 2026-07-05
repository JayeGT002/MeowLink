import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import Sidebar from '@/components/Sidebar'
import { PanelLeftOpen, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

// ============================================================
// Layout - 主布局容器（默认导出）
// 桌面端：左侧固定侧边栏（260px，可折叠）
// 移动端：侧边栏变为全屏滑出抽屉，通过 hamburger 按钮开关
// ============================================================
interface LayoutProps {
  children: React.ReactNode
  onOpenSettings?: () => void
}

export default function Layout({ children, onOpenSettings }: LayoutProps) {
  const sidebarCollapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const selectBookmark = useStore((s) => s.selectBookmark)
  const selectedBookmarkId = useStore((s) => s.selectedBookmarkId)
  const deleteBookmark = useStore((s) => s.deleteBookmark)
  const bookmarks = useStore((s) => s.bookmarks)
  const toasts = useStore((s) => s.toasts)
  const removeToast = useStore((s) => s.removeToast)

  // 移动端抽屉状态
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // 同步移动端抽屉状态到 store，供其他组件（如 FAB）判断
  useEffect(() => {
    useStore.setState({ sidebarOpen: mobileDrawerOpen })
  }, [mobileDrawerOpen])

  // 选择书签时自动关闭移动端抽屉（跳转到详情面板）
  useEffect(() => {
    if (selectedBookmarkId) {
      setMobileDrawerOpen(false)
    }
  }, [selectedBookmarkId])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="搜索"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
          searchInput.select()
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (selectedBookmarkId) {
          const bookmark = bookmarks.find((b) => b.id === selectedBookmarkId)
          if (bookmark) {
            e.preventDefault()
            window.open(bookmark.url, '_blank', 'noopener,noreferrer')
            return
          }
        }
      }

      if (e.key === 'Delete' && !isInput) {
        if (selectedBookmarkId) {
          e.preventDefault()
          deleteBookmark(selectedBookmarkId)
          return
        }
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        if (selectedBookmarkId) {
          e.preventDefault()
          const store = useStore.getState()
          store.selectBookmark(selectedBookmarkId)
          setTimeout(() => store.startDetailEditing(), 100)
          return
        }
      }

      if (e.key === 'Escape' && !isInput) {
        if (selectedBookmarkId) {
          selectBookmark(null)
          return
        }
        // 在移动端，Escape 也关闭抽屉
        if (mobileDrawerOpen) {
          setMobileDrawerOpen(false)
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar, selectedBookmarkId, selectBookmark, deleteBookmark, bookmarks, mobileDrawerOpen])

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0 relative">

        {/* ============================================================
            桌面端侧边栏（lg+ 可见）
            ============================================================ */}
        <aside
          className="hidden lg:block transition-all duration-300 overflow-hidden shrink-0"
          style={{ width: sidebarCollapsed ? 0 : 260 }}
        >
          <div className="w-[260px] h-full">
            <Sidebar onOpenSettings={onOpenSettings} />
          </div>
        </aside>

        {/* ============================================================
            桌面端侧边栏展开按钮（侧边栏折叠时显示）
            ============================================================ */}
        {sidebarCollapsed && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex absolute top-3 left-0 h-8 w-8 z-10 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm rounded-r-lg rounded-l-none pl-1"
                onClick={toggleSidebar}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>展开侧边栏</TooltipContent>
          </Tooltip>
        )}

        {/* ============================================================
            移动端 Hamburger 按钮（lg 以下显示，始终在左上角）
            ============================================================ */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden absolute top-3 left-3 h-9 w-9 z-20 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm rounded-xl"
          onClick={() => setMobileDrawerOpen(true)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* ============================================================
            移动端抽屉遮罩 + 侧边栏
            ============================================================ */}
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              {/* 半透明遮罩 */}
              <motion.div
                className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileDrawerOpen(false)}
              />

              {/* 侧边栏抽屉 — 从左侧滑入 */}
              <motion.aside
                className="lg:hidden fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] bg-background shadow-overlay"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <Sidebar onOpenSettings={onOpenSettings} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ============================================================
            主内容区 — 响应式 padding
            ============================================================ */}
        <main className="flex-1 min-w-0 p-3 pt-14 md:p-6 md:pt-6 lg:p-8 overflow-hidden">
          {children}
        </main>
      </div>

      {/* ============================================================
          全局 Toast 通知
          ============================================================ */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm',
                'border border-border/40',
                toast.type === 'success' && 'bg-background text-foreground',
                toast.type === 'error' && 'bg-destructive/10 text-destructive border-destructive/30',
                toast.type === 'info' && 'bg-background text-foreground',
              )}
            >
              <span className="max-w-xs truncate">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-full p-0.5 hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
