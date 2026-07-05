# MeowLink 书签管理器 —— 优先级迭代需求文档

> 创建日期：2026-07-05 | 当前版本：v1.0.0 | 文档状态：待评审

---

## 1. 背景与目标

MeowLink 是一个基于 React + TypeScript 的本地书签管理器，使用 IndexedDB（Dexie.js）做数据持久化、Zustand 管理全局状态、Tailwind CSS 做样式。当前核心 CRUD、搜索、导入导出功能已基本可用，但存在若干功能缺口和架构问题，影响用户体验和开发维护效率。

本轮迭代目标：补齐关键功能缺口、清理架构冗余、兑现已承诺但未实现的功能。

### 1.1 技术栈全景

| 层级 | 技术选型 |
| --- | --- |
| **前端 UI** | React 19 + Tailwind CSS + shadcn/ui（快速搭建美观界面） |
| **桌面/移动壳** | Tauri v2（Rust 后端，一套代码五端输出） |
| **本地存储** | `tauri-plugin-sql`（SQLite）或 IndexedDB（via `idb` 库） |
| **全文搜索** | `sqlite-fts5` 或 `flexsearch`（纯 JS，WebView 友好） |
| **云端后端** | Supabase（PostgreSQL + Auth + Realtime）或自研 Hono + Drizzle + D1 |
| **同步协议** | 基于 `updated_at` 的增量同步，参考 MarkSyncr 的 checksum 变更检测 |
| **元数据抓取** | 云端 Hono/Edge Function 做代理抓取，回写标题/og:image |

---

## 2. 需求分级总览

