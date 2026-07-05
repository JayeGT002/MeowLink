// ============================================================
// StorageAdapter — 统一的 IndexedDB 数据访问层
// 封装所有 CRUD、搜索、导入/导出、种子数据逻辑
// ============================================================

import MiniSearch, { type SearchResult } from 'minisearch'
import db, { resetDatabase } from './db'
import type { Bookmark, Folder, Tag, ChangeRecord, TagSource } from './types'

// ============================================================
// MiniSearch 全文检索引擎（单例）
// ============================================================
let searchIndex: MiniSearch | null = null

function getSearchIndex(): MiniSearch {
  if (!searchIndex) {
    searchIndex = new MiniSearch({
      fields: ['title', 'description', 'url', 'tagsText'],
      storeFields: ['id'],
      searchOptions: {
        boost: { title: 2, tagsText: 1.5 },
        fuzzy: 0.2,
        prefix: true,
      },
    })
  }
  return searchIndex
}

async function rebuildSearchIndex(): Promise<void> {
  const mini = getSearchIndex()
  mini.removeAll()
  const all = await db.bookmarks.filter((b) => !b.isDeleted).toArray()
  const seen = new Set<string>()
  const docs = all
    .filter((b) => {
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })
    .map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      url: b.url,
      tagsText: b.tags.join(' '),
    }))
  if (docs.length > 0) {
    mini.addAll(docs)
  }
}

// ============================================================
// 变更记录辅助函数
// ============================================================
async function recordChange(
  entityType: ChangeRecord['entityType'],
  entityId: string,
  action: ChangeRecord['action'],
  payload: unknown
): Promise<void> {
  await db.changes.add({
    entityType,
    entityId,
    action,
    payload,
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as ChangeRecord)
}

// ============================================================
// 文件夹树构建
// ============================================================
function buildFolderTree(folders: Folder[]): Folder[] {
  const map = new Map<string, Folder>()
  const roots: Folder[] = []

  for (const f of folders) {
    map.set(f.id, { ...f, children: [] })
  }

  for (const f of map.values()) {
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children!.push(f)
    } else {
      roots.push(f)
    }
  }

  // 每层置顶文件夹排前面
  const sortPinned = (list: Folder[]) => {
    list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    })
    for (const f of list) {
      if (f.children && f.children.length > 0) sortPinned(f.children)
    }
  }

  sortPinned(roots)

  function clean(f: Folder): Folder {
    if (!f.children || f.children.length === 0) {
      const { children, ...rest } = f
      return rest as Folder
    }
    return { ...f, children: f.children.map(clean) }
  }

  return roots.map(clean)
}

// ============================================================
// 种子数据生成
// ============================================================

// 标签种子数据 — color 可选
const SEED_TAGS: Omit<Tag, 'id'>[] = [
  { name: 'React', color: '#3b82f6' },
  { name: '设计', color: '#8b5cf6' },
  { name: '文章', color: '#10b981' },
  { name: '工具', color: '#f59e0b' },
  { name: 'TypeScript', color: '#6366f1' },
  { name: 'CSS', color: '#ec4899' },
  { name: '教程', color: '#14b8a6' },
  { name: '资源', color: '#f97316' },
  { name: '性能', color: '#ef4444' },
  { name: '开源', color: '#06b6d4' },
  { name: '前端', color: '#3b82f6' },
  { name: '后端', color: '#10b981' },
  { name: 'Node.js', color: '#16a34a' },
  { name: 'Next.js' },
  { name: 'DevOps', color: '#f59e0b' },
  { name: '框架' },
  { name: '文档' },
  { name: '灵感', color: '#ec4899' },
  { name: '效率', color: '#f97316' },
  { name: '数据库', color: '#6366f1' },
]

