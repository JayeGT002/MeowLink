// ============================================================
// Dexie.js 数据库定义 — MeowLink IndexedDB
// 表：bookmarks、folders、tags、changes
// ============================================================

import Dexie, { type EntityTable } from 'dexie'
import type { Bookmark, Folder, Tag, ChangeRecord } from './types'

const DB_NAME = 'MeowLinkDB'

// 数据库版本定义（v1→v2→v3）
interface MeowLinkDB extends Dexie {
  bookmarks: EntityTable<Bookmark, 'id'>
  folders: EntityTable<Folder, 'id'>
  tags: EntityTable<Tag, 'id'>
  changes: EntityTable<ChangeRecord, 'id'>
}

// v1 初始 Schema
const v1Stores = {
  bookmarks: 'id, url, title, folderId, *tags, isFavorite, isDeleted, syncStatus, createdAt, updatedAt',
  folders: 'id, name, parentId, createdAt',
  tags: 'id, &name, color',
  changes: '++id, entityType, entityId, action, status, createdAt',
}

// v2: 新增 visitCount / lastVisitedAt / linkStatus / history / notes
const v2Stores = {
  bookmarks: 'id, url, title, folderId, *tags, isFavorite, isDeleted, syncStatus, createdAt, updatedAt, visitCount, lastVisitedAt, linkStatus',
  folders: 'id, name, parentId, createdAt',
  tags: 'id, &name, color',
  changes: '++id, entityType, entityId, action, status, createdAt',
}

// v3: 新增 AI 标签字段 — aiTags / tagSource
const v3Stores = {
  bookmarks: 'id, url, title, folderId, *tags, *aiTags, isFavorite, isDeleted, syncStatus, createdAt, updatedAt, visitCount, lastVisitedAt, linkStatus',
  folders: 'id, name, parentId, createdAt',
  tags: 'id, &name, color',
  changes: '++id, entityType, entityId, action, status, createdAt',
}

const db = new Dexie(DB_NAME) as MeowLinkDB

db.version(1).stores(v1Stores)

db.version(2).stores(v2Stores).upgrade(async (tx) => {
  await tx.table('bookmarks').clear()
  await tx.table('folders').clear()
  await tx.table('tags').clear()
  await tx.table('changes').clear()
})

db.version(3).stores(v3Stores).upgrade(async (tx) => {
  await tx.table('bookmarks').clear()
  await tx.table('folders').clear()
  await tx.table('tags').clear()
  await tx.table('changes').clear()
})

// v4: 新增 isArchived / notes / contentPreview / shortUrl 索引
const v4Stores = {
  bookmarks: 'id, url, title, folderId, *tags, *aiTags, isFavorite, isDeleted, isArchived, syncStatus, createdAt, updatedAt, visitCount, lastVisitedAt, linkStatus, notes, contentPreview, shortUrl',
  folders: 'id, name, parentId, createdAt',
  tags: 'id, &name, color',
  changes: '++id, entityType, entityId, action, status, createdAt',
}

db.version(4).stores(v4Stores).upgrade(async (tx) => {
  await tx.table('bookmarks').clear()
  await tx.table('folders').clear()
  await tx.table('tags').clear()
  await tx.table('changes').clear()
})

/** 强制清空并重建数据库（用于修复损坏的 IndexedDB） */
export async function resetDatabase() {
  await Dexie.delete(DB_NAME)
}

export default db
