// ============================================================
// Zustand Store — 全局状态管理
// 数据从 IndexedDB 异步加载，视图状态使用 persist 持久化到 localStorage
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, Bookmark, ViewMode, ThemeMode, SortMode, ToastMessage } from './types'
import { storage } from './storage'

let toastCounter = 0

export const useStore = create<AppState>()(
  persist(
    (set, _get) => ({
      // ---------- 视图状态（持久化到 localStorage） ----------
      viewMode: 'list' as ViewMode,
      theme: 'light' as ThemeMode,
      sidebarOpen: true,
      sidebarCollapsed: false,

      // ---------- 筛选状态 ----------
      searchQuery: '',
      selectedFolderId: null as string | null,
      selectedTag: null as string | null,
      sortMode: 'recent' as SortMode,

      // ---------- 数据（从 IndexedDB 加载） ----------
      bookmarks: [] as Bookmark[],
      folders: [] as any[],
      tags: [] as any[],

      // ---------- 加载状态 ----------
      isLoading: true,

      // ---------- 弹窗状态 ----------
      isAddDialogOpen: false,
      editBookmark: null as Bookmark | null,
      isQuickAdd: false,

      // ---------- 详情面板 ----------
      selectedBookmarkId: null as string | null,
      isDetailEditing: false,

      // ---------- Toast 通知 ----------
      toasts: [] as ToastMessage[],

      // ---------- 设置 ----------
      autoTagEnabled: true,

      // ---------- 初始化 ----------
      initialize: async () => {
        try {
          const data = await storage.initialize()
          let defaultFolder = null as string | null
          let viewMode: ViewMode = 'list'
          let autoTagEnabled = true
          try {
            const raw = localStorage.getItem('meowlink-settings')
            if (raw) {
              const settings = JSON.parse(raw)
              if (settings.defaultFolder && settings.defaultFolder !== 'folder-root') {
                defaultFolder = settings.defaultFolder
              }
              if (settings.defaultView === 'card' || settings.defaultView === 'list') {
                viewMode = settings.defaultView
              }
              if (typeof settings.autoTagEnabled === 'boolean') {
                autoTagEnabled = settings.autoTagEnabled
              }
            }
          } catch {}
          set({
            bookmarks: data.bookmarks,
            folders: data.folders,
            tags: data.tags,
            isLoading: false,
            selectedFolderId: defaultFolder,
            viewMode,
            autoTagEnabled,
          })
        } catch (error) {
          console.error('数据库初始化失败:', error)
          set({ isLoading: false })
        }
      },

      // ---------- 视图操作 ----------
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
      setTheme: (theme: ThemeMode) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      setSelectedFolderId: (id: string | null) =>
        set({ selectedFolderId: id, selectedTag: null }),
      setSelectedTag: (tag: string | null) =>
        set({ selectedTag: tag, selectedFolderId: null }),
      setSortMode: (mode: SortMode) => set({ sortMode: mode }),

      // ---------- 书签操作 ----------
      addBookmark: async (data) => {
        const fullData = { ...data }
        const newBookmark = await storage.addBookmark(fullData)
        set((s) => ({ bookmarks: [newBookmark, ...s.bookmarks] }))
      },

      updateBookmark: async (id, updates) => {
        await storage.updateBookmark(id, updates)
        set((s) => ({
          bookmarks: s.bookmarks.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
          ),
        }))
      },

      deleteBookmark: async (id) => {
        await storage.deleteBookmark(id)
        set((s) => ({
          bookmarks: s.bookmarks.filter((b) => b.id !== id),
          selectedBookmarkId: s.selectedBookmarkId === id ? null : s.selectedBookmarkId,
        }))
      },

      restoreBookmark: async (id) => {
        const restored = await storage.restoreBookmark(id)
        if (restored) {
          set((s) => ({
            bookmarks: [restored, ...s.bookmarks],
          }))
        }
      },

      permanentlyDeleteBookmark: async (id) => {
        await storage.permanentlyDeleteBookmark(id)
        set((s) => ({
          bookmarks: s.bookmarks.filter((b) => b.id !== id),
          selectedBookmarkId: s.selectedBookmarkId === id ? null : s.selectedBookmarkId,
        }))
      },

      toggleFavorite: async (id) => {
        await storage.toggleFavorite(id)
        set((s) => ({
          bookmarks: s.bookmarks.map((b) =>
            b.id === id ? { ...b, isFavorite: !b.isFavorite } : b
          ),
        }))
      },

      // ---------- 弹窗操作 ----------
      openAddDialog: (bookmark?: Bookmark | null, quickAdd?: boolean) => {
        set({ isAddDialogOpen: true, editBookmark: bookmark ?? null, isQuickAdd: !!quickAdd })
      },
      closeAddDialog: () => set({ isAddDialogOpen: false, editBookmark: null, isQuickAdd: false }),

      // ---------- Toast 操作 ----------
      addToast: (message: string, type: 'info' | 'success' | 'error' = 'success') => {
        const id = `toast-${++toastCounter}-${Date.now()}`
        set((s) => ({
          toasts: [...s.toasts, { id, message, type }],
        }))
        // 3 秒后自动移除
        setTimeout(() => {
          set((s) => ({
            toasts: s.toasts.filter((t) => t.id !== id),
          }))
        }, 3000)
      },

      removeToast: (id: string) => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }))
      },

      // ---------- 文件夹操作 ----------
      addFolder: async (name, parentId = null) => {
        await storage.addFolder(name, parentId)
        const folders = await storage.getFolders()
        set({ folders })
      },

      renameFolder: async (id, name) => {
        await storage.updateFolder(id, { name })
        const folders = await storage.getFolders()
        set({ folders })
      },

      deleteFolder: async (id) => {
        await storage.deleteFolder(id)
        const folders = await storage.getFolders()
        set((s) => ({
          folders,
          bookmarks: s.bookmarks.map((b) =>
            b.folderId === id ? { ...b, folderId: 'folder-unsorted' } : b
          ),
        }))
      },

      updateFolderIcon: async (id, icon) => {
        await storage.updateFolder(id, { icon })
        const folders = await storage.getFolders()
        set({ folders })
      },

      pinFolder: async (id) => {
        await storage.updateFolder(id, { pinned: true })
        const folders = await storage.getFolders()
        set({ folders })
      },

      unpinFolder: async (id) => {
        await storage.updateFolder(id, { pinned: false })
        const folders = await storage.getFolders()
        set({ folders })
      },

      // ---------- 详情面板操作 ----------
      selectBookmark: (id) => set({ selectedBookmarkId: id, isDetailEditing: false }),
      startDetailEditing: () => set({ isDetailEditing: true }),
      stopDetailEditing: () => set({ isDetailEditing: false }),

      // ---------- 设置操作 ----------
      setAutoTagEnabled: (enabled: boolean) => {
        set({ autoTagEnabled: enabled })
        // 持久化到 localStorage
        try {
          const raw = localStorage.getItem('meowlink-settings')
          const settings = raw ? JSON.parse(raw) : {}
          settings.autoTagEnabled = enabled
          localStorage.setItem('meowlink-settings', JSON.stringify(settings))
        } catch {}
      },
    }),
    {
      name: 'meowlink-storage',
      partialize: (state) => ({
        viewMode: state.viewMode,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        // autoTagEnabled 不在 persist partialize 里，改为手动持久化
      }),
    }
  )
)
