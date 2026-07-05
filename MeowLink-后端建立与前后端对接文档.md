# MeowLink 后端建立与前后端对接文档

> 目标：基于现有前端代码，建立 TypeScript 后端服务并完成前后端对接，实现网页端 + 桌面端通过 Token + 后端地址同步数据。
>
> 日期：2026-07-06 | 前端版本：v0.1.0 | 文档用途：直接交付 Agent 执行

---

## 目录

1. [设置功能完整清单](#1-设置功能完整清单)
2. [数据库 Schema 设计](#2-数据库-schema-设计)
3. [后端项目搭建](#3-后端项目搭建)
4. [后端 API 实现](#4-后端-api-实现)
5. [前端改造](#5-前端改造)
6. [执行顺序与验证](#6-执行顺序与验证)

---

## 1. 设置功能完整清单

### 1.1 设置页导航结构

设置页由 `SettingsSidebar.tsx` 定义，共 6 个选项卡：

```
用户设置 → 通用设置 → AI设置 → 数据管理 → 同步设置 → 关于
```

路由由 `SettingsContent.tsx` 通过 `SettingsSection` 类型分发：

```typescript
// src/components/settings/SettingsContent.tsx
type SettingsSection = 'user' | 'general' | 'ai' | 'data' | 'sync' | 'about'
```

| 选项卡 | Section Key | 对应组件 | 后端相关 |
|--------|-------------|----------|---------|
| 用户设置 | `user` | `UserSettings.tsx` | **是** |
| 通用设置 | `general` | `GeneralSettings.tsx` | **是** |
| AI设置 | `ai` | `AISettings.tsx` | 部分 |
| 数据管理 | `data` | `DataSettings.tsx` | 否（纯前端导入导出） |
| 同步设置 | `sync` | `SyncSettings.tsx` | **是** |
| 关于 | `about` | `AboutSettings.tsx` | 否（纯前端信息展示） |

### 1.2 配置项完整清单（30 项）

所有配置持久化到 `localStorage`，key 为 `meowlink-settings`，由 `SettingsContext.tsx` 统一读写。

#### 1.2.1 用户设置（UserSettings.tsx）— 4 项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `avatar` | `string` | `''` | 头像，Base64 编码的 Data URL |
| `nickname` | `string` | `''` | 用户昵称 |
| `password` | `string` | `''` | 登录密码（明文存储，当前仅 UI 占位） |
| `f2aEnabled` | `boolean` | `false` | 双因素认证开关 |

#### 1.2.2 通用设置（GeneralSettings.tsx）— 7 项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `language` | `'zh-CN' \| 'en' \| 'ja'` | `'zh-CN'` | 界面语言 |
| `dateFormat` | `'zh' \| 'us' \| 'iso'` | `'zh'` | 日期格式 |
| `defaultView` | `'card' \| 'list'` | `'list'` | 默认视图模式 |
| `defaultFolder` | `string` | `'folder-root'` | 应用启动时的默认文件夹 |
| `newBookmarkFolder` | `string` | `'folder-unsorted'` | 新书签默认目标文件夹 |
| `desktopNotifications` | `boolean` | `false` | 桌面通知开关 |
| `favoriteUpdateNotify` | `boolean` | `false` | 收藏更新通知开关 |

> 注意：`GeneralSettings.tsx` 中只渲染了 language 和 theme 两组 UI。其余配置项（dateFormat、defaultView、defaultFolder、newBookmarkFolder、desktopNotifications、favoriteUpdateNotify）定义在 `SettingsContext` 的 `SettingsState` 类型中但**尚未渲染 UI**，需要补充设置页 UI 或在本次改造中一并补齐。

#### 1.2.3 主题设置（在 GeneralSettings.tsx 中渲染）— 4 项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `theme` | `'light' \| 'dark' \| 'system'` | `'light'` | 主题模式 |
| `accentColor` | `'slate' \| 'violet' \| 'indigo' \| 'blue' \| 'emerald' \| 'orange' \| 'red' \| 'pink'` | `'slate'` | 强调色 |
| `density` | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'` | 界面密度 |
| `font` | `'system' \| 'sans' \| 'mono'` | `'system'` | 字体模式 |

#### 1.2.4 AI设置（AISettings.tsx）— 6 项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `aiEnabled` | `boolean` | `false` | AI 功能总开关 |
| `aiBaseUrl` | `string` | `''` | AI API 地址，placeholder 为 `https://api.openai.com/v1` |
| `aiApiKey` | `string` | `''` | AI API Key（密码框遮蔽） |
| `aiModel` | `string` | `''` | 模型名称，placeholder 为 `gpt-4o` |
| `aiDefaultLanguage` | `'zh-CN' \| 'en' \| 'ja'` | `'zh-CN'` | AI 默认语言 |
| `aiPrompt` | `string` | `''` | 自定义 AI 提示词（textarea） |

#### 1.2.5 同步设置（SyncSettings.tsx）— 6 项

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `autoSync` | `boolean` | `true` | 自动同步开关 |
| `syncFrequency` | `'realtime' \| '15min' \| 'hourly' \| 'manual'` | `'realtime'` | 同步频率 |
| `wifiOnlySync` | `boolean` | `false` | 仅 WiFi 下同步 |
| `syncCoverImages` | `boolean` | `true` | 同步封面图 |
| `offlineAccess` | `boolean` | `true` | 离线访问开关 |
| `conflictResolution` | `'cloud' \| 'local' \| 'ask'` | `'ask'` | 冲突解决策略 |

#### 1.2.6 数据管理（DataSettings.tsx）— 纯前端功能

无后端可存储的配置项。功能包括：
- 存储空间展示（`navigator.storage.estimate()`）
- JSON / HTML 书签导入
- JSON / HTML / CSV / ENEX / Markdown 多格式导出
- 重置所有数据

#### 1.2.7 关于（AboutSettings.tsx）— 纯前端展示

无后端配置项。展示内容：应用名称、版本号（v0.1.0）、构建日期、开源协议链接、调试信息复制。

### 1.3 当前配置存储方式

`src/contexts/SettingsContext.tsx`：

```typescript
const STORAGE_KEY = 'meowlink-settings'

// 读取
const stored = localStorage.getItem(STORAGE_KEY)
settings = { ...defaultSettings, ...JSON.parse(stored) }

// 写入
localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
```

改造后需要把**每个用户的配置存储到后端**，以便多端同步设置。

### 1.4 注意事项

- `UserSettings.tsx` 和 `AISettings.tsx` 引用的配置项（`avatar`、`nickname`、`password`、`f2aEnabled`、`aiEnabled` 等**不在 `SettingsState` 类型定义中**，但通过 `updateSetting()` 的泛型调用动态写入 localStorage。这些字段需要在改造时补充到 `SettingsState` 类型中。
- `password` 字段当前以明文存储在 localStorage，改造到后端时必须改为哈希存储。
- 同步配置项中 `autoSync`、`syncFrequency`、`conflictResolution` 不需要服务端持久化，它们是客户端行为配置。

---

## 2. 数据库 Schema 设计

### 2.1 技术选型

```
后端框架：  Hono (hono.dev) — 轻量 TypeScript Web 框架
ORM：      Drizzle ORM (orm.drizzle.team) — 类型安全
数据库：   PostgreSQL 15+
认证：     JWT (jose 库) + bcrypt 密码哈希
```

### 2.2 表结构

基于前端 `src/lib/types.ts` 中的 TypeScript 类型定义。

```sql
-- ============================================================
-- 1. users — 用户表
-- ============================================================
CREATE TABLE users (
  id            TEXT PRIMARY KEY,            -- UUID v7
  email         TEXT UNIQUE NOT NULL,        -- 登录邮箱
  password_hash TEXT NOT NULL,               -- bcrypt 哈希
  nickname      TEXT NOT NULL DEFAULT '',    -- 昵称
  avatar_url    TEXT NOT NULL DEFAULT '',    -- 头像 URL（存到对象存储）
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- 2. folders — 文件夹表
-- ============================================================
CREATE TABLE folders (
  id         TEXT PRIMARY KEY,               -- 前端生成的 folder-xxx ID
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES folders(id) ON DELETE SET NULL,
  icon       TEXT,                           -- Lucide 图标名
  color      TEXT,                           -- hex 颜色
  pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- ============================================================
-- 3. tags — 标签表
-- ============================================================
CREATE TABLE tags (
  id         TEXT PRIMARY KEY,               -- 前端生成的 tag-xxx ID
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, name);

-- ============================================================
-- 4. bookmarks — 书签表
-- ============================================================
CREATE TABLE bookmarks (
  id               TEXT PRIMARY KEY,          -- 前端生成的 bm-xxx ID
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  title            TEXT NOT NULL DEFAULT '',
  description      TEXT NOT NULL DEFAULT '',
  cover_image      TEXT NOT NULL DEFAULT '',  -- 封面图 URL
  favicon          TEXT NOT NULL DEFAULT '',  -- 网站图标 URL
  folder_id        TEXT REFERENCES folders(id) ON DELETE SET NULL,
  is_favorite      BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived      BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted       BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at       TIMESTAMPTZ,              -- 软删除时间
  original_folder_id TEXT,                   -- 删除前所属文件夹（恢复用）
  visit_count      INTEGER NOT NULL DEFAULT 0,
  last_visited_at  TIMESTAMPTZ,
  link_status      TEXT NOT NULL DEFAULT 'ok' CHECK (link_status IN ('ok', 'broken', 'redirect')),
  content_preview  TEXT NOT NULL DEFAULT '',
  short_url        TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  server_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- 服务端最后修改时间（同步用）
);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_folder_id ON bookmarks(folder_id);
CREATE INDEX idx_bookmarks_is_deleted ON bookmarks(user_id, is_deleted);
CREATE INDEX idx_bookmarks_updated_at ON bookmarks(user_id, updated_at);

-- ============================================================
-- 5. bookmark_tags — 书签-标签关联表
-- ============================================================
CREATE TABLE bookmark_tags (
  bookmark_id  TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  tag_id       TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  source       TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('ai', 'manual', 'mixed')),
  PRIMARY KEY (bookmark_id, tag_id)
);

-- ============================================================
-- 6. notes — 笔记表
-- ============================================================
CREATE TABLE notes (
  id          TEXT PRIMARY KEY,              -- note-xxx
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notes_bookmark_id ON notes(bookmark_id);

-- ============================================================
-- 7. history — 操作历史表
-- ============================================================
CREATE TABLE history (
  id          BIGSERIAL PRIMARY KEY,
  bookmark_id TEXT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_history_bookmark_id ON history(bookmark_id);

-- ============================================================
-- 8. user_settings — 用户设置表（云端同步用）
-- ============================================================
CREATE TABLE user_settings (
  user_id  TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',      -- 完整设置 JSON
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.3 Drizzle Schema 定义

后端项目中的 Drizzle schema 文件（`server/src/db/schema.ts`）应完全对应以上 SQL：

```typescript
import { pgTable, text, boolean, integer, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'

// ---------- users ----------
export const users = pgTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  nickname:     text('nickname').notNull().default(''),
  avatarUrl:    text('avatar_url').notNull().default(''),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('idx_users_email').on(table.email),
}))

// ---------- folders ----------
export const folders = pgTable('folders', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  parentId:  text('parent_id').references((): any => folders.id, { onDelete: 'set null' }),
  icon:      text('icon'),
  color:     text('color'),
  pinned:    boolean('pinned').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_folders_user_id').on(table.userId),
  parentIdIdx: index('idx_folders_parent_id').on(table.parentId),
}))

// ---------- tags ----------
export const tags = pgTable('tags', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:      text('name').notNull(),
  color:     text('color'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_tags_user_id').on(table.userId),
  userNameIdx: uniqueIndex('idx_tags_user_name').on(table.userId, table.name),
}))

// ---------- bookmarks ----------
export const bookmarks = pgTable('bookmarks', {
  id:              text('id').primaryKey(),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  url:             text('url').notNull(),
  title:           text('title').notNull().default(''),
  description:     text('description').notNull().default(''),
  coverImage:      text('cover_image').notNull().default(''),
  favicon:         text('favicon').notNull().default(''),
  folderId:        text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  isFavorite:      boolean('is_favorite').notNull().default(false),
  isArchived:      boolean('is_archived').notNull().default(false),
  isDeleted:       boolean('is_deleted').notNull().default(false),
  deletedAt:       timestamp('deleted_at'),
  originalFolderId: text('original_folder_id'),
  visitCount:      integer('visit_count').notNull().default(0),
  lastVisitedAt:   timestamp('last_visited_at'),
  linkStatus:      text('link_status').notNull().default('ok'),
  contentPreview:  text('content_preview').notNull().default(''),
  shortUrl:        text('short_url').notNull().default(''),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
  serverUpdatedAt: timestamp('server_updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_bookmarks_user_id').on(table.userId),
  folderIdIdx: index('idx_bookmarks_folder_id').on(table.folderId),
  deletedIdx: index('idx_bookmarks_is_deleted').on(table.userId, table.isDeleted),
  updatedIdx: index('idx_bookmarks_updated_at').on(table.userId, table.updatedAt),
}))

