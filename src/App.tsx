import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@/lib/store'
import Layout from '@/components/Layout'
import BookmarkGrid from '@/components/BookmarkGrid'
import { AddBookmarkDialog } from '@/components/AddBookmarkDialog'
import SettingsDialog from '@/components/SettingsDialog'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================
// App - 应用根组件
// 组合 Layout + 主内容区 + 全局弹窗/抽屉
// 初始化 IndexedDB 数据，加载中显示 Skeleton 占位
// ============================================================
export default function App() {
  const initialize = useStore((s) => s.initialize)
  const isLoading = useStore((s) => s.isLoading)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 应用挂载时从 IndexedDB 异步加载数据
  useEffect(() => {
    initialize()
  }, [initialize])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  // 数据加载中显示骨架屏
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex">
        {/* 桌面端侧边栏骨架 — 移动端隐藏 */}
        <div className="hidden lg:flex w-[260px] h-full border-r p-4 space-y-3 shrink-0">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
          <div className="pt-3">
            <Skeleton className="h-3 w-16 mb-2" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-14 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-10 rounded-md" />
            </div>
          </div>
        </div>

        {/* 主内容区骨架 — 移动端全宽 */}
        <div className="flex-1 p-3 pt-14 md:p-6 lg:p-8 space-y-4">
          <Skeleton className="h-9 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[16/10] rounded-2xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-5 w-12 rounded-md" />
                  <Skeleton className="h-5 w-10 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout onOpenSettings={handleOpenSettings}>
      {/* 主内容区：书签网格/列表 */}
      <BookmarkGrid />

      {/* 全局弹窗：添加/编辑书签 */}
      <AddBookmarkDialog />

      {/* 全局弹窗：设置 */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Layout>
  )
}
