// ============================================================
// Netscape Bookmark HTML 格式导入 / 导出工具
// 标准格式参考：Microsoft IE / Firefox / Chrome 书签导出
// ============================================================

import { storage } from './storage'
import db from './db'
import type { Bookmark, Folder, Tag } from './types'

// ============================================================
// 通用下载工具
// ============================================================
function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================================
// 导入：解析 Netscape Bookmark File Format
// ============================================================

interface ParsedBookmark {
  title: string
  url: string
  description: string
  tags: string[]
  addDate?: number
}

interface ParsedFolder {
  name: string
  bookmarks: ParsedBookmark[]
  subFolders: ParsedFolder[]
}

/** 解析 <A> 标签属性，提取 href、add_date、tags 等 */
function parseAnchorAttributes(attrStr: string): { href: string; addDate?: number; tags?: string; icon?: string } {
  const result: { href: string; addDate?: number; tags?: string; icon?: string } = { href: '' }

  const hrefMatch = attrStr.match(/HREF="([^"]*)"/i)
  if (hrefMatch) result.href = hrefMatch[1]

  const addDateMatch = attrStr.match(/ADD_DATE="(\d+)"/i)
  if (addDateMatch) result.addDate = parseInt(addDateMatch[1], 10)

  const tagsMatch = attrStr.match(/TAGS="([^"]*)"/i)
  if (tagsMatch) result.tags = tagsMatch[1]

  const iconMatch = attrStr.match(/ICON="([^"]*)"/i)
  if (iconMatch) result.icon = iconMatch[1]

  return result
}

/** 解析 <H3> 标签，提取文件夹名和属性 */
function parseH3Attributes(line: string): { name: string; addDate?: number } {
  const nameMatch = line.match(/<H3[^>]*>([^<]*)<\/H3>/i)
  const addDateMatch = line.match(/ADD_DATE="(\d+)"/i)
  return {
    name: nameMatch ? nameMatch[1].trim() : '未命名文件夹',
    addDate: addDateMatch ? parseInt(addDateMatch[1], 10) : undefined,
  }
}

/** 递归解析 <DL> 结构 */
function parseDL(lines: string[], startIndex: number): { folder: ParsedFolder; endIndex: number } {
  const folder: ParsedFolder = { name: '', bookmarks: [], subFolders: [] }
  let i = startIndex

  while (i < lines.length) {
    const line = lines[i].trim()

    // 子文件夹开始
    if (/<DT><H3/i.test(line)) {
      const { name, addDate } = parseH3Attributes(line)
      i++
      // 跳过可能存在的 <DD> 描述行
      while (i < lines.length && lines[i].trim().startsWith('<DD>')) i++
      // 找到子 <DL>
      if (i < lines.length && lines[i].trim().startsWith('<DL')) {
        const subResult = parseDL(lines, i + 1)
        subResult.folder.name = name
        folder.subFolders.push(subResult.folder)
        i = subResult.endIndex
      }
      continue
    }

    // 书签条目
    if (/<DT><A\s/i.test(line)) {
      const attrMatch = line.match(/<A\s([^>]*)>/i)
      const attrs = attrMatch ? parseAnchorAttributes(attrMatch[1]) : { href: '' }

      const titleMatch = line.match(/<A[^>]*>([^<]*)<\/A>/i)
      const title = titleMatch ? titleMatch[1].trim() : attrs.href

      // 下一行可能是 <DD> 描述
      let description = ''
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim()
        if (nextLine.startsWith('<DD>')) {
          description = nextLine.replace(/^<DD>\s*/i, '').trim()
          i++
        }
      }

      const tags = attrs.tags ? attrs.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

      folder.bookmarks.push({
        title,
        url: attrs.href,
        description,
        tags,
        addDate: attrs.addDate,
      })
      i++
      continue
    }

    // 文件夹标题行（顶层 DT>H3）
    if (/<DT><H3/i.test(line)) {
      const { name } = parseH3Attributes(line)
      folder.name = name
      i++
      continue
    }

    // </DL> 结束
    if (line.startsWith('</DL>')) {
      i++
      return { folder, endIndex: i }
    }

    i++
  }

  return { folder, endIndex: i }
}

/** 主解析函数：输入 Netscape HTML 字符串，输出解析结果 */
export function parseNetscapeHTML(html: string): ParsedFolder {
  const lines = html.split('\n')
  const dlStart = lines.findIndex((l) => l.trim().startsWith('<DL'))

  if (dlStart === -1) {
    return { name: '导入的书签', bookmarks: [], subFolders: [] }
  }

  const { folder } = parseDL(lines, dlStart + 1)
  return folder
}

