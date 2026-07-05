// ============================================================
// 书签管理器全局类型定义
// ============================================================

export interface BookmarkHistory {
  date: string
  action: string
}

export type LinkStatus = 'ok' | 'broken' | 'redirect'

/** 标签来源类型：AI 生成 / 手动 / 混合 */
export type TagSource = 'ai' | 'manual' | 'mixed'

export interface Bookmark {
  id: string
  url: string
  title: string
  description: string
  coverImage: string
  favicon: string
  tags: string[]
  /** AI 原始标签（用户可修正后写入 tags） */
  aiTags: string[]
  /** 标签来源标识 */
  tagSource: TagSource
  folderId: string
  isFavorite: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  notes: string
  visitCount: number
  lastVisitedAt: string
  linkStatus: LinkStatus
  history: BookmarkHistory[]
  syncStatus: SyncStatus
}

export interface Folder {
  id: string
  name: string
  parentId: string | null
  icon?: string
  color?: string
  children?: Folder[]
  pinned?: boolean
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  /** 颜色变为可选 — AI 标签模式下不再强制彩色 */
  color?: string
  /** 是否为 AI 生成的标签 */
  isAiGenerated?: boolean
}

export interface ChangeRecord {
  id: number
  entityType: 'bookmark' | 'folder' | 'tag'
  entityId: string
  action: 'create' | 'update' | 'delete' | 'delete_permanent'
  payload: unknown
  status: 'pending' | 'synced' | 'failed'
  createdAt: string
}

export type SyncStatus = 'local' | 'synced' | 'modified'
export type ViewMode = 'grid' | 'list'
export type ThemeMode = 'light' | 'dark' | 'system'
export type SortMode = 'recent' | 'name' | 'oldest'

/** 全局 Toast 类型 */
export interface ToastMessage {
  id: string
  message: string
  type: 'info' | 'success' | 'error'
}

export interface AppState {
  // 视图状态
  viewMode: ViewMode
  theme: ThemeMode
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // 筛选状态
  searchQuery: string
  selectedFolderId: string | null
  selectedTag: string | null
  sortMode: SortMode

  // 数据
  bookmarks: Bookmark[]
  folders: Folder[]
  tags: Tag[]

  // 加载状态
  isLoading: boolean

  // 弹窗状态
  isAddDialogOpen: boolean
  editBookmark: Bookmark | null
  /** 是否为快速添加模式（Cmd+D），此模式下隐藏标签输入 */
  isQuickAdd: boolean

  // 详情面板状态
  selectedBookmarkId: string | null
  isDetailEditing: boolean

  // Toast 通知
  toasts: ToastMessage[]

  // 设置
  /** 自动标签开关（默认开启） */
  autoTagEnabled: boolean

  // 操作
  initialize: () => Promise<void>
  setViewMode: (mode: ViewMode) => void
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
  setSelectedFolderId: (id: string | null) => void
  setSelectedTag: (tag: string | null) => void
  setSortMode: (mode: SortMode) => void

  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'syncStatus' | 'notes' | 'visitCount' | 'lastVisitedAt' | 'linkStatus' | 'history'>) => void
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void
  deleteBookmark: (id: string) => void
  restoreBookmark: (id: string) => Promise<void>
  permanentlyDeleteBookmark: (id: string) => Promise<void>
  toggleFavorite: (id: string) => void

  // 弹窗操作
  openAddDialog: (bookmark?: Bookmark | null, quickAdd?: boolean) => void
  closeAddDialog: () => void

  // Toast 操作
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void
  removeToast: (id: string) => void

  // 文件夹操作
  addFolder: (name: string, parentId?: string | null) => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  updateFolderIcon: (id: string, icon: string) => void
  pinFolder: (id: string) => Promise<void>
  unpinFolder: (id: string) => Promise<void>

  // 详情面板操作
  selectBookmark: (id: string | null) => void
  startDetailEditing: () => void
  stopDetailEditing: () => void

  // 设置操作
  setAutoTagEnabled: (enabled: boolean) => void
}
