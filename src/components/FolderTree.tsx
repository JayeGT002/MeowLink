import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { storage } from '@/lib/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  FolderPlus,
  Pencil,
  Trash2,
  Palette,
  Pin,
  PinOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { getIconComponent } from '@/lib/folder-icons'
import IconPicker from '@/components/IconPicker'
import type { Folder as FolderType } from '@/lib/types'

const SPECIAL_FOLDER_IDS = ['folder-root', 'folder-unsorted', 'folder-favorites', 'folder-trash']

interface SpecialFolderConfig {
  id: string
  name: string
  iconName: string
}

const specialFolderConfigs: SpecialFolderConfig[] = [
  { id: 'folder-root', name: '全部书签', iconName: 'Inbox' },
  { id: 'folder-unsorted', name: '未分类', iconName: 'InboxOut' },
  { id: 'folder-favorites', name: '收藏夹', iconName: 'Star' },
]

const ROW_BASE_CLASS = 'group flex items-center gap-2 pr-3 py-1.5 rounded-lg cursor-pointer text-sm transition-all duration-150'

function rowPaddingLeft(depth: number) {
  return { paddingLeft: `calc(0.75rem + ${depth} * 0.75rem)` }
}

function rowSelectedClass(isSelected: boolean) {
  return isSelected
    ? 'bg-accent text-sidebar-accent-foreground'
    : 'text-sidebar-foreground/80 hover:bg-accent hover:text-sidebar-foreground'
}

function collectDescendantIds(folderId: string, allFolders: FolderType[]): Set<string> {
  const ids = new Set<string>([folderId])
  const stack = [folderId]
  while (stack.length > 0) {
    const currentId = stack.pop()!
    for (const f of allFolders) {
      if (f.parentId === currentId) {
        ids.add(f.id)
        stack.push(f.id)
      }
    }
  }
  for (const f of allFolders) {
    if (f.children) {
      for (const child of f.children) {
        if (ids.has(f.id)) ids.add(child.id)
      }
    }
  }
  return ids
}

function FolderIcon({ iconName }: { iconName?: string }) {
  const name = iconName || 'FolderOpen'
  const IconComp = getIconComponent(name)
  if (!IconComp) {
    const Fallback = getIconComponent('FolderOpen')
    return Fallback ? <Fallback theme="outline" size={16} fill="currentColor" /> : null
  }
  return <IconComp theme="outline" size={16} fill="currentColor" />
}