/** 将解析出的书签批量导入 IndexedDB */
export async function importBookmarksFromHTML(html: string): Promise<number> {
  const parsed = parseNetscapeHTML(html)

  // 获取现有文件夹映射
  const existingFolders = await storage.getFolders()

  async function importFolder(folder: ParsedFolder, parentId: string | null = null): Promise<number> {
    let count = 0

    // 创建对应文件夹（非根级时）
    let currentFolderId = parentId
    if (folder.name && folder.name !== '导入的书签') {
      const created = await storage.addFolder(folder.name, parentId)
      currentFolderId = created.id
    }
    // 如果文件夹名为空，使用默认文件夹
    if (!currentFolderId) {
      const unsorted = existingFolders.find((f: Folder) => f.id === 'folder-unsorted')
      currentFolderId = unsorted?.id || 'folder-unsorted'
    }

    // 导入书签
    for (const bm of folder.bookmarks) {
      if (!bm.url) continue
      try {
        await storage.addBookmark({
          url: bm.url,
          title: bm.title || bm.url,
          description: bm.description || '',
          coverImage: '',
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32`,
          tags: bm.tags,
          aiTags: [],
          tagSource: 'manual',
          folderId: currentFolderId,
          isFavorite: false,
        })
        count++
      } catch {
        // 跳过无法导入的书签
      }
    }

    // 递归导入子文件夹
    for (const sub of folder.subFolders) {
      count += await importFolder(sub, currentFolderId)
    }

    return count
  }

  const importedCount = await importFolder(parsed)
  // 刷新搜索索引
  await storage.refreshSearchIndex()
  return importedCount
}

// ============================================================
// CSV 导出
// ============================================================

function csvEscape(value: string): string {
  if (!value.includes(',') && !value.includes('"') && !value.includes('\n') && !value.includes('\r')) {
    return value
  }
  return '"' + value.replace(/"/g, '""') + '"'
}

function buildFolderPath(folderId: string, folders: Folder[]): string {
  const parts: string[] = []
  let currentId: string | null = folderId
  while (currentId) {
    const folder = folders.find((f) => f.id === currentId)
    if (!folder) break
    parts.unshift(folder.name)
    currentId = folder.parentId || null
  }
  return parts.join('/')
}

export async function exportBookmarksAsCSV(
  bookmarks: Bookmark[],
  folders: Folder[]
): Promise<string> {
  const header = 'title,url,description,folder_path,tags,is_favorite,created_at,updated_at'
  const rows = [header]

  for (const bm of bookmarks) {
    const tagsStr = bm.tags.map((t) => csvEscape(t)).join(',')
    rows.push([
      csvEscape(bm.title || bm.url),
      csvEscape(bm.url),
      csvEscape(bm.description || ''),
      csvEscape(buildFolderPath(bm.folderId, folders)),
      csvEscape(tagsStr),
      bm.isFavorite ? 'true' : 'false',
      bm.createdAt,
      bm.updatedAt,
    ].join(','))
  }

  return '\uFEFF' + rows.join('\n')
}

// ============================================================
// ENEX (Evernote Export) 导出
// ============================================================

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toEvernoteDate(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return d.getUTCFullYear().toString() +
      pad(d.getUTCMonth() + 1) +
      pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) +
      pad(d.getUTCMinutes()) +
      pad(d.getUTCSeconds()) + 'Z'
  } catch {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '') + 'Z'
  }
}

export function exportBookmarksAsENEX(
  bookmarks: Bookmark[],
  folders: Folder[]
): string {
  const notes: string[] = []

  for (const bm of bookmarks) {
    const folderPath = buildFolderPath(bm.folderId, folders)
    const tagItems = [...bm.tags, folderPath].filter(Boolean).map(
      (t) => '    <tag>' + xmlEscape(t) + '</tag>'
    ).join('\n')

    const contentLines = [
      '        <div><a href="' + xmlEscape(bm.url) + '">' + xmlEscape(bm.url) + '</a></div>',
    ]
    if (bm.description) {
      contentLines.push('        <div>' + xmlEscape(bm.description) + '</div>')
    }
    if (bm.notes) {
      contentLines.push('        <hr/>')
      contentLines.push('        <div><b>备注：</b></div>')
      contentLines.push('        <div>' + xmlEscape(bm.notes) + '</div>')
    }

    const enNote = [
      '      <?xml version="1.0" encoding="UTF-8"?>',
      '      <!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">',
      '      <en-note>',
      contentLines.join('\n'),
      '      </en-note>',
    ].join('\n')

    notes.push([
      '  <note>',
      '    <title>' + xmlEscape(bm.title || bm.url) + '</title>',
      '    <content><![CDATA[',
      enNote,
      '    ]]></content>',
      '    <created>' + toEvernoteDate(bm.createdAt) + '</created>',
      '    <updated>' + toEvernoteDate(bm.updatedAt) + '</updated>',
      tagItems,
      '    <note-attributes>',
      '      <source-url>' + xmlEscape(bm.url) + '</source-url>',
      '    </note-attributes>',
      '  </note>',
    ].join('\n'))
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export3.dtd">',
    '<en-export export-date="' + new Date().toISOString() + '" application="MoLink" version="1.0">',
    notes.join('\n'),
    '</en-export>',
  ].join('\n')
}

// ============================================================
// Markdown TXT 导出
// ============================================================

export function exportBookmarksAsMarkdown(
  bookmarks: Bookmark[],
  folders: Folder[],
  options?: {
    includeDesc?: boolean
    includeTags?: boolean
    urlOnly?: boolean
  }
): string {
  const includeDesc = options?.includeDesc !== false
  const includeTags = options?.includeTags !== false
  const urlOnly = options?.urlOnly === true

  const lines: string[] = []
  lines.push('# 喵链书签导出')
  lines.push('导出时间：' + new Date().toLocaleString('zh-CN'))
  lines.push('')

  const folderMap = new Map<string, { folder: Folder; bookmarks: Bookmark[] }>()

  for (const bm of bookmarks) {
    const folderPath = buildFolderPath(bm.folderId, folders)
    if (!folderMap.has(folderPath)) {
      const f = folders.find((x) => x.id === bm.folderId)
      folderMap.set(folderPath, { folder: f!, bookmarks: [] })
    }
    folderMap.get(folderPath)!.bookmarks.push(bm)
  }

  for (const [path, group] of folderMap) {
    lines.push('## ' + (path || '未分类'))
    lines.push('')

    for (const bm of group.bookmarks) {
      if (urlOnly) {
        lines.push(bm.url)
      } else {
        let line = '- [' + (bm.title || bm.url) + '](' + bm.url + ')'
        if (bm.isFavorite) line += ' ⭐'
        if (includeTags && bm.tags.length > 0) line += ' — ' + bm.tags.join(', ')
        lines.push(line)
        if (includeDesc && bm.description) {
          lines.push('  > ' + bm.description.replace(/\n/g, '\n  > '))
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ============================================================
// 统一导出入口：根据格式生成内容并触发下载
// ============================================================

export async function exportBookmarks(
  format: 'html' | 'csv' | 'enex' | 'md',
  bookmarks: Bookmark[],
  folders: Folder[]
): Promise<void> {
  const date = new Date().toISOString().slice(0, 10)

  switch (format) {
    case 'html': {
      const html = await exportBookmarksAsHTML()
      downloadFile(html, `meowlink-export-${date}.html`, 'text/html;charset=utf-8')
      break
    }
    case 'csv': {
      const csv = await exportBookmarksAsCSV(bookmarks, folders)
      downloadFile(csv, `meowlink-export-${date}.csv`, 'text/csv;charset=utf-8')
      break
    }
    case 'enex': {
      const enex = exportBookmarksAsENEX(bookmarks, folders)
      downloadFile(enex, `meowlink-export-${date}.enex`, 'application/xml')
      break
    }
    case 'md': {
      const md = exportBookmarksAsMarkdown(bookmarks, folders)
      downloadFile(md, `meowlink-export-${date}.txt`, 'text/plain;charset=utf-8')
      break
    }
  }
}

// ============================================================
// 导出：生成 Netscape Bookmark HTML
// ============================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function timestampToUnix(iso: string): string {
  try {
    return Math.floor(new Date(iso).getTime() / 1000).toString()
  } catch {
    return Math.floor(Date.now() / 1000).toString()
  }
}

function buildNetscapeHTML(
  folders: Folder[],
  bookmarks: Bookmark[],
  level: number = 0
): string {
  const lines: string[] = []
  const indent = '    '.repeat(level)

  for (const folder of folders) {
    const folderBookmarks = bookmarks.filter((b) => b.folderId === folder.id)
    const subFolders = (folder.children || []).filter(
      (sf) => !bookmarks.some((b) => b.folderId === sf.id) || (sf.children && sf.children.length > 0)
    )

    if (folderBookmarks.length === 0 && subFolders.length === 0 && level > 0) continue

    if (level === 0) {
      // 顶层只输出书签，不输出文件夹包装
      for (const bm of folderBookmarks) {
        lines.push(buildBookmarkEntry(bm, indent + '    '))
      }
      // 递归处理子文件夹
      if (subFolders.length > 0) {
        lines.push(buildNetscapeHTML(subFolders, bookmarks, level))
      }
    } else {
      // 嵌套文件夹
      lines.push(`${indent}<DT><H3 ADD_DATE="${folder.createdAt ? timestampToUnix(folder.createdAt) : Math.floor(Date.now() / 1000)}">${escapeHtml(folder.name)}</H3>`)
      lines.push(`${indent}<DL><p>`)
      for (const bm of folderBookmarks) {
        lines.push(buildBookmarkEntry(bm, indent + '    '))
      }
      if (subFolders.length > 0) {
        lines.push(buildNetscapeHTML(subFolders, bookmarks, level + 1))
      }
      lines.push(`${indent}</DL><p>`)
    }
  }

  // 处理不属于任何文件夹的书签
  if (level === 0) {
    const unassigned = bookmarks.filter((b) => !folders.some((f) => f.id === b.folderId))
    for (const bm of unassigned) {
      lines.push(buildBookmarkEntry(bm, '        '))
    }
  }

  return lines.join('\n')
}

function buildBookmarkEntry(bm: Bookmark, indent: string): string {
  const addDate = timestampToUnix(bm.createdAt)
  const title = escapeHtml(bm.title)
  const url = escapeHtml(bm.url)
  const tagsAttr = bm.tags.length > 0 ? ` TAGS="${escapeHtml(bm.tags.join(','))}"` : ''
  const iconAttr = bm.favicon ? ` ICON="${escapeHtml(bm.favicon)}"` : ''

  let entry = `${indent}<DT><A HREF="${url}" ADD_DATE="${addDate}"${tagsAttr}${iconAttr}>${title}</A>`

  if (bm.description) {
    entry += `\n${indent}<DD>${escapeHtml(bm.description)}`
  }

  return entry
}

/** 导出全部书签为 Netscape HTML 字符串 */
export async function exportBookmarksAsHTML(): Promise<string> {
  const { bookmarks, folders } = await storage.loadAll()

  const header = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>MeowLink Bookmarks</TITLE>',
    '<H1>MeowLink Bookmarks</H1>',
    '<DL><p>',
  ].join('\n')

  const body = buildNetscapeHTML(folders, bookmarks)
  const footer = '</DL><p>'

  return header + '\n' + body + '\n' + footer
}

/** 触发浏览器下载书签 HTML 文件 */
export function downloadBookmarksHTML(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `meowlink-bookmarks-${new Date().toISOString().slice(0, 10)}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ============================================================
// JSON 导出 / 导入
// ============================================================

export interface ExportData {
  version: number
  exportedAt: string
  bookmarks: Bookmark[]
  folders: Folder[]
  tags: { id: string; name: string; color: string }[]
}

/** 导出全部数据为 JSON 字符串 */
export async function exportBookmarksAsJSON(): Promise<string> {
  const { bookmarks, folders } = await storage.loadAll()
  const tags = await storage.getTags()
  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    bookmarks: bookmarks.filter((b) => !b.isDeleted),
    folders,
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color || '#888888' })),
  }
  return JSON.stringify(data, null, 2)
}

/** 触发浏览器下载 JSON 备份文件 */
export function downloadBookmarksJSON(json: string): void {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `meowlink-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 从 JSON 字符串导入数据（合并模式：跳过已有 ID 的数据） */
export async function importBookmarksFromJSON(json: string): Promise<number> {
  const parsed = JSON.parse(json) as ExportData

  if (!parsed.bookmarks || !Array.isArray(parsed.bookmarks)) {
    throw new Error('无效的备份文件：缺少 bookmarks 字段')
  }

  let importedCount = 0

  // 导入文件夹
  const folderIdMap = new Map<string, string>()
  if (parsed.folders && Array.isArray(parsed.folders)) {
    for (const folder of parsed.folders) {
      const existing = await db.folders.get(folder.id)
      if (existing) {
        folderIdMap.set(folder.id, folder.id)
        continue
      }
      try {
        await db.folders.put(folder)
        folderIdMap.set(folder.id, folder.id)
      } catch {
        // 跳过
      }
    }
  }

  // 导入标签
  if (parsed.tags && Array.isArray(parsed.tags)) {
    for (const tag of parsed.tags) {
      const existing = await db.tags.get(tag.id)
      if (!existing) {
        try {
          await db.tags.put(tag)
        } catch {
          // 跳过
        }
      }
    }
  }

  // 导入书签
  for (const bm of parsed.bookmarks) {
    try {
      const existing = await db.bookmarks.get(bm.id)
      if (existing) continue
      await db.bookmarks.put({ ...bm, isDeleted: false })
    } catch {
      // 跳过
    }
    importedCount++
  }

  await storage.refreshSearchIndex()
  return importedCount
}