// ---------- bookmark_tags ----------
export const bookmarkTags = pgTable('bookmark_tags', {
  bookmarkId: text('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  tagId:      text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  source:     text('source').notNull().default('manual'),
}, (table) => ({
  pk: { columns: [table.bookmarkId, table.tagId] },
}))

// ---------- notes ----------
export const notes = pgTable('notes', {
  id:            text('id').primaryKey(),
  bookmarkId:    text('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  content:       text('content').notNull(),
  isAiGenerated: boolean('is_ai_generated').notNull().default(false),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  bookmarkIdx: index('idx_notes_bookmark_id').on(table.bookmarkId),
}))

// ---------- history ----------
export const history = pgTable('history', {
  id:         integer('id').primaryKey().generatedAlwaysAsIdentity(),
  bookmarkId: text('bookmark_id').notNull().references(() => bookmarks.id, { onDelete: 'cascade' }),
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action:     text('action').notNull(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  bookmarkIdx: index('idx_history_bookmark_id').on(table.bookmarkId),
}))

// ---------- user_settings ----------
export const userSettings = pgTable('user_settings', {
  userId:    text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  settings:  jsonb('settings').notNull().default({}),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

---

## 3. 后端项目搭建

### 3.1 初始化

```bash
# 在项目根目录同级创建 server 目录
mkdir server && cd server

# 初始化
npm init -y
npm install hono @hono/node-server
npm install drizzle-orm postgres
npm install drizzle-kit --save-dev
npm install jose                # JWT
npm install bcryptjs            # 密码哈希
npm install zod                 # 请求验证
npm install uuid                # UUID v7 生成
npm install dotenv              # 环境变量
npm install typescript tsx @types/node @types/bcryptjs --save-dev

# 初始化 TypeScript
npx tsc --init
```

### 3.2 项目结构

```
server/
├── .env                          # 环境变量
├── .env.example
├── drizzle.config.ts             # Drizzle 配置
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                  # 入口：启动 Hono 服务
│   ├── app.ts                    # Hono 应用实例 + 路由挂载
│   ├── db/
│   │   ├── index.ts              # 数据库连接
│   │   ├── schema.ts             # Drizzle Schema（见上文 §2.3）
│   │   └── migrate.ts            # 迁移执行脚本
│   ├── routes/
│   │   ├── auth.ts               # POST /api/auth/register, /api/auth/login
│   │   ├── bookmarks.ts          # CRUD /api/bookmarks
│   │   ├── folders.ts            # CRUD /api/folders
│   │   ├── tags.ts               # CRUD /api/tags
│   │   ├── notes.ts              # CRUD /api/bookmarks/:id/notes
│   │   ├── settings.ts           # GET/PUT /api/settings
│   │   └── sync.ts               # POST /api/sync/push, /api/sync/pull
│   ├── middleware/
│   │   └── auth.ts               # JWT 认证中间件
│   ├── lib/
│   │   ├── jwt.ts                # JWT 签发/验证
│   │   ├── password.ts           # bcrypt 哈希/验证
│   │   └── types.ts              # 共享类型（从前端 types.ts 复制）
│   └── services/
│       ├── bookmark.service.ts   # 书签业务逻辑
│       ├── folder.service.ts     # 文件夹业务逻辑
│       ├── tag.service.ts        # 标签业务逻辑
│       └── sync.service.ts       # 同步逻辑
└── drizzle/
    └── migrations/               # 自动生成的迁移文件
```

### 3.3 环境变量 `.env`

```env
DATABASE_URL=postgres://user:password@localhost:5432/meowlink
JWT_SECRET=your-secret-key-at-least-32-chars
JWT_EXPIRES_IN=7d
PORT=3000
```

---

## 4. 后端 API 实现

### 4.1 认证 API

#### POST /api/auth/register

```
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123",
  "nickname": "用户昵称"
}

Response 201:
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "用户昵称",
    "avatarUrl": ""
  }
}
```

#### POST /api/auth/login

```
Content-Type: application/json

Request:
{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response 200:
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "用户昵称",
    "avatarUrl": ""
  }
}
```

### 4.2 认证中间件

所有业务 API 都需要 `Authorization: Bearer <token>` 头。

```typescript
// src/middleware/auth.ts
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../lib/jwt'

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token)
    c.set('userId', payload.sub as string)
    await next()
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})
```

### 4.3 书签 CRUD API

所有接口前缀 `/api/bookmarks`，全部经过 `authMiddleware`。

#### GET /api/bookmarks — 获取书签列表

```
Query Parameters（均可选）:
  folderId?: string    — 按文件夹筛选
  tag?: string         — 按标签筛选
  q?: string           — 搜索关键词
  includeDeleted?: boolean — 是否包含已删除（默认 false）

Response 200:
{
  "bookmarks": [
    {
      "id": "bm-xxx",
      "url": "https://react.dev",
      "title": "React 官方文档",
      "description": "...",
      "coverImage": "https://picsum.photos/...",
      "favicon": "https://www.google.com/s2/favicons?...",
      "folderId": "folder-frontend",
      "isFavorite": true,
      "isArchived": false,
      "isDeleted": false,
      "tags": ["React", "教程"],
      "aiTags": ["React", "前端"],
      "tagSource": "ai",
      "notes": [...],
      "contentPreview": "...",
      "shortUrl": "mwl.ink/abc123",
      "visitCount": 42,
      "lastVisitedAt": "2026-07-05T...",
      "linkStatus": "ok",
      "history": [...],
      "createdAt": "2026-07-01T...",
      "updatedAt": "2026-07-05T..."
    }
  ]
}
```

#### POST /api/bookmarks — 创建书签

```
Request Body:
{
  "url": "https://example.com",
  "title": "Example",
  "description": "",
  "coverImage": "",
  "favicon": "",
  "folderId": "folder-unsorted",
  "isFavorite": false,
  "tags": ["技术"],
  "aiTags": [],
  "tagSource": "manual",
  "contentPreview": ""
}

Response 201: { "bookmark": { /* 完整书签对象 */ } }
```

#### PUT /api/bookmarks/:id — 更新书签

```
Request Body: { /* 部分字段 */ }
Response 200: { "bookmark": { /* 更新后的完整对象 */ } }
```

#### DELETE /api/bookmarks/:id — 软删除

```
Response 200: { "success": true }
实现：设置 is_deleted = true, deleted_at = NOW(), original_folder_id = folder_id
```

#### POST /api/bookmarks/:id/restore — 恢复

```
Response 200: { "bookmark": { /* 恢复后的书签 */ } }
实现：设置 is_deleted = false, folder_id = original_folder_id
```

#### DELETE /api/bookmarks/:id/permanent — 彻底删除

```
Response 200: { "success": true }
实现：物理删除记录及关联的 bookmark_tags, notes, history
```

#### PUT /api/bookmarks/:id/toggle-favorite — 切换收藏

```
Response 200: { "bookmark": { /* 更新后的对象 */ } }
```

#### PUT /api/bookmarks/:id/toggle-archive — 切换归档

```
Response 200: { "bookmark": { /* 更新后的对象 */ } }
```

### 4.4 文件夹 CRUD API

```
GET    /api/folders          — 获取用户所有文件夹（平铺列表，前端 buildFolderTree 构建树）
POST   /api/folders          — { "name": "...", "parentId": "..." | null } → 201
PUT    /api/folders/:id      — { "name?": "...", "icon?": "...", "color?": "...", "pinned?": bool }
DELETE /api/folders/:id      — 级联处理：子文件夹的 parentId 设为 null，书签的 folderId 设为 'folder-unsorted'
```

### 4.5 标签 CRUD API

```
GET    /api/tags             — 获取用户所有标签
POST   /api/tags             — { "name": "...", "color?": "..." } → 201
DELETE /api/tags/:id         — 级联删除 bookmark_tags 关联
```

### 4.6 笔记 API

```
GET    /api/bookmarks/:id/notes     — 获取书签的所有笔记
POST   /api/bookmarks/:id/notes     — { "content": "..." } → 201
PUT    /api/notes/:id               — { "content": "..." } → 200
DELETE /api/notes/:id               — → 200
```

### 4.7 设置 API

#### GET /api/settings — 获取用户设置

```
Response 200:
{
  "settings": {
    "language": "zh-CN",
    "dateFormat": "zh",
    "defaultView": "list",
    "defaultFolder": "folder-root",
    "newBookmarkFolder": "folder-unsorted",
    "desktopNotifications": false,
    "favoriteUpdateNotify": false,
    "theme": "light",
    "accentColor": "slate",
    "density": "comfortable",
    "font": "system"
  }
}
```

> 注意：敏感字段不在同步范围内：
> - `password` / `f2aEnabled` — 属于认证体系，由专门的账号 API 管理
> - `avatar` / `nickname` — 属于用户资料，由专门的用户 API 管理
> - `aiApiKey` / `aiBaseUrl` / `aiModel` / `aiPrompt` — API Key 类敏感信息，不同步到云端
> - `autoSync` / `syncFrequency` / `wifiOnlySync` / `syncCoverImages` / `offlineAccess` / `conflictResolution` — 客户端行为配置，不同步

#### PUT /api/settings — 更新用户设置

```
Request Body: { /* 部分设置字段 */ }
Response 200: { "settings": { /* 合并后的完整设置 */ } }
```

### 4.8 同步 API

#### POST /api/sync/pull — 拉取远端变更

```
Request Body:
{
  "lastSyncAt": "2026-07-05T10:00:00Z"  // 上次同步时间，首次传 null
}

Response 200:
{
  "bookmarks": [ /* server_updated_at > lastSyncAt 的书签 */ ],
  "folders":   [ /* 变更的文件夹 */ ],
  "tags":      [ /* 变更的标签 */ ],
  "deletedIds": ["bm-xxx", "folder-yyy"],  // 被软删除的 ID 列表
  "syncAt": "2026-07-06T12:00:00Z"        // 本次同步时间戳
}
```

#### POST /api/sync/push — 推送本地变更

```
Request Body:
{
  "changes": [
    {
      "entityType": "bookmark",
      "entityId": "bm-xxx",
      "action": "update",
      "payload": { "title": "新标题" },
      "localUpdatedAt": "2026-07-06T..."
    }
  ]
}

Response 200:
{
  "conflicts": [],           // 冲突列表
  "serverUpdatedAt": "..."   // 服务端应用后的时间戳
}
```

---

## 5. 前端改造

### 5.1 核心改动清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `src/lib/storage.ts` | **重构** | 从 IndexedDB 适配器改为 HTTP API 客户端 |
| `src/lib/store.ts` | **修改** | initialize 改为调用 API；新增 token/auth 状态 |
| `src/lib/types.ts` | **补充** | 新增 User、ApiResponse 等类型 |
| `src/contexts/SettingsContext.tsx` | **修改** | 新增服务端同步逻辑 |
| `src/components/settings/sections/UserSettings.tsx` | **修改** | 从本地改为通过 API 管理 |
| `src/components/settings/sections/AISettings.tsx` | **修改** | 补充 SettingsState 类型 |
| `src/components/settings/sections/SyncSettings.tsx` | **修改** | 激活同步功能，移除占位提示 |

**不需要改动的文件：**

所有 React 组件（Layout、BookmarkGrid、Sidebar 等）—— 因为它们通过 `useStore` 调用 action，而 action 调用 `storage.xxx()`，接口不变。

### 5.2 storage.ts 改造方案

核心思路：保持 `storage` 对象对外暴露的方法签名不变，只替换内部实现。

```typescript
// src/lib/storage.ts（改造后）
// ============================================================
// StorageAdapter — 统一的 HTTP API 数据访问层
// ============================================================

import type { Bookmark, Folder, Tag, Note, User } from './types'

// ---------- API 客户端 ----------
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000'

function getToken(): string | null {
  return localStorage.getItem('meowlink-token')
}

async function apiClient<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// ---------- 认证 ----------
export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const res = await apiClient<{ token: string; user: User }>('POST', '/api/auth/login', { email, password })
  localStorage.setItem('meowlink-token', res.token)
  return res
}

export async function register(email: string, password: string, nickname: string): Promise<{ token: string; user: User }> {
  const res = await apiClient<{ token: string; user: User }>('POST', '/api/auth/register', { email, password, nickname })
  localStorage.setItem('meowlink-token', res.token)
  return res
}

export function logout(): void {
  localStorage.removeItem('meowlink-token')
}

export function isLoggedIn(): boolean {
  return !!getToken()
}

// ---------- Storage Adapter ----------
export const storage = {
  // ---- 初始化：拉取全量数据 ----
  async initialize() {
    const [bookmarksRes, foldersRes, tagsRes] = await Promise.all([
      apiClient<{ bookmarks: Bookmark[] }>('GET', '/api/bookmarks'),
      apiClient<{ folders: Folder[] }>('GET', '/api/folders'),
      apiClient<{ tags: Tag[] }>('GET', '/api/tags'),
    ])
    return {
      bookmarks: bookmarksRes.bookmarks,
      folders: foldersRes.folders,
      tags: tagsRes.tags,
    }
  },

  // ---- 书签 CRUD ----
  async getBookmarks(folderId?: string | null, tag?: string | null, query?: string): Promise<Bookmark[]> {
    const params = new URLSearchParams()
    if (folderId) params.set('folderId', folderId)
    if (tag) params.set('tag', tag)
    if (query) params.set('q', query)
    const res = await apiClient<{ bookmarks: Bookmark[] }>('GET', `/api/bookmarks?${params}`)
    return res.bookmarks
  },

  async addBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'isArchived' | 'syncStatus' | 'notes' | 'visitCount' | 'lastVisitedAt' | 'linkStatus' | 'history' | 'contentPreview' | 'shortUrl' | 'folderPath'>): Promise<Bookmark> {
    const res = await apiClient<{ bookmark: Bookmark }>('POST', '/api/bookmarks', data)
    return res.bookmark
  },

  async updateBookmark(id: string, updates: Partial<Bookmark>): Promise<void> {
    await apiClient('PUT', `/api/bookmarks/${id}`, updates)
  },

  async deleteBookmark(id: string): Promise<void> {
    await apiClient('DELETE', `/api/bookmarks/${id}`)
  },

  async restoreBookmark(id: string): Promise<Bookmark | null> {
    const res = await apiClient<{ bookmark: Bookmark }>('POST', `/api/bookmarks/${id}/restore`)
    return res.bookmark
  },

  async permanentlyDeleteBookmark(id: string): Promise<void> {
    await apiClient('DELETE', `/api/bookmarks/${id}/permanent`)
  },

  async getDeletedBookmarks(): Promise<Bookmark[]> {
    const res = await apiClient<{ bookmarks: Bookmark[] }>('GET', '/api/bookmarks?includeDeleted=true')
    return res.bookmarks.filter(b => b.isDeleted)
  },

  async toggleFavorite(id: string): Promise<void> {
    await apiClient('PUT', `/api/bookmarks/${id}/toggle-favorite`)
  },

  async toggleArchive(id: string): Promise<void> {
    await apiClient('PUT', `/api/bookmarks/${id}/toggle-archive`)
  },

  // ---- 文件夹 CRUD ----
  async getFolders(): Promise<Folder[]> {
    const res = await apiClient<{ folders: Folder[] }>('GET', '/api/folders')
    return res.folders
  },

  async addFolder(name: string, parentId: string | null = null): Promise<Folder> {
    const res = await apiClient<{ folder: Folder }>('POST', '/api/folders', { name, parentId })
    return res.folder
  },

  async updateFolder(id: string, updates: Partial<Folder>): Promise<void> {
    await apiClient('PUT', `/api/folders/${id}`, updates)
  },

  async deleteFolder(id: string): Promise<void> {
    await apiClient('DELETE', `/api/folders/${id}`)
  },

  // ---- 标签 CRUD ----
  async getTags(): Promise<Tag[]> {
    const res = await apiClient<{ tags: Tag[] }>('GET', '/api/tags')
    return res.tags
  },

  async addTag(name: string, color?: string): Promise<Tag> {
    const res = await apiClient<{ tag: Tag }>('POST', '/api/tags', { name, color })
    return res.tag
  },

  async deleteTag(id: string): Promise<void> {
    await apiClient('DELETE', `/api/tags/${id}`)
  },

  // ---- 搜索（前端保留 MiniSearch，改为从 API 数据重建索引） ----
  // 搜索的执行方式改为：先从 API 获取全量数据，再用 MiniSearch 搜索
  // 或改为直接调用 GET /api/bookmarks?q=keyword

  async refreshSearchIndex(): Promise<void> {
    // 重构后搜索策略由组件层决定：可以直接 GET /api/bookmarks?q=xxx
    // 也可以保留 MiniSearch 在内存中做本地搜索
  },

  search(query: string): string[] {
    // 搜索逻辑由 MiniSearch 保留或改为 API 搜索
    // 推荐策略：优先 GET /api/bookmarks?q=xxx，降级到本地 MiniSearch
    return []
  },

  // ---- 种子数据（服务端初始化用户时的默认数据） ----
  // seedData 移到服务端，在用户注册后自动创建默认文件夹和标签
  async seedData(): Promise<void> {
    // 服务端处理
  },

  // ---- 清除与重置 ----
  async clearAllAndReSeed(): Promise<void> {
    // 调用服务端重置 API 或由前端逐个删除
    await apiClient('POST', '/api/data/reset')
  },

  async loadAll() {
    return this.initialize()
  },
}
```

### 5.3 store.ts 改动

```typescript
// src/lib/store.ts 关键改动部分

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, Bookmark, ViewMode, ThemeMode, SortMode, ToastMessage } from './types'
import { storage } from './storage'

// 新增：登录状态管理
export const useAuthStore = create<{
  isLoggedIn: boolean
  user: { id: string; email: string; nickname: string; avatarUrl: string } | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, nickname: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}>()((set) => ({
  isLoggedIn: !!localStorage.getItem('meowlink-token'),
  user: null,
  login: async (email, password) => {
    const { login } = await import('./storage')
    const res = await login(email, password)
    set({ isLoggedIn: true, user: res.user })
  },
  register: async (email, password, nickname) => {
    const { register } = await import('./storage')
    const res = await register(email, password, nickname)
    set({ isLoggedIn: true, user: res.user })
  },
  logout: () => {
    const { logout } = await import('./storage')
    import('./storage').then(({ logout }) => logout())
    set({ isLoggedIn: false, user: null })
  },
  checkAuth: async () => {
    const token = localStorage.getItem('meowlink-token')
    if (!token) transitionend set({ isLoggedIn: false, user: null })
    // 验证 token 有效性...
    set({ isLoggedIn: true })
  },
}))
```

### 5.4 设置同步方案

`SettingsContext.tsx` 新增服务端同步：

```typescript
// settings 变更时自动推送到服务端
useEffect(() => {
  if (!isLoggedIn) return
  const debounced = setTimeout(async () => {
    try {
      await apiClient('PUT', '/api/settings', {
        // 只同步非敏感设置
        language: settings.language,
        dateFormat: settings.dateFormat,
        defaultView: settings.defaultView,
        defaultFolder: settings.defaultFolder,
        newBookmarkFolder: settings.newBookmarkFolder,
        desktopNotifications: settings.desktopNotifications,
        favoriteUpdateNotify: settings.favoriteUpdateNotify,
        theme: settings.theme,
        accentColor: settings.accentColor,
        density: settings.density,
        font: settings.font,
      })
    } catch { /* 静默失败 */ }
  }, 2000)
  return () => clearTimeout(debounced)
}, [settings, isLoggedIn])

// 登录后从服务端拉取设置
useEffect(() => {
  if (!isLoggedIn) return
  apiClient<{ settings: Partial<SettingsState> }>('GET', '/api/settings')
    .then(res => setSettings(prev => ({ ...prev, ...res.settings })))
    .catch(() => {})
}, [isLoggedIn])
```

### 5.5 前端项目新增依赖

```bash
# 无需新增依赖，使用原生 fetch 即可
# 如果偏好，可以安装 ky 或 ofetch 做更简洁的 HTTP 客户端
```

### 5.6 前端环境变量

创建 `.env`（或在 `vite.config.ts` 中配置）：

```env
VITE_API_BASE=http://localhost:3000
```

`src/vite-env.d.ts` 补充类型：

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 5.7 App.tsx 改动

在 App 组件中新增登录/注册流程：

```typescript
// App.tsx 改造：数据加载前先检查登录状态
export default function App() {
  const initialize = useStore((s) => s.initialize)
  const isLoading = useStore((s) => s.isLoading)
  const { isLoggedIn, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      initialize()
    }
  }, [isLoggedIn, initialize])

  // 未登录 → 显示登录/注册页面
  if (!isLoggedIn) {
    return <AuthPage />
  }

  // ... 原有逻辑
}
```

需要新建 `src/components/AuthPage.tsx` 实现登录/注册 UI。

---

## 6. 执行顺序与验证

### 6.1 推荐执行顺序

```
Phase 1: 后端基础设施
  ├─ Step 1.1  初始化 server 项目（npm init、安装依赖）
  ├─ Step 1.2  配置 TypeScript + Drizzle
  ├─ Step 1.3  编写 Schema 文件 + 生成迁移 + 执行迁移
  ├─ Step 1.4  创建 Hono 应用入口 + JWT 工具
  └─ Step 1.5  实现认证 API（register + login）

Phase 2: 后端业务 API
  ├─ Step 2.1  实现 folders CRUD
  ├─ Step 2.2  实现 tags CRUD
  ├─ Step 2.3  实现 bookmarks CRUD（含软删除、恢复、彻底删除）
  ├─ Step 2.4  实现 notes CRUD
  ├─ Step 2.5  实现 settings GET/PUT
  └─ Step 2.6  实现 sync push/pull

Phase 3: 前端改造
  ├─ Step 3.1  重构 storage.ts 为 HTTP 客户端
  ├─ Step 3.2  新增 AuthPage 登录/注册组件
  ├─ Step 3.3  修改 App.tsx 增加认证流程
  ├─ Step 3.4  修改 SettingsContext 增加服务端同步
  └─ Step 3.5  激活 SyncSettings 真实同步功能

Phase 4: 联调验证
  ├─ Step 4.1  端到端测试（注册 → 登录 → CRUD → 导出 → 同步）
  ├─ Step 4.2  多设备模拟测试
  └─ Step 4.3  部署（前端静态 + 后端 Docker/Node）
```

### 6.2 验证清单

| # | 验证项 | 预期结果 |
|---|--------|---------|
| 1 | `POST /api/auth/register` | 返回 JWT token + 用户信息 |
| 2 | `POST /api/auth/login` | 返回 JWT token + 用户信息 |
| 3 | `GET /api/bookmarks`（无 token）| 返回 401 |
| 4 | `GET /api/bookmarks`（有 token）| 返回用户的书签列表 |
| 5 | `POST /api/bookmarks` | 创建书签成功，返回完整对象 |
| 6 | `PUT /api/bookmarks/:id` | 更新成功 |
| 7 | `DELETE /api/bookmarks/:id` | 软删除，isDeleted = true |
| 8 | `POST /api/bookmarks/:id/restore` | 恢复成功 |
| 9 | `DELETE /api/bookmarks/:id/permanent` | 物理删除，查询不到 |
| 10 | `GET/POST/PUT/DELETE /api/folders` | 完整的文件夹 CRUD |
| 11 | `GET/POST/DELETE /api/tags` | 完整的标签 CRUD |
| 12 | `GET/PUT /api/settings` | 设置同步正常 |
| 13 | 前端登录 → 数据加载 | IndexedDB 种子数据不再出现，展示服务端数据 |
| 14 | 离线操作 → 恢复网络 → push | 本地变更推送到服务端 |
| 15 | 设备 A 修改 → 设备 B pull | 设备 B 获取到最新数据 |

### 6.3 桌面端接入（后置任务）

完成前后端分离后，桌面端接入仅需：

1. 复用前端 `storage.ts`（HTTP 客户端版本）
2. 复用前端 React 组件和 Zustand store
3. 用 Tauri v2 套壳
4. 添加配置界面：输入 `服务器地址` + `Token`
5. 调用 `initialize()` 拉取数据

**核心代码就一行**：

```typescript
localStorage.setItem('meowlink-token', userProvidedToken)
// 然后正常调用 useStore.initialize() → 自动从 API 拉取数据
```

---

*文档版本：v1.0 · 生成日期：2026-07-06 · 基于 MeowLink v0.1.0 前端代码*
