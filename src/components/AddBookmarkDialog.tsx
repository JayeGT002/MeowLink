import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Link2,
  ChevronRight,
  ClipboardPaste,
  X,
  ChevronDown,
  Plus,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { generateAiTags } from '@/lib/AiTagService'
import { getIconComponent } from '@/lib/folder-icons'
import type { Folder as FolderType, TagSource } from '@/lib/types'

// Flatten nested folders into a single list with depth info
function flattenFolders(folders: FolderType[]): Array<FolderType & { depth: number }> {
  const result: Array<FolderType & { depth: number }> = []

  function walk(list: FolderType[], depth: number) {
    for (const folder of list) {
      result.push({ ...folder, depth })
      if (folder.children && folder.children.length > 0) {
        walk(folder.children, depth + 1)
      }
    }
  }

  walk(folders, 0)
  return result
}

// Default form values
function defaultForm() {
  return {
    url: '',
    title: '',
    description: '',
    coverImage: '',
    selectedFolderId: 'folder-unsorted',
    selectedTags: [] as string[],
  }
}

/** Compare two string arrays for content equality (order-insensitive) */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sA = [...a].sort()
  const sB = [...b].sort()
  return sA.every((v, i) => v === sB[i])
}

export function AddBookmarkDialog() {
  const store = useStore()
  const {
    isAddDialogOpen,
    editBookmark,
    folders,
    tags,
    addBookmark,
    updateBookmark,
    closeAddDialog,
    isQuickAdd,
    autoTagEnabled,
  } = store

  const [form, setForm] = useState(defaultForm)
  const [hasFilledFromEdit, setHasFilledFromEdit] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // AI tag state
  const [aiGeneratedTags, setAiGeneratedTags] = useState<string[]>([])
  const [tagSectionExpanded, setTagSectionExpanded] = useState(false)
  const [isGeneratingAiTags, setIsGeneratingAiTags] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')
  const newTagInputRef = useRef<HTMLInputElement>(null)
  const lastAiTagUrlRef = useRef<string>('')

  const flatFolders = useMemo(() => flattenFolders(folders), [folders])
  const tagSuggestions = useMemo(() => tags.map((t) => t.name), [tags])

  const isEditMode = editBookmark !== null

  const defaultFolderId = useMemo(() => {
    try {
      const raw = localStorage.getItem('meowlink-settings')
      if (raw) {
        const settings = JSON.parse(raw)
        if (settings.newBookmarkFolder) return settings.newBookmarkFolder
      }
    } catch {}
    return 'folder-unsorted'
  }, [])

  // Extract domain from URL for auto-title generation
  const extractDomain = (url: string): string => {
    try {
      const hostname = new URL(url).hostname
      return hostname.replace(/^www\./, '').split('.')[0] ?? hostname
    } catch {
      return ''
    }
  }

  // Populate form when dialog opens with editBookmark
  useEffect(() => {
    if (isAddDialogOpen) {
      if (editBookmark) {
        setForm({
          url: editBookmark.url,
          title: editBookmark.title,
          description: editBookmark.description,
          coverImage: editBookmark.coverImage,
          selectedFolderId: editBookmark.folderId,
          selectedTags: editBookmark.tags,
        })
      } else {
        setForm({ ...defaultForm(), selectedFolderId: defaultFolderId })
      }
      setHasFilledFromEdit(true)
      // Reset AI tag state on open
      setAiGeneratedTags([])
      setTagSectionExpanded(!autoTagEnabled)
      lastAiTagUrlRef.current = ''
      // Focus URL input after dialog opens
      setTimeout(() => urlInputRef.current?.focus(), 100)
    } else {
      setHasFilledFromEdit(false)
    }
  }, [isAddDialogOpen, editBookmark, defaultFolderId, autoTagEnabled])

  // Reset hasFilledFromEdit when dialog is closed and reopened
  useEffect(() => {
    if (!isAddDialogOpen) {
      setHasFilledFromEdit(false)
    }
  }, [isAddDialogOpen])

  // AI tag generation when URL changes (add mode only, autoTagEnabled)
  useEffect(() => {
    // Only generate in add mode with auto-tag enabled
    if (!isAddDialogOpen || isEditMode || !autoTagEnabled) return

    const url = form.url.trim()
    if (!url || !url.match(/^https?:\/\//i)) {
      // URL not valid yet; don't clear AI tags immediately so previous ones can linger
      return
    }

    // Skip if already generated for this URL
    if (url === lastAiTagUrlRef.current) return
    lastAiTagUrlRef.current = url

    setIsGeneratingAiTags(true)
    generateAiTags(url, form.title, form.description)
      .then((aiTags) => {
        setAiGeneratedTags(aiTags)
        // Auto-apply AI tags to selectedTags (only if user hasn't manually changed them)
        setForm((prev) => {
          // If selectedTags is empty or matches previous AI tags, apply new ones
          if (prev.selectedTags.length === 0 || arraysEqual(prev.selectedTags, aiGeneratedTags)) {
            return { ...prev, selectedTags: aiTags }
          }
          return prev
        })
        setIsGeneratingAiTags(false)
      })
      .catch(() => {
        setIsGeneratingAiTags(false)
      })
  }, [isAddDialogOpen, isEditMode, autoTagEnabled, form.url, form.title, form.description])

  // Auto-generate title from URL domain when URL changes and title is empty
  const handleUrlChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, url: value }
      // Auto-title: only if title is currently empty
      if (!prev.title && value.trim()) {
        const domain = extractDomain(value.trim())
        if (domain) {
          next.title = domain.charAt(0).toUpperCase() + domain.slice(1)
        }
      }
      return next
    })
  }

  // Read URL from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        // Check if it looks like a URL
        const trimmed = text.trim()
        if (trimmed.match(/^https?:\/\//i) || trimmed.match(/^[a-zA-Z0-9][-a-zA-Z0-9]+\.[a-zA-Z]{2,}/)) {
          const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
          setForm((prev) => {
            const next = { ...prev, url }
            if (!prev.title) {
              const domain = extractDomain(url)
              if (domain) {
                next.title = domain.charAt(0).toUpperCase() + domain.slice(1)
              }
            }
            return next
          })
        } else {
          setForm((prev) => ({ ...prev, url: trimmed }))
        }
      }
    } catch {
      // Clipboard access denied or empty
    }
  }

  // Compute tagSource based on selectedTags vs aiGeneratedTags
  const computeTagSource = (): TagSource => {
    if (aiGeneratedTags.length === 0) return 'manual'
    if (arraysEqual(form.selectedTags, aiGeneratedTags)) return 'ai'
    if (form.selectedTags.length === 0) return 'manual'
    return 'mixed'
  }

  // Validate and save
  const handleSave = () => {
    const trimmedUrl = form.url.trim()
    const trimmedTitle = form.title.trim()

    if (!trimmedUrl) return // URL is required
    if (!trimmedTitle) return // Title is required

    const tagSource = computeTagSource()

    if (isEditMode && editBookmark) {
      updateBookmark(editBookmark.id, {
        url: trimmedUrl,
        title: trimmedTitle,
        description: form.description.trim(),
        coverImage: form.coverImage.trim(),
        folderId: form.selectedFolderId,
        tags: form.selectedTags,
      })
    } else {
      addBookmark({
        url: trimmedUrl,
        title: trimmedTitle,
        description: form.description.trim(),
        coverImage: form.coverImage.trim(),
        favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(trimmedUrl)}&sz=32`,
        tags: form.selectedTags,
        aiTags: aiGeneratedTags,
        tagSource,
        folderId: form.selectedFolderId,
        isFavorite: false,
      })
    }
    closeAddDialog()

    // Show toast in quick add mode with AI tags
    if (isQuickAdd && aiGeneratedTags.length > 0) {
      const tagList = aiGeneratedTags.slice(0, 5).join(', ')
      useStore.getState().addToast(`已保存，AI 识别标签: ${tagList}`, 'success')
    } else if (isQuickAdd) {
      useStore.getState().addToast('已保存', 'success')
    }
  }

  // Save and continue (add mode only)
  const handleSaveAndContinue = () => {
    const trimmedUrl = form.url.trim()
    const trimmedTitle = form.title.trim()

    if (!trimmedUrl || !trimmedTitle) return

    const tagSource = computeTagSource()

    addBookmark({
      url: trimmedUrl,
      title: trimmedTitle,
      description: form.description.trim(),
      coverImage: form.coverImage.trim(),
      favicon: `https://www.google.com/s2/favicons?domain=${extractDomain(trimmedUrl)}&sz=32`,
      tags: form.selectedTags,
      aiTags: aiGeneratedTags,
      tagSource,
      folderId: form.selectedFolderId,
      isFavorite: false,
    })

    // Reset form but keep add mode
    setForm(defaultForm())
    setAiGeneratedTags([])
    setTagSectionExpanded(!autoTagEnabled)
    lastAiTagUrlRef.current = ''
    setTimeout(() => urlInputRef.current?.focus(), 100)
  }

  // Remove a single AI tag from selectedTags
  const handleRemoveAiTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.filter((t) => t !== tag),
    }))
  }

  // Add a new tag from inline input
  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim()
    if (!trimmed) { setAddingTag(false); return }
    if (form.selectedTags.includes(trimmed)) { setNewTagInput(''); setAddingTag(false); return }
    setForm((prev) => ({ ...prev, selectedTags: [...prev.selectedTags, trimmed] }))
    setNewTagInput('')
    setAddingTag(false)
  }

  // Filtered suggestions for inline add-tag input
  const filteredNewTagSuggestions = useMemo(() => {
    if (!newTagInput.trim()) return []
    const lower = newTagInput.toLowerCase()
    return tagSuggestions
      .filter((s) => !form.selectedTags.includes(s) && s.toLowerCase().includes(lower))
      .slice(0, 6)
  }, [newTagInput, tagSuggestions, form.selectedTags])

  // New tag input keyboard handler
  const handleNewTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddNewTag()
    else if (e.key === 'Escape') { setNewTagInput(''); setAddingTag(false) }
  }

  // Keyboard shortcut: Cmd+D / Ctrl+D to open dialog in quick add mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        // Open in quick add mode
        if (!isAddDialogOpen) {
          store.openAddDialog(null, true)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isAddDialogOpen, store])

  // Determine how to render the tag section
  const renderTagSection = () => {
    // Quick add mode: hide tag section entirely
    if (isQuickAdd) return null

    // Inline add-tag button (shared)
    const addTagButton = !addingTag ? (
      <button
        type="button"
        onClick={() => {
          setAddingTag(true)
          setTimeout(() => newTagInputRef.current?.focus(), 50)
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:text-muted-foreground hover:border-muted-foreground/50 transition-colors"
      >
        <Plus className="h-3 w-3" />
        新增标签
      </button>
    ) : (
      <span className="relative inline-flex">
        <Input
          ref={newTagInputRef}
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={handleNewTagKeyDown}
          onBlur={() => {
            if (newTagInput.trim()) handleAddNewTag()
            else { setNewTagInput(''); setAddingTag(false) }
          }}
          placeholder="输入标签名"
          className="h-6 w-24 text-xs px-1.5 py-0 inline"
          autoFocus
        />
        {filteredNewTagSuggestions.length > 0 && (
          <span className="absolute top-full left-0 mt-1 z-50 w-36 rounded-md border bg-popover shadow-md py-1">
            {filteredNewTagSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setNewTagInput(s)
                  setForm((prev) => {
                    if (prev.selectedTags.includes(s)) return prev
                    return { ...prev, selectedTags: [...prev.selectedTags, s] }
                  })
                  setNewTagInput('')
                  setAddingTag(false)
                }}
                className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent transition-colors block"
              >
                {s}
              </button>
            ))}
          </span>
        )}
      </span>
    )

    // Edit mode: inline chips + add button
    if (isEditMode) {
      return (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">标签</label>
          <div className="text-sm text-muted-foreground leading-relaxed flex flex-wrap gap-1.5 items-center">
            {form.selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs cursor-pointer select-none border border-solid border-border bg-muted/40"
              >
                <span>#{tag}</span>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, selectedTags: prev.selectedTags.filter((t) => t !== tag) }))}
                  className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                  aria-label={`移除标签 ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {addTagButton}
          </div>
        </div>
      )
    }

    // Add mode with auto-tag enabled and AI tags generated
    if (autoTagEnabled && aiGeneratedTags.length > 0) {
      return (
        <div className="space-y-2">
          {tagSectionExpanded ? (
            <>
              <label className="text-xs font-medium text-muted-foreground">标签</label>
              <div className="text-sm text-muted-foreground leading-relaxed flex flex-wrap gap-1.5 items-center">
                {form.selectedTags.map((tag) => {
                  const isAiTag = aiGeneratedTags.includes(tag)
                  return (
                    <span
                      key={tag}
                      className={cn(
                        'inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs cursor-pointer select-none',
                        isAiTag
                          ? 'border border-dashed border-muted-foreground/30'
                          : 'border border-solid border-border bg-muted/40'
                      )}
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAiTag(tag)}
                        className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                        aria-label={`移除标签 ${tag}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
                {addTagButton}
              </div>
            </>
          ) : (
            <>
              <label className="text-xs font-medium text-muted-foreground">标签</label>
              <button
                type="button"
                onClick={() => setTagSectionExpanded(true)}
                className="flex items-center justify-between w-full rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-sm transition-colors hover:bg-muted/30"
              >
                <span className="text-muted-foreground">
                  已识别 {aiGeneratedTags.length} 个标签
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  展开
                  <ChevronDown className="h-3.5 w-3.5" />
                </span>
              </button>
            </>
          )}
        </div>
      )
    }

    // Auto-tag disabled or no AI tags yet: TagInput + add button
    return (
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">标签</label>
        <div className="text-sm text-muted-foreground leading-relaxed flex flex-wrap gap-1.5 items-center">
          {form.selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs cursor-pointer select-none border border-solid border-border bg-muted/40"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, selectedTags: prev.selectedTags.filter((t) => t !== tag) }))}
                className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                aria-label={`移除标签 ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {addTagButton}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isAddDialogOpen} onOpenChange={(open) => { if (!open) closeAddDialog() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? '编辑书签' : '添加书签'}</DialogTitle>
          <DialogDescription>保存网页链接到你的收藏夹</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          {/* 1. URL Input */}
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={urlInputRef}
              value={form.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://example.com"
              className="pl-10 pr-10"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={handlePasteFromClipboard}
              title="从剪贴板读取"
            >
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>

          {/* 2. Title Input */}
          <Input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="书签标题"
          />

          {/* 3. Description Textarea */}
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="添加描述..."
          />

          {/* 4. Folder Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              文件夹
            </label>
            <ScrollArea className="max-h-40 rounded-xl border border-border/40 bg-muted/20 p-1">
              {flatFolders.map((folder) => {
                const IconComp = folder.icon ? getIconComponent(folder.icon) : null
                const isSelected = form.selectedFolderId === folder.id
                const hasChildren = folder.children && folder.children.length > 0

                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, selectedFolderId: folder.id }))}
                    className={cn(
                      'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-muted/50 text-foreground'
                        : 'hover:bg-muted/30'
                    )}
                    style={{ paddingLeft: `${12 + folder.depth * 16}px` }}
                  >
                    {IconComp ? (
                      <IconComp theme="outline" size={16} fill="currentColor" />
                    ) : null}
                    <span className="flex-1 text-left truncate">{folder.name}</span>
                    {hasChildren && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
                )
              })}
            </ScrollArea>
          </div>

          {/* 5. Tag Section */}
          {renderTagSection()}

          {/* 6. Footer */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeAddDialog}>
              取消
            </Button>
            {!isEditMode && (
              <Button variant="outline" onClick={handleSaveAndContinue}>
                保存并继续
              </Button>
            )}
            <Button onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