// 文件夹种子数据
const SEED_FOLDERS: Omit<Folder, 'id'>[] = [
  { name: '全部书签', parentId: null, icon: 'Inbox', color: '#8b5cf6', createdAt: new Date().toISOString() },
  { name: '未分类', parentId: null, icon: 'FileQuestion', color: '#6b7280', createdAt: new Date().toISOString() },
  { name: '收藏夹', parentId: null, icon: 'Heart', color: '#ef4444', createdAt: new Date().toISOString() },
  { name: '回收站', parentId: null, icon: 'Trash2', color: '#6b7280', createdAt: new Date().toISOString() },
  { name: '开发工具', parentId: null, icon: 'Code2', color: '#3b82f6', createdAt: new Date().toISOString() },
  { name: '前端', parentId: null, icon: undefined, color: '#8b5cf6', createdAt: new Date().toISOString() },
  { name: '后端', parentId: null, icon: undefined, color: '#10b981', createdAt: new Date().toISOString() },
  { name: 'DevOps', parentId: null, icon: undefined, color: '#f59e0b', createdAt: new Date().toISOString() },
  { name: '设计灵感', parentId: null, icon: 'Palette', color: '#ec4899', createdAt: new Date().toISOString() },
  { name: '阅读清单', parentId: null, icon: 'BookOpen', color: '#14b8a6', createdAt: new Date().toISOString() },
  { name: 'AI 探索', parentId: null, icon: 'Sparkles', color: '#6366f1', createdAt: new Date().toISOString() },
]

const FOLDER_IDS = {
  root: 'folder-root',
  unsorted: 'folder-unsorted',
  favorites: 'folder-favorites',
  trash: 'folder-trash',
  dev: 'folder-dev',
  frontend: 'folder-frontend',
  backend: 'folder-backend',
  devops: 'folder-devops',
  design: 'folder-design',
  reading: 'folder-reading',
  ai: 'folder-ai',
}

function randomDate(daysBack: number): string {
  const now = new Date()
  const past = new Date(now.getTime() - Math.random() * daysBack * 24 * 60 * 60 * 1000)
  return past.toISOString()
}

function coverUrl(seed: number): string {
  return `https://picsum.photos/seed/bookmark${seed}/800/500`
}

function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return ''
  }
}

// 30 条种子书签数据（含 aiTags 和 tagSource）
type SeedBookmark = Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'syncStatus' | 'notes' | 'visitCount' | 'lastVisitedAt' | 'linkStatus' | 'history'>

