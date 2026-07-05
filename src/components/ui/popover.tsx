'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const MOBILE_BREAKPOINT = 768

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

function usePopover() {
  const ctx = React.useContext(PopoverContext)
  if (!ctx) throw new Error('Popover components must be used within <Popover>')
  return ctx
}

// ============================================================
// Popover
// ============================================================
interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (v: boolean) => {
      if (!isControlled) setUncontrolledOpen(v)
      onOpenChange?.(v)
    },
    [isControlled, onOpenChange]
  )

  const triggerRef = React.useRef<HTMLDivElement>(null!)

  // 点击外部关闭
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return
      const popoverContent = document.querySelector('[data-popover-content]')
      if (popoverContent?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, setOpen])

  return (
    <PopoverContext.Provider value={{ open, setOpen, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  )
}

// ============================================================
// PopoverTrigger
// ============================================================
interface PopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const { triggerRef, setOpen, open } = usePopover()

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        (children as React.ReactElement<any>).props.onClick?.(e)
        if (!e.defaultPrevented) {
          setOpen(!open)
        }
      },
    })
  }

  return (
    <div
      ref={triggerRef}
      onClick={(e) => {
        e.stopPropagation()
        setOpen(!open)
      }}
      className="inline-flex"
    >
      {children}
    </div>
  )
}

// ============================================================
// PopoverContent
// ============================================================
interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  sideOffset?: number
}

function PopoverContent({
  children,
  className,
  align = 'center',
  side = 'bottom',
  sideOffset = 4,
}: PopoverContentProps) {
  const { open, setOpen, triggerRef } = usePopover()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const isMobile = useIsMobile()

  // ── 桌面端位置计算（fixed 定位，viewport-relative） ──
  React.useEffect(() => {
    if (!open || isMobile || !triggerRef.current || !contentRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const contentRect = contentRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let resolvedSide: 'top' | 'bottom' | 'left' | 'right' = 'bottom'
    let top = 0
    let left = 0

    // ── 自动选择方向 ──
    if (side === 'auto' || side === 'left' || side === 'right') {
      const fitsRight = triggerRect.right + sideOffset + contentRect.width <= vw - 4
      const fitsLeft = triggerRect.left - sideOffset - contentRect.width >= 4
      const preferRight = side === 'right' || (side === 'auto' && fitsRight)

      if (preferRight && fitsRight) {
        resolvedSide = 'right'
      } else if (side === 'left' || fitsLeft) {
        resolvedSide = 'left'
      } else {
        // fallback to bottom
        resolvedSide = 'bottom'
      }
    } else {
      resolvedSide = side
    }

    switch (resolvedSide) {
      case 'bottom':
        top = triggerRect.bottom + sideOffset
        break
      case 'top':
        top = triggerRect.top - contentRect.height - sideOffset
        break
      case 'left':
        left = triggerRect.left - contentRect.width - sideOffset
        top = triggerRect.top
        break
      case 'right':
        left = triggerRect.right + sideOffset
        top = triggerRect.top
        break
    }

    if (resolvedSide === 'bottom' || resolvedSide === 'top') {
      switch (align) {
        case 'start':
          left = triggerRect.left
          break
        case 'center':
          left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2
          break
        case 'end':
          left = triggerRect.right - contentRect.width
          break
      }
    } else {
      switch (align) {
        case 'start':
          break
        case 'center':
          top = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2
          break
        case 'end':
          top = triggerRect.bottom - contentRect.height
          break
      }
    }

    // 边界修正（viewport 坐标，fixed 定位直接用）
    left = Math.max(4, Math.min(left, vw - contentRect.width - 4))
    top = Math.max(4, Math.min(top, vh - contentRect.height - 4))

    setPosition({ top, left })
  }, [open, isMobile, align, side, sideOffset])

  // ── 移动端：body 滚动锁定 ──
  React.useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  if (typeof window === 'undefined') return null

  // ===========================================================
  // 移动端：底部半屏面板（图标选择器等）
  // ===========================================================
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[9998] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={contentRef}
              data-popover-content
              className={cn(
                '!fixed !inset-x-0 !bottom-0 !z-[9999] !w-full !rounded-t-2xl !bg-popover overflow-hidden',
                className
              )}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* 拖拽手柄 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )
  }

  // ===========================================================
  // 桌面端：浮动 Popover（fixed 定位，viewport 坐标）
  // ===========================================================
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          data-popover-content
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 50,
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
          className={cn(
            'rounded-xl border border-border/40 bg-popover text-popover-foreground shadow-float',
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export { Popover, PopoverTrigger, PopoverContent }