function RowArrow({ hasChildren, isExpanded, onToggle }: {
  hasChildren: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  if (!hasChildren) return <span className="w-4 shrink-0" />
  return (
    <button
      type="button"
      className="h-4 w-4 shrink-0 inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => { e.stopPropagation(); onToggle() }}
    >
      {isExpanded
        ? <ChevronDown className="h-3.5 w-3.5" />
        : <ChevronRight className="h-3.5 w-3.5" />
      }
    </button>
  )
}

function IconSlot({ children }: { children: React.ReactNode }) {
  return (
    <span className="h-4 w-4 shrink-0 inline-flex items-center justify-center text-sidebar-foreground/60">
      {children}
    </span>
  )
}

interface FolderTreeItemProps {
  folder: FolderType
  depth: number
  bookmarkCount: number
  hasChildren: boolean
  isExpanded: boolean
  isSelected: boolean
  isSpecial?: boolean
  specialIconName?: string
  onToggleExpand: () => void
  onSelect: () => void
}

function FolderTreeItem({
  folder,
  depth,
  bookmarkCount,
  hasChildren,
  isExpanded,
  isSelected,
  isSpecial,
  specialIconName,
  onToggleExpand,
  onSelect,
}: FolderTreeItemProps) {
  const { renameFolder, deleteFolder, addFolder, updateFolderIcon, pinFolder, unpinFolder } = useStore()
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(folder.name)
  const [addingSub, setAddingSub] = useState(false)
  const [newSubName, setNewSubName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const addSubInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renaming])

  useEffect(() => {
    if (addingSub && addSubInputRef.current) addSubInputRef.current.focus()
  }, [addingSub])

  const handleStartRename = useCallback(() => {
    setRenameValue(folder.name)
    setRenaming(true)
  }, [folder.name])

  const handleSubmitRename = useCallback(() => {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== folder.name) renameFolder(folder.id, trimmed)
    setRenaming(false)
  }, [renameValue, folder.name, folder.id, renameFolder])

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmitRename()
      else if (e.key === 'Escape') { setRenaming(false); setRenameValue(folder.name) }
    },
    [handleSubmitRename, folder.name]
  )

  const handleDelete = useCallback(() => {
    deleteFolder(folder.id)
  }, [folder.id, deleteFolder])

  const handleStartAddSub = useCallback(() => {
    setNewSubName('')
    setAddingSub(true)
  }, [])

  const handleSubmitAddSub = useCallback(() => {
    const trimmed = newSubName.trim()
    if (trimmed) addFolder(trimmed, folder.id)
    setAddingSub(false)
    setNewSubName('')
  }, [newSubName, folder.id, addFolder])

  const handleAddSubKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmitAddSub()
      else if (e.key === 'Escape') { setAddingSub(false); setNewSubName('') }
    },
    [handleSubmitAddSub]
  )

  const handleIconChange = useCallback(
    (iconName: string) => updateFolderIcon(folder.id, iconName),
    [folder.id, updateFolderIcon]
  )

  const handleTogglePin = useCallback(() => {
    if (folder.pinned) unpinFolder(folder.id)
    else pinFolder(folder.id)
  }, [folder.id, folder.pinned, pinFolder, unpinFolder])

  const currentIconName = isSpecial ? specialIconName : (folder.icon || undefined)

  return (
    <>
      <div
        className={cn(ROW_BASE_CLASS, rowSelectedClass(isSelected))}
        style={rowPaddingLeft(depth)}
        onClick={onSelect}
      >
        <RowArrow hasChildren={hasChildren} isExpanded={isExpanded} onToggle={onToggleExpand} />

        <IconSlot>
          <FolderIcon iconName={currentIconName} />
        </IconSlot>

        {renaming ? (
          <Input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleSubmitRename}
            onKeyDown={handleRenameKeyDown}
            className="h-6 py-0 px-1 text-xs min-w-0 flex-1 rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate flex-1 min-w-0">{folder.name}</span>
        )}

        {bookmarkCount > 0 && (
          <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0 tabular-nums">
            {bookmarkCount}
          </span>
        )}

        {!renaming && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem onClick={handleStartRename}>
                <span className="flex items-center gap-2">
                  <Pencil className="h-3.5 w-3.5" />编辑
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartAddSub}>
                <span className="flex items-center gap-2">
                  <FolderPlus className="h-3.5 w-3.5" />建立子文件夹
                </span>
              </DropdownMenuItem>
              {!isSpecial && (
                <DropdownMenuItem onClick={handleTogglePin}>
                  <span className="flex items-center gap-2">
                    {folder.pinned ? (
                      <><PinOff className="h-3.5 w-3.5" />取消置顶</>
                    ) : (
                      <><Pin className="h-3.5 w-3.5" />置顶</>
                    )}
                  </span>
                </DropdownMenuItem>
              )}
              {!isSpecial && (
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <IconPicker currentIcon={folder.icon} onSelect={handleIconChange}>
                    <span className="flex items-center gap-2 w-full">
                      <Palette className="h-3.5 w-3.5" />更换图标
                    </span>
                  </IconPicker>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <span className="flex items-center gap-2">
                  <Trash2 className="h-3.5 w-3.5" />删除
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {addingSub && (
        <div className={cn(ROW_BASE_CLASS, 'cursor-default')} style={rowPaddingLeft(depth + 1)}>
          <span className="w-4 shrink-0" />
          <IconSlot>
            <FolderIcon iconName="FolderOpen" />
          </IconSlot>
          <Input
            ref={addSubInputRef}
            value={newSubName}
            onChange={(e) => setNewSubName(e.target.value)}
            onBlur={handleSubmitAddSub}
            onKeyDown={handleAddSubKeyDown}
            placeholder="新文件夹名称..."
            className="h-6 py-0 px-1 text-xs flex-1 rounded-md"
          />
        </div>
      )}
    </>
  )
}