| 优先级 | 编号 | 需求名称 | 预计工作量 |
|--------|------|----------|-----------|
| P0 | [REQ-01](#req-01-回收站功能) | 回收站功能 | 中 |
| P0 | [REQ-02](#req-02-统一详情视图) | 统一详情视图（消除双面板） | 中 |
| P1 | [REQ-03](#req-03-搜索历史持久化) | 搜索历史持久化 | 小 |
| P1 | [REQ-04](#req-04-设置页功能接入) | 设置页核心配置接入 | 中 |
| P1 | [REQ-05](#req-05-快捷键全面接入) | 应用内快捷键全面接入 | 小 |
| P2 | [REQ-06](#req-06-同步设置页处理) | 同步设置页占位处理 | 小 |
| P2 | [REQ-07](#req-07-存储空间动态计算) | 存储空间动态计算 | 小 |

---

## 3. 详细需求

### REQ-01: 回收站功能

**当前状态**：删除书签时执行软删除（`isDeleted: true`），删除确认弹窗提示"可通过回收站恢复"——但回收站 UI 实际不存在，用户无法查看或恢复已删除的书签。

**需求描述**：

1. 在侧边栏文件夹树中新增"回收站"入口（可放在特殊文件夹区域底部，视觉上与正常文件夹有所区分）。
2. 点击回收站后主内容区展示所有 `isDeleted: true` 的书签列表，每条显示标题、URL、删除时间（`updatedAt`）、原所属文件夹。
3. 每条提供两个操作按钮：**恢复**（将 `isDeleted` 置回 `false`，放回原文件夹）和**彻底删除**（从 IndexedDB 物理删除，不可恢复）。
4. 回收站列表为空时展示空状态提示"回收站为空"。
5. 回收站入口旁显示已删除书签数量 badge。
6. 如果回收站方案工作量大，备选方案：直接改为物理删除（`db.bookmarks.delete(id)`），并修改删除弹窗文案。

**涉及文件**：
- `src\components\FolderTree.tsx`（新增回收站入口）
- `src\components\BookmarkGrid.tsx`（回收站视图）
- `src\lib\storage.ts`（新增 `restoreBookmark`、`permanentlyDeleteBookmark` 方法）
- `src\lib\store.ts`（新增对应 action）
- `src\components\BookmarkList.tsx`（回收站列表渲染）

**验收标准**：
- 用户可以从回收站恢复已删除书签到原文件夹
- 用户可以从回收站彻底删除书签
- 回收站入口始终可见，数量 badge 实时更新

---

### REQ-02: 统一详情视图

**当前状态**：存在两个独立的详情组件：
- `BookmarkDetail`（Sheet 抽屉）：通过列表项右侧操作按钮或 `openDetail()` 打开，含内联编辑标题/描述、元信息展示。
- `BookmarkDetailPanel`（右侧固定面板）：通过单击列表项触发 `selectBookmark()`，沉浸式封面 + 统计卡片 + 标签管理 + 笔记系统 + 相关推荐。

两个组件功能各有侧重但高度重叠，用户在不同交互路径下看到不同的详情界面，体验割裂。

**需求描述**：

1. 保留 `BookmarkDetailPanel` 作为唯一详情视图（功能更丰富）。
2. 将 `BookmarkDetail` 中独有的内联标题/描述编辑能力迁移到 `BookmarkDetailPanel`。
3. 移除 `BookmarkDetail` 组件、`openDetail`/`closeDetail` action、`isDetailOpen`/`selectedBookmark` 状态。
4. 所有原触发 `openDetail()` 的地方改为 `selectBookmark(id)`。
5. 详情面板中的"编辑"按钮触发 `AddBookmarkDialog` 的编辑模式（现有 `openAddDialog(bookmark)` 已支持）。

**涉及文件**：
- `src\components\BookmarkDetail.tsx`（迁移后删除）
- `src\components\BookmarkDetailPanel.tsx`（合并功能）
- `src\lib\store.ts`（移除废弃 action/state）
- `src\lib\types.ts`（移除废弃字段）
- `src\App.tsx`（移除 `BookmarkDetail` 组件挂载）

**验收标准**：
- 所有入口打开的是同一个详情视图
- 内联编辑标题和描述的功能可用
- 无控制台报错

---

### REQ-03: 搜索历史持久化

**当前状态**：`SearchBar.tsx` 中最近搜索列表使用的是硬编码假数据：
```typescript
const mockRecentSearches = ['前端框架', '设计工具', 'API 文档']
```

**需求描述**：

1. 使用 `localStorage` 存储用户真实搜索关键词，key 为 `meowlink-recent-searches`。
2. 数据格式：`string[]`，最多保留 10 条，按时间倒序排列，自动去重。
3. 用户每次提交搜索（回车或点击搜索建议）时将关键词写入历史。
4. 搜索历史为空时不展示"最近搜索"区域。
5. 每条历史记录右侧提供删除按钮。

**涉及文件**：
- `src\components\SearchBar.tsx`
- 新建 `src\hooks\useSearchHistory.ts`

**验收标准**：
- 用户搜索后关键词出现在"最近搜索"列表中
- 刷新页面后搜索历史保留
- 重复关键词不会重复出现

---

### REQ-04: 设置页核心配置接入

**当前状态**：`SettingsContext` 定义了 20+ 个配置项，设置页有完整的 UI，但几乎所有配置项都不影响应用实际行为。仅 `theme` 通过 Zustand store 的 `setTheme` 生效。

**需求描述**（本迭代只接入核心项）：

1. **默认视图（`defaultView`）**：设置页选中的"卡片/列表"值同步到 store 的 `viewMode`，作为应用启动时的默认视图模式。
2. **新书签默认文件夹（`newBookmarkFolder`）**：`AddBookmarkDialog` 打开时，`selectedFolderId` 的默认值从设置读取，而非硬编码 `'folder-unsorted'`。
3. **默认收藏夹（`defaultFolder`）**：应用启动时 `selectedFolderId` 初始值从设置读取。
4. 配置项的读写统一通过 `SettingsContext` → `localStorage`，store 初始化时读取。

**暂不接入的配置项**（后续迭代）：
- 日期格式（`dateFormat`）

**涉及文件**：
- `src\contexts\SettingsContext.tsx`
- `src\lib\store.ts`
- `src\components\AddBookmarkDialog.tsx`

**验收标准**：
- 设置页修改"默认视图"后刷新页面，视图模式生效
- 设置页修改"新书签默认文件夹"后，添加书签弹窗默认选中该文件夹
- 配置持久化到 localStorage，跨会话保持

---

### REQ-05: 应用内快捷键全面接入

**当前状态**：`ShortcutSettings.tsx` 展示 9 组快捷键，实际仅 `Cmd+D`（添加书签）生效。其他如 `Cmd+K` 搜索、`Cmd+B` 切换侧边栏、`Delete` 删除等均未实现。

**需求描述**：

接入以下已声明的快捷键：

| 快捷键 | 操作 | 实现位置 |
|--------|------|---------|
| `Cmd+K` / `Ctrl+K` | 聚焦搜索框 | `SearchBar` |
| `Cmd+B` / `Ctrl+B` | 切换侧边栏 | `Layout` 或全局 |
| `Cmd+E` / `Ctrl+E` | 编辑当前选中书签 | `BookmarkDetailPanel` |
| `Delete` | 删除当前选中书签 | `BookmarkList` |
| `Escape` | 关闭弹窗/取消操作 | 已部分实现，补齐所有弹窗 |
| `Cmd+Enter` | 在新标签页打开选中书签 | `BookmarkList` |

**涉及文件**：
- `src\components\SearchBar.tsx`
- `src\components\Layout.tsx`
- `src\components\BookmarkDetailPanel.tsx`
- `src\components\BookmarkList.tsx`

**验收标准**：
- 所有列表中的快捷键实际可用
- 快捷键与设置页表格展示一致
- 在输入框中时不触发全局快捷键

---

### REQ-06: 同步设置页占位处理

**当前状态**：`SyncSettings.tsx` 有完整 UI（账户信息、自动同步、频率、WiFi 限制、离线模式、冲突解决），但无任何后端实现。`changes` 表在写入但从未被消费。

**需求描述**：

1. 在同步设置页顶部添加醒目提示横幅："云同步功能正在开发中，当前仅支持本地存储。"
2. 将"同步"导航项更名为"同步（即将推出）"或添加"In Development"标签。
3. 所有同步相关开关默认置灰/禁用态，点击时显示 toast 提示"同步功能即将上线"。

**暂不做**：实际同步后端开发（需另行立项）。

**涉及文件**：
- `src\components\settings\sections\SyncSettings.tsx`
- `src\components\settings\SettingsSidebar.tsx`

**验收标准**：
- 用户进入同步设置页看到明确提示
- 同步开关不可操作或操作时有反馈

---

### REQ-07: 存储空间动态计算

**当前状态**：侧边栏底部存储进度条为硬编码 `128 MB / 2 GB`，进度固定 15%。

**需求描述**：

1. 通过 `navigator.storage.estimate()` API 获取 IndexedDB 实际使用量。
2. 动态计算并展示：已用量 / 总配额 + 百分比进度条。
3. 如果浏览器不支持该 API（如 Firefox 部分版本），显示"存储信息不可用"。
4. 在数据导入/删除后刷新存储信息。

**涉及文件**：
- `src\components\Sidebar.tsx`
- 新建 `src\hooks\useStorageQuota.ts`

**验收标准**：
- 进度条反映实际 IndexedDB 使用量
- 数据变更后进度条更新（可通过导入/删除触发）

---

## 4. 迭代计划

| 阶段 | 包含需求 | 预计周期 |
|------|---------|---------|
| 第一阶段（紧急） | REQ-01 回收站、REQ-02 统一详情视图 | 3-5 天 |
| 第二阶段（重要） | REQ-03 搜索历史、REQ-04 设置接入、REQ-05 快捷键 | 3-4 天 |
| 第三阶段（体验） | REQ-06 同步占位、REQ-07 存储动态 | 1-2 天 |

---

## 5. 波及影响分析

| 需求 | 影响范围 | 风险 |
|------|---------|------|
| REQ-01 | 数据层新增两个方法；FolderTree 新增入口；BookmarkGrid 新增视图状态 | 低——软删除已有，仅是新增恢复/彻底删除路径 |
| REQ-02 | 删除一个组件，迁移能力到另一个组件；涉及 store 字段清理 | 中——需确保所有详情入口都已迁移，不遗漏回调 |
| REQ-03 | 仅 SearchBar 内部改动 | 低 |
| REQ-04 | SettingsContext 与 Zustand store 之间新增数据桥接 | 中——两套状态体系对接，需注意初始化时序 |
| REQ-05 | 分散在多个组件中新增全局键盘事件监听 | 低 |
| REQ-06 | 仅 UI 层面的禁用/提示 | 极低 |
| REQ-07 | 新增一个 hook；Sidebar 小幅改造 | 低 |

---

## 6. 不做的事项（明确排除）

- **跨设备云同步后端**：需独立立项，涉及服务端架构、鉴权、冲突解决算法。
- **浏览器扩展 / 桌面客户端**：快速添加书签的全局快捷键依赖此能力，暂不开发。
- **链接有效性检查**：`linkStatus` 字段已预留但无后端检测机制，后续迭代。
- **虚拟列表**：书签量 < 1000 时性能可接受，暂不优化。
- **i18n 国际化适配（`language`）**：需单独建立 i18n 框架（如 react-i18next），涉及全量文案提取和语言包管理，后续独立迭代。
- **日期格式（`dateFormat`）**：设置页日期格式配置项的后端接入，后续迭代。
- **Tauri v2 接口预埋**：预埋 Tauri v2 统一方案相关接口层（如文件系统访问、系统通知、窗口管理等），后续桌面端与移动端统一采用 Tauri v2 方案，届时直接对接已预留的接口即可，避免大规模重构。