const SEED_BOOKMARKS: SeedBookmark[] = [
  { url: 'https://github.com', title: 'GitHub: 全球最大的代码托管平台', description: '数百万开发者聚集的代码托管与协作平台，开源项目的发源地。', coverImage: coverUrl(1), favicon: faviconUrl('https://github.com'), tags: ['工具', '开源'], aiTags: ['开源', '工具', '代码'], tagSource: 'ai', folderId: FOLDER_IDS.dev, isFavorite: true },
  { url: 'https://react.dev', title: 'React 官方文档', description: 'React 框架最新官方文档，包含 Quick Start、API 参考和学习教程。', coverImage: coverUrl(2), favicon: faviconUrl('https://react.dev'), tags: ['React', '教程'], aiTags: ['React', '前端', '教程'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: true },
  { url: 'https://tailwindcss.com', title: 'Tailwind CSS - 实用优先的 CSS 框架', description: 'Rapidly build modern websites without ever leaving your HTML.', coverImage: coverUrl(3), favicon: faviconUrl('https://tailwindcss.com'), tags: ['CSS', '工具'], aiTags: ['CSS', '前端', '教程'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://www.figma.com', title: 'Figma: 协作式界面设计工具', description: 'The collaborative interface design tool. Design, prototype, and gather feedback in one place.', coverImage: coverUrl(4), favicon: faviconUrl('https://www.figma.com'), tags: ['设计', '工具'], aiTags: ['设计', '工具'], tagSource: 'ai', folderId: FOLDER_IDS.design, isFavorite: true },
  { url: 'https://dribbble.com', title: 'Dribbble - 全球设计师社区', description: "Discover the world's top designers & creatives.", coverImage: coverUrl(5), favicon: faviconUrl('https://dribbble.com'), tags: ['设计', '资源'], aiTags: ['设计', '灵感'], tagSource: 'ai', folderId: FOLDER_IDS.design, isFavorite: false },
  { url: 'https://vercel.com', title: 'Vercel: 前端云平台', description: 'Develop. Preview. Ship. The platform for frontend developers.', coverImage: coverUrl(6), favicon: faviconUrl('https://vercel.com'), tags: ['工具', 'React'], aiTags: ['工具', '前端'], tagSource: 'ai', folderId: FOLDER_IDS.devops, isFavorite: false },
  { url: 'https://www.notion.so', title: 'Notion - 一体化工作空间', description: "A new tool that blends your everyday work apps into one. It's the all-in-one workspace for you and your team.", coverImage: coverUrl(7), favicon: faviconUrl('https://www.notion.so'), tags: ['工具', '文章'], aiTags: ['工具', '效率'], tagSource: 'ai', folderId: FOLDER_IDS.root, isFavorite: true },
  { url: 'https://linear.app', title: 'Linear - 现代化项目管理工具', description: 'Linear is a better way to build software. Streamline issues, sprints, and product roadmaps.', coverImage: coverUrl(8), favicon: faviconUrl('https://linear.app'), tags: ['工具', '开源'], aiTags: ['工具', '项目管理'], tagSource: 'ai', folderId: FOLDER_IDS.dev, isFavorite: false },
  { url: 'https://www.framer.com', title: 'Framer: 无需代码的网站设计工具', description: 'Design and publish modern websites. The internet is your canvas.', coverImage: coverUrl(9), favicon: faviconUrl('https://www.framer.com'), tags: ['设计', '工具'], aiTags: ['设计', '工具'], tagSource: 'ai', folderId: FOLDER_IDS.design, isFavorite: false },
  { url: 'https://ui.shadcn.com', title: 'shadcn/ui - 可复用组件集合', description: 'Beautifully designed components that you can copy and paste into your apps.', coverImage: coverUrl(10), favicon: faviconUrl('https://ui.shadcn.com'), tags: ['React', '开源', 'CSS'], aiTags: ['React', '开源', 'UI'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: true },
  { url: 'https://www.typescriptlang.org', title: 'TypeScript 官方文档', description: 'TypeScript is a strongly typed programming language that builds on JavaScript.', coverImage: coverUrl(11), favicon: faviconUrl('https://www.typescriptlang.org'), tags: ['TypeScript', '教程'], aiTags: ['TypeScript', '教程'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://nextjs.org', title: 'Next.js by Vercel - React 全栈框架', description: 'The React Framework for the Web.', coverImage: coverUrl(12), favicon: faviconUrl('https://nextjs.org'), tags: ['React', 'TypeScript'], aiTags: ['React', 'Next.js', '前端'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: true },
  { url: 'https://nodejs.org', title: 'Node.js - JavaScript 运行时', description: 'Node.js is an open-source, cross-platform JavaScript runtime environment.', coverImage: coverUrl(13), favicon: faviconUrl('https://nodejs.org'), tags: ['开源', '工具'], aiTags: ['Node.js', '后端'], tagSource: 'ai', folderId: FOLDER_IDS.backend, isFavorite: false },
  { url: 'https://www.docker.com', title: 'Docker: 容器化平台', description: 'Docker helps developers build, share, run, and verify applications anywhere.', coverImage: coverUrl(14), favicon: faviconUrl('https://www.docker.com'), tags: ['工具', '教程'], aiTags: ['DevOps', '工具', '教程'], tagSource: 'ai', folderId: FOLDER_IDS.devops, isFavorite: false },
  { url: 'https://www.prisma.io', title: 'Prisma - 下一代 Node.js ORM', description: 'Prisma unlocks a new level of developer experience when working with databases.', coverImage: coverUrl(15), favicon: faviconUrl('https://www.prisma.io'), tags: ['TypeScript', '工具'], aiTags: ['TypeScript', '数据库', 'ORM'], tagSource: 'ai', folderId: FOLDER_IDS.backend, isFavorite: false },
  { url: 'https://vitest.dev', title: 'Vitest - 极速单元测试框架', description: 'A blazing fast unit test framework powered by Vite.', coverImage: coverUrl(16), favicon: faviconUrl('https://vitest.dev'), tags: ['工具', '开源'], aiTags: ['工具', '测试'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://zustand-demo.pmnd.rs', title: 'Zustand - 轻量级 React 状态管理', description: 'A small, fast and scalable bearbones state-management solution using simplified flux principles.', coverImage: coverUrl(17), favicon: faviconUrl('https://zustand-demo.pmnd.rs'), tags: ['React', '开源'], aiTags: ['React', '状态管理'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://tanstack.com/query', title: 'TanStack Query - 服务端状态管理', description: 'Powerful asynchronous state management for TS/JS, React, Solid, Vue and Svelte.', coverImage: coverUrl(18), favicon: faviconUrl('https://tanstack.com/query'), tags: ['React', 'TypeScript'], aiTags: ['React', 'TypeScript', '状态管理'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://developer.mozilla.org', title: 'MDN Web Docs - 前端开发者的百科全书', description: 'The MDN Web Docs site provides information about Open Web technologies.', coverImage: coverUrl(19), favicon: faviconUrl('https://developer.mozilla.org'), tags: ['教程', 'CSS', '文章'], aiTags: ['教程', '前端', '文档'], tagSource: 'ai', folderId: FOLDER_IDS.root, isFavorite: true },
  { url: 'https://css-tricks.com', title: 'CSS-Tricks - CSS 技巧与教程', description: 'Daily articles about CSS, HTML, JavaScript, and all things related to web design and development.', coverImage: coverUrl(20), favicon: faviconUrl('https://css-tricks.com'), tags: ['CSS', '教程', '文章'], aiTags: ['CSS', '教程'], tagSource: 'ai', folderId: FOLDER_IDS.reading, isFavorite: false },
  { url: 'https://raycast.com', title: 'Raycast - 效率启动器', description: "Raycast lets you control your tools with a few keystrokes. It's designed to keep you focused.", coverImage: coverUrl(21), favicon: faviconUrl('https://raycast.com'), tags: ['工具', '性能'], aiTags: ['工具', '效率'], tagSource: 'ai', folderId: FOLDER_IDS.dev, isFavorite: false },
  { url: 'https://www.radix-ui.com', title: 'Radix UI - 无样式无障碍组件库', description: 'An open source component library optimized for fast development, easy maintenance, and accessibility.', coverImage: coverUrl(22), favicon: faviconUrl('https://www.radix-ui.com'), tags: ['React', '开源', 'CSS'], aiTags: ['React', '开源', 'UI'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://supabase.com', title: 'Supabase - 开源 Firebase 替代方案', description: 'The open source Firebase alternative. Start your project with a Postgres database.', coverImage: coverUrl(23), favicon: faviconUrl('https://supabase.com'), tags: ['工具', '开源', 'TypeScript'], aiTags: ['工具', '开源', '数据库'], tagSource: 'ai', folderId: FOLDER_IDS.backend, isFavorite: true },
  { url: 'https://bun.sh', title: 'Bun - 快速 JavaScript 运行时', description: 'Develop, test, run, and bundle JavaScript & TypeScript projects—all with Bun.', coverImage: coverUrl(24), favicon: faviconUrl('https://bun.sh'), tags: ['工具', 'TypeScript', '性能'], aiTags: ['工具', '运行时'], tagSource: 'ai', folderId: FOLDER_IDS.dev, isFavorite: false },
  { url: 'https://vitejs.dev', title: 'Vite - 下一代前端构建工具', description: 'Next Generation Frontend Tooling.', coverImage: coverUrl(25), favicon: faviconUrl('https://vitejs.dev'), tags: ['工具', 'TypeScript', '性能'], aiTags: ['前端', '工具', '构建'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://astro.build', title: 'Astro - 内容驱动网站框架', description: 'The web framework for content-driven websites.', coverImage: coverUrl(26), favicon: faviconUrl('https://astro.build'), tags: ['工具', '性能'], aiTags: ['前端', '框架', 'SSG'], tagSource: 'ai', folderId: FOLDER_IDS.frontend, isFavorite: false },
  { url: 'https://www.joshwcomeau.com', title: 'Josh Comeau - CSS 与 React 深度教程', description: 'Teaching CSS, React, and web development through interactive articles and courses.', coverImage: coverUrl(27), favicon: faviconUrl('https://www.joshwcomeau.com'), tags: ['CSS', 'React', '教程'], aiTags: ['CSS', 'React', '教程'], tagSource: 'ai', folderId: FOLDER_IDS.reading, isFavorite: true },
  { url: 'https://behance.net', title: 'Behance - 创意作品展示平台', description: "Showcase and discover creative work on the world's leading creative network.", coverImage: coverUrl(28), favicon: faviconUrl('https://behance.net'), tags: ['设计', '资源'], aiTags: ['设计', '作品'], tagSource: 'ai', folderId: FOLDER_IDS.design, isFavorite: false },
  { url: 'https://caniuse.com', title: 'Can I Use - 浏览器兼容性查询', description: 'Browser support tables for modern web technologies.', coverImage: coverUrl(29), favicon: faviconUrl('https://caniuse.com'), tags: ['CSS', '工具'], aiTags: ['CSS', '工具', '参考'], tagSource: 'ai', folderId: FOLDER_IDS.dev, isFavorite: false },
  { url: 'https://stackoverflow.com', title: 'Stack Overflow - 开发者问答社区', description: 'The largest, most trusted online community for developers to learn, share their knowledge.', coverImage: coverUrl(30), favicon: faviconUrl('https://stackoverflow.com'), tags: ['工具', '教程', '文章'], aiTags: ['教程', '问答'], tagSource: 'ai', folderId: FOLDER_IDS.dev, isFavorite: false },
]

// ============================================================
// StorageAdapter — 对外暴露的接口
// ============================================================

export const storage = {
  async initialize(): Promise<{ bookmarks: Bookmark[]; folders: Folder[]; tags: Tag[] }> {
    try {
      const bookmarkCount = await db.bookmarks.count()
      if (bookmarkCount === 0) {
        await this.seedData()
      }
      await rebuildSearchIndex()
      return this.loadAll()
    } catch (err) {
      // 初始化失败，删除损坏的数据库后重建
      console.warn('数据库初始化失败，删除重建:', err)
      await resetDatabase()
      // 重新打开数据库（Dexie.delete 关闭了连接，open 重新打开）
      await db.open()
      await this.seedData()
      await rebuildSearchIndex()
      return this.loadAll()
    }
  },

  async seedData(): Promise<void> {
    let folderEntries: Folder[] = []
    let tagEntries: Tag[] = []
    let bookmarkEntries: Bookmark[] = []
    try {
    const folderIdMap: Record<string, string> = {
      root: FOLDER_IDS.root,
      unsorted: FOLDER_IDS.unsorted,
      favorites: FOLDER_IDS.favorites,
      trash: FOLDER_IDS.trash,
      dev: FOLDER_IDS.dev,
      frontend: FOLDER_IDS.frontend,
      backend: FOLDER_IDS.backend,
      devops: FOLDER_IDS.devops,
      design: FOLDER_IDS.design,
      reading: FOLDER_IDS.reading,
      ai: FOLDER_IDS.ai,
    }

    folderEntries = []
    const keyList: (keyof typeof FOLDER_IDS)[] = ['root', 'unsorted', 'favorites', 'trash', 'dev', 'frontend', 'backend', 'devops', 'design', 'reading', 'ai']
    for (let i = 0; i < SEED_FOLDERS.length; i++) {
      const key = keyList[i]
      folderEntries.push({
        ...SEED_FOLDERS[i],
        id: folderIdMap[key],
      } as Folder)
    }
    // 使用 put 而非 add，避免 v3→v4 升级后的 Key 冲突
    for (const f of folderEntries) {
      await db.folders.put(f)
    }

    tagEntries = SEED_TAGS.map((t, i) => ({
      ...t,
      id: `tag-${i + 1}`,
    }))
    for (const t of tagEntries) {
      await db.tags.put(t)
    }

    const linkStatuses: Array<'ok' | 'broken' | 'redirect'> = ['ok', 'ok', 'ok', 'redirect', 'ok']
    const historyActions = ['添加此书签', '编辑标签', '查看详情', '更新描述', '添加笔记']
    bookmarkEntries = SEED_BOOKMARKS.map((b, i) => ({
      ...b,
      id: `bm-${i + 1}`,
      createdAt: randomDate(365),
      updatedAt: randomDate(30),
      isDeleted: false,
      notes: i < 8 ? '' : '这是 Demo User 的笔记记录。快速切换选中书签以查看不同状态。',
      visitCount: Math.floor(Math.random() * 50) + 1,
      lastVisitedAt: randomDate(7),
      linkStatus: linkStatuses[i % linkStatuses.length],
      history: Array.from({ length: 2 + (i % 3) }, (_, j) => ({
        date: randomDate(60 + j * 15),
        action: historyActions[(i + j) % historyActions.length],
      })).sort((a, b) => b.date.localeCompare(a.date)),
      syncStatus: 'local' as const,
    }))
    for (const b of bookmarkEntries) {
      await db.bookmarks.put(b)
    }
    } catch (err: any) {
      console.error('seedData 添加失败:', err?.name, err?.message, err)
      // 逐条重试
      await Promise.all(db.tables.map((t) => t.clear()))
      // 重新逐条添加
      for (const f of folderEntries) {
        await db.folders.put(f)
      }
      for (const t of tagEntries) {
        await db.tags.put(t)
      }
      for (const b of bookmarkEntries) {
        await db.bookmarks.put(b)
      }
    }
  },

  async loadAll(): Promise<{ bookmarks: Bookmark[]; folders: Folder[]; tags: Tag[] }> {
    const [rawBookmarks, rawFolders, rawTags] = await Promise.all([
      db.bookmarks.filter((b) => !b.isDeleted).toArray(),
      db.folders.toArray(),
      db.tags.toArray(),
    ])
    const folders = buildFolderTree(rawFolders)
    return { bookmarks: rawBookmarks, folders, tags: rawTags }
  },

  async getBookmarks(folderId?: string | null, tag?: string | null, query?: string): Promise<Bookmark[]> {
    let results = await db.bookmarks.filter((b) => !b.isDeleted).toArray()

    if (query && query.trim()) {
      const mini = getSearchIndex()
      const searchResults: SearchResult[] = mini.search(query.trim(), {
        fuzzy: 0.2,
        prefix: true,
      })
      const matchedIds = new Set(searchResults.map((r) => r.id))
      results = results.filter((b) => matchedIds.has(b.id))

      if (results.length === 0) {
        const q = query.trim().toLowerCase()
        results = (await db.bookmarks.filter((b) => !b.isDeleted).toArray()).filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q) ||
            b.tags.some((t) => t.toLowerCase().includes(q))
        )
      }
    }

    if (folderId === 'folder-favorites') {
      results = results.filter((b) => b.isFavorite)
    } else if (folderId) {
      const allFolders = await db.folders.toArray()
      const childIds = getChildFolderIds(folderId, allFolders)
      results = results.filter((b) => childIds.includes(b.folderId))
    }

    if (tag) {
      results = results.filter((b) => b.tags.includes(tag))
    }

    return results
  },

  async addBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'syncStatus' | 'notes' | 'visitCount' | 'lastVisitedAt' | 'linkStatus' | 'history'>): Promise<Bookmark> {
    const now = new Date().toISOString()
    const bookmark: Bookmark = {
      ...data,
      id: `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      notes: '',
      visitCount: 1,
      lastVisitedAt: now,
      linkStatus: 'ok',
      history: [{ date: now, action: '添加此书签' }],
      syncStatus: 'local',
    }
    await db.bookmarks.add(bookmark)
    await recordChange('bookmark', bookmark.id, 'create', bookmark)
    const mini = getSearchIndex()
    mini.add({ id: bookmark.id, title: bookmark.title, description: bookmark.description, url: bookmark.url, tagsText: bookmark.tags.join(' ') })
    return bookmark
  },

  async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<void> {
    const existing = await db.bookmarks.get(id)
    if (!existing) return
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    await db.bookmarks.put(merged)
    await recordChange('bookmark', id, 'update', updates)

    const mini = getSearchIndex()
    mini.remove({ id })
    mini.add({ id, title: merged.title, description: merged.description, url: merged.url, tagsText: merged.tags.join(' ') })
  },

  async deleteBookmark(id: string): Promise<void> {
    const existing = await db.bookmarks.get(id)
    if (!existing) return
    await db.bookmarks.update(id, { isDeleted: true, updatedAt: new Date().toISOString() })
    await recordChange('bookmark', id, 'delete', { id })
    const mini = getSearchIndex()
    mini.remove({ id })
  },

  async restoreBookmark(id: string): Promise<Bookmark | null> {
    const existing = await db.bookmarks.get(id)
    if (!existing) return null
    const updated = { ...existing, isDeleted: false, updatedAt: new Date().toISOString() }
    await db.bookmarks.put(updated)
    await recordChange('bookmark', id, 'update', { isDeleted: false })
    const mini = getSearchIndex()
    mini.add({ id: updated.id, title: updated.title, description: updated.description, url: updated.url, tagsText: updated.tags.join(' ') })
    return updated
  },

  async permanentlyDeleteBookmark(id: string): Promise<void> {
    const existing = await db.bookmarks.get(id)
    if (!existing) return
    await db.bookmarks.delete(id)
    await recordChange('bookmark', id, 'delete_permanent', { id })
  },

  async getDeletedBookmarks(): Promise<Bookmark[]> {
    return db.bookmarks.filter((b) => b.isDeleted === true).toArray()
  },

  async toggleFavorite(id: string): Promise<void> {
    const existing = await db.bookmarks.get(id)
    if (!existing) return
    await db.bookmarks.update(id, { isFavorite: !existing.isFavorite, updatedAt: new Date().toISOString() })
    await recordChange('bookmark', id, 'update', { isFavorite: !existing.isFavorite })
  },

  async getFolders(): Promise<Folder[]> {
    const raw = await db.folders.toArray()
    return buildFolderTree(raw)
  },

  async addFolder(name: string, parentId: string | null = null): Promise<Folder> {
    const folder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      parentId,
      createdAt: new Date().toISOString(),
    }
    await db.folders.add(folder)
    await recordChange('folder', folder.id, 'create', folder)
    return folder
  },

  async updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
    const existing = await db.folders.get(id)
    if (!existing) return
    await db.folders.put({ ...existing, ...updates })
    await recordChange('folder', id, 'update', updates)
  },

  async deleteFolder(id: string): Promise<void> {
    await db.folders.delete(id)
    await recordChange('folder', id, 'delete', { id })
  },

  async getTags(): Promise<Tag[]> {
    return db.tags.toArray()
  },

  async addTag(name: string, color?: string): Promise<Tag> {
    const tag: Tag = { id: `tag-${Date.now()}`, name, color }
    await db.tags.add(tag)
    await recordChange('tag', tag.id, 'create', tag)
    return tag
  },

  async deleteTag(id: string): Promise<void> {
    await db.tags.delete(id)
    await recordChange('tag', id, 'delete', { id })
  },

  async refreshSearchIndex(): Promise<void> {
    await rebuildSearchIndex()
  },

  async clearAllAndReSeed(): Promise<void> {
    await db.bookmarks.clear()
    await db.folders.clear()
    await db.tags.clear()
    await db.changes.clear()
    await this.seedData()
    await rebuildSearchIndex()
  },

  search(query: string): string[] {
    if (!query.trim()) return []
    const mini = getSearchIndex()
    const results = mini.search(query.trim(), {
      fuzzy: 0.2,
      prefix: true,
    })
    return results.map((r) => r.id)
  },
}

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