function Separator() {
  return (
    <li className="px-3 py-1.5">
      <div className="border-t border-sidebar-border/60 my-0.5" />
    </li>
  )
}

interface FolderTreeProps {
  folders?: FolderType[]
  depth?: number
}

export default function FolderTree({ folders: propFolders, depth = 0 }: FolderTreeProps) {
  const {
    folders: allFolders,
    bookmarks,
    selectedFolderId,
    setSelectedFolderId,
    addFolder,
  } = useStore()

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isAddingRoot, setIsAddingRoot] = useState(false)
  const [newRootFolderName, setNewRootFolderName] = useState('')
  const addRootInputRef = useRef<HTMLInputElement>(null)
  const [deletedCount, setDeletedCount] = useState(0)

  const isTopLevel = propFolders === undefined

  useEffect(() => {
    if (!isTopLevel) return
    storage.getDeletedBookmarks().then((list) => setDeletedCount(list.length))
  }, [isTopLevel, bookmarks])

  useEffect(() => {
    if (!isTopLevel) return
    const toAutoExpand = allFolders.filter(
      (f) => f.parentId === null &&
        !SPECIAL_FOLDER_IDS.includes(f.id) &&
        (f.children && f.children.length > 0 || allFolders.some((cf) => cf.parentId === f.id))
    )
    if (toAutoExpand.length > 0) {
      setExpandedFolders((prev) => {
        const next = new Set(prev)
        for (const f of toAutoExpand) next.add(f.id)
        return next
      })
    }
  }, [])

  useEffect(() => {
    if (isAddingRoot && addRootInputRef.current) addRootInputRef.current.focus()
  }, [isAddingRoot])

  const getChildren = useCallback(
    (folder: FolderType): FolderType[] => {
      if (folder.children && folder.children.length > 0) return folder.children
      return allFolders.filter((f) => f.parentId === folder.id)
    },
    [allFolders]
  )

  const getBookmarkCount = useCallback(
    (folderId: string): number => {
      if (folderId === 'folder-root') return bookmarks.length
      if (folderId === 'folder-favorites') return bookmarks.filter((b) => b.isFavorite).length
      const descendantIds = collectDescendantIds(folderId, allFolders)
      return bookmarks.filter((b) => descendantIds.has(b.folderId)).length
    },
    [bookmarks, allFolders]
  )

  const toggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const handleSelect = useCallback(
    (folderId: string) => setSelectedFolderId(folderId),
    [setSelectedFolderId]
  )

  const handleSubmitRootFolder = useCallback(() => {
    const trimmed = newRootFolderName.trim()
    if (trimmed) addFolder(trimmed, null)
    setIsAddingRoot(false)
    setNewRootFolderName('')
  }, [newRootFolderName, addFolder])

  const handleRootFolderKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmitRootFolder()
      else if (e.key === 'Escape') { setIsAddingRoot(false); setNewRootFolderName('') }
    },
    [handleSubmitRootFolder]
  )

  const renderFolderItem = useCallback(
    (folder: FolderType, itemDepth: number) => {
      const childrenFolders = getChildren(folder)
      const hasChildren = childrenFolders.length > 0
      const isExpanded = expandedFolders.has(folder.id)
      const isSelected = selectedFolderId === folder.id
      const count = getBookmarkCount(folder.id)

      return (
        <li key={folder.id} className="list-none">
          <FolderTreeItem
            folder={folder}
            depth={itemDepth}
            bookmarkCount={count}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggleExpand={() => toggleExpand(folder.id)}
            onSelect={() => handleSelect(folder.id)}
          />
          {hasChildren && (
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <FolderTree folders={childrenFolders} depth={itemDepth + 1} />
                </motion.ul>
              )}
            </AnimatePresence>
          )}
        </li>
      )
    },
    [getChildren, expandedFolders, selectedFolderId, getBookmarkCount, toggleExpand, handleSelect]
  )

  if (isTopLevel) {
    const regularTopFolders = allFolders.filter(
      (f) => f.parentId === null && !SPECIAL_FOLDER_IDS.includes(f.id)
    )
    const isTrashSelected = selectedFolderId === 'folder-trash'
    const hasRegularBeforeTrash = regularTopFolders.length > 0

    return (
      <div className="flex flex-col">
        <ul className="flex flex-col gap-0.5">
          {specialFolderConfigs.map((config) => {
            const folderData = allFolders.find((f) => f.id === config.id)
            if (!folderData) return null
            const count = getBookmarkCount(config.id)
            const isSelected = selectedFolderId === config.id
            return (
              <li key={config.id}>
                <FolderTreeItem
                  folder={folderData}
                  depth={0}
                  bookmarkCount={count}
                  hasChildren={false}
                  isExpanded={false}
                  isSelected={isSelected}
                  isSpecial
                  specialIconName={config.iconName}
                  onToggleExpand={() => {}}
                  onSelect={() => handleSelect(config.id)}
                />
              </li>
            )
          })}

          {hasRegularBeforeTrash && <Separator />}

          {regularTopFolders.map((folder) => renderFolderItem(folder, 0))}

          {regularTopFolders.length > 0 && <Separator />}
        </ul>

        {/* 新建收藏夹 */}
        {isAddingRoot ? (
          <div className={cn(ROW_BASE_CLASS, 'cursor-default')}>
            <span className="w-4 shrink-0" />
            <IconSlot>
              <FolderIcon iconName="FolderOpen" />
            </IconSlot>
            <Input
              ref={addRootInputRef}
              value={newRootFolderName}
              onChange={(e) => setNewRootFolderName(e.target.value)}
              onBlur={handleSubmitRootFolder}
              onKeyDown={handleRootFolderKeyDown}
              placeholder="新文件夹名称..."
              className="h-6 py-0 px-1 text-xs flex-1 rounded-md"
            />
          </div>
        ) : (
          <div
            className={cn(ROW_BASE_CLASS, 'text-sidebar-foreground/60 hover:bg-accent hover:text-sidebar-foreground')}
            style={rowPaddingLeft(0)}
            onClick={() => {
              setIsAddingRoot(true)
              setNewRootFolderName('')
            }}
          >
            <span className="w-4 shrink-0" />
            <IconSlot>
              <Plus className="h-3.5 w-3.5" />
            </IconSlot>
            <span className="truncate flex-1 min-w-0">新建收藏夹</span>
          </div>
        )}

        {/* 回收站 */}
        <div className="px-2 mt-1.5">
          <div className="border-t border-sidebar-border/60 mb-1.5" />
          <div
            className={cn(ROW_BASE_CLASS, rowSelectedClass(isTrashSelected))}
            style={rowPaddingLeft(0)}
            onClick={() => handleSelect('folder-trash')}
          >
            <span className="w-4 shrink-0" />
            <IconSlot>
              <Trash2 className="h-3.5 w-3.5" />
            </IconSlot>
            <span className="truncate flex-1 min-w-0">回收站</span>
            {deletedCount > 0 && (
              <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0 tabular-nums">
                {deletedCount}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!propFolders || propFolders.length === 0) return null

  return (
    <ul className="flex flex-col gap-0.5">
      {propFolders.map((folder) => renderFolderItem(folder, depth))}
    </ul>
  )
}
