import React, { useState, useRef, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
}

export function TagInput({ tags, onChange, suggestions, placeholder = '添加标签...' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtered suggestions: exclude already-selected tags, match input (case-insensitive)
  const filteredSuggestions = React.useMemo(() => {
    if (!inputValue.trim()) return []
    const lower = inputValue.toLowerCase()
    return suggestions
      .filter((s) => !tags.includes(s) && s.toLowerCase().includes(lower))
      .slice(0, 8)
  }, [inputValue, suggestions, tags])

  // Open/close dropdown based on matching suggestions
  useEffect(() => {
    if (filteredSuggestions.length > 0 && inputValue.trim()) {
      setDropdownOpen(true)
      setActiveIndex(-1)
    } else {
      setDropdownOpen(false)
    }
  }, [filteredSuggestions, inputValue])

  const addTag = useCallback(
    (tag: string) => {
      const trimmed = tag.trim()
      if (!trimmed) return
      if (tags.includes(trimmed)) {
        setInputValue('')
        setDropdownOpen(false)
        inputRef.current?.focus()
        return
      }
      onChange([...tags, trimmed])
      setInputValue('')
      setDropdownOpen(false)
      // Keep focus on input
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [tags, onChange]
  )

  const removeTag = useCallback(
    (index: number) => {
      const next = tags.filter((_, i) => i !== index)
      onChange(next)
      requestAnimationFrame(() => inputRef.current?.focus())
    },
    [tags, onChange]
  )

  const removeLastTag = useCallback(() => {
    if (tags.length === 0) return
    onChange(tags.slice(0, -1))
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [tags, onChange])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (dropdownOpen && activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        // Select active suggestion
        addTag(filteredSuggestions[activeIndex])
      } else {
        // Add raw input as new tag
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && inputValue === '') {
      removeLastTag()
    } else if (e.key === 'Escape') {
      setDropdownOpen(false)
      setActiveIndex(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1))
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Highlight matching part of suggestion text
  const highlightMatch = (text: string) => {
    if (!inputValue.trim()) return text
    const lowerText = text.toLowerCase()
    const lowerInput = inputValue.toLowerCase()
    const idx = lowerText.indexOf(lowerInput)
    if (idx === -1) return text

    const before = text.slice(0, idx)
    const match = text.slice(idx, idx + inputValue.length)
    const after = text.slice(idx + inputValue.length)
    return (
      <>
        {before}
        <span className="font-semibold text-foreground">{match}</span>
        {after}
      </>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2',
          'min-h-10 cursor-text',
          'focus-within:border-foreground/30 focus-within:bg-muted'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs select-none border border-solid border-border bg-muted/40"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(index)
              }}
              className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
              aria-label={`移除标签 ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (filteredSuggestions.length > 0) {
              setDropdownOpen(true)
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className={cn(
            'flex-1 min-w-[120px] border-0 outline-none bg-transparent text-sm',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-0'
          )}
        />
      </div>

      {/* Autocomplete dropdown */}
      {dropdownOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border/40 bg-popover shadow-float">
          <div className="max-h-48 overflow-auto py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'w-full px-3 py-1.5 text-left text-sm transition-colors',
                  index === activeIndex
                    ? 'bg-muted/50 text-foreground'
                    : 'hover:bg-muted/30'
                )}
              >
                {highlightMatch(suggestion)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
