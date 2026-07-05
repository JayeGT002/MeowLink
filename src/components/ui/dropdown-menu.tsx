import * as React from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

const MOBILE_BREAKPOINT = 768

// ──────────────────────────────────────────────
// useIsMobile — 响应式检测
// ──────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.innerWidth < MOBILE_BREAKPOINT
  })
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])
  return isMobile
}

// ──────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────
interface DropdownMenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | undefined>(undefined)

function useDropdownMenuContext() {
  const ctx = React.useContext(DropdownMenuContext)
  if (!ctx) {
    throw new Error("DropdownMenu components must be used within <DropdownMenu>")
  }
  return ctx
}

// ──────────────────────────────────────────────
// DropdownMenu
// ──────────────────────────────────────────────
interface DropdownMenuProps {
  children: React.ReactNode
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const value = React.useMemo(() => ({ open, setOpen, triggerRef }), [open, setOpen])

  return (
    <DropdownMenuContext.Provider value={value}>
      {children}
    </DropdownMenuContext.Provider>
  )
}

// ──────────────────────────────────────────────
// DropdownMenuTrigger
// ──────────────────────────────────────────────
interface DropdownMenuTriggerProps {
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

export function DropdownMenuTrigger({ children, className, asChild }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setOpen(!open)
    },
    [open, setOpen]
  )

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: triggerRef,
      onClick: (e: React.MouseEvent) => {
        ;(children as React.ReactElement<any>).props.onClick?.(e)
        if (!e.defaultPrevented) handleClick(e)
      },
    })
  }

  return (
    <div
      ref={triggerRef as React.Ref<HTMLDivElement>}
      className={cn("inline-flex", className)}
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────
// DropdownMenuContent
// ──────────────────────────────────────────────
interface DropdownMenuContentProps {
  children: React.ReactNode
  className?: string
  align?: "start" | "center" | "end"
}

export function DropdownMenuContent({
  children,
  className,
  align = "center",
}: DropdownMenuContentProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)
  const isMobile = useIsMobile()

  // ── 桌面端位置计算 ──
  React.useEffect(() => {
    if (!open || isMobile) return
    // 下一帧获取 layout
    requestAnimationFrame(() => {
      if (!triggerRef.current || !contentRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()

      let left = triggerRect.left + window.scrollX
      if (align === "center") {
        left = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2 + window.scrollX
      } else if (align === "end") {
        left = triggerRect.right - contentRect.width + window.scrollX
      }

      let top = triggerRect.bottom + 4 + window.scrollY

      // 边界修正
      left = Math.max(4, Math.min(left, window.innerWidth - contentRect.width - 4))
      top = Math.max(4, Math.min(top, window.innerHeight - contentRect.height - 4))

      setPosition({ top, left })
    })
  }, [open, isMobile, align])

  // ── Esc 关闭 ──
  React.useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, setOpen])

  // ── 点击外部关闭（桌面端 + 移动端遮罩） ──
  React.useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (contentRef.current && contentRef.current.contains(e.target as Node)) return
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open, setOpen])

  // ── 移动端：body 滚动锁定 ──
  React.useEffect(() => {
    if (!open || !isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open, isMobile])

  if (typeof document === "undefined") return null

  // ===========================================================
  // 移动端：底部操作面板
  // ===========================================================
  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <motion.div
              className="fixed inset-0 z-[9998] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            {/* 底部面板 — 忽略外部宽度类名，强制全宽 */}
            <motion.div
              ref={contentRef}
              className={cn(
                  "!fixed !inset-x-0 !bottom-0 !z-[9999] !w-full !rounded-t-2xl !bg-popover overflow-hidden",
                  className
                )}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
            >
              {/* 拖拽手柄 */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="pb-safe">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )
  }

  // ===========================================================
  // 桌面端：浮动下拉
  // ===========================================================
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={contentRef}
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/40 bg-popover p-1 text-popover-foreground shadow-float",
            className
          )}
          style={{
            position: "absolute",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ──────────────────────────────────────────────
// DropdownMenuItem
// ──────────────────────────────────────────────
interface DropdownMenuItemProps extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean
}

export function DropdownMenuItem({
  className,
  inset,
  ...props
}: DropdownMenuItemProps) {
  const isMobile = useIsMobile()

  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isMobile
          ? "px-4 py-3.5 text-base"    // 移动端大点击区域
          : "px-2 py-1.5 text-sm",      // 桌面端紧凑
        inset && "pl-8",
        className
      )}
      {...props}
    />
  )
}

// ──────────────────────────────────────────────
// DropdownMenuSeparator
// ──────────────────────────────────────────────
interface DropdownMenuSeparatorProps {
  className?: string
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return (
    <div className={cn("h-[1px] my-1 bg-muted", className)} />
  )
}

// ──────────────────────────────────────────────
// DropdownMenuLabel
// ──────────────────────────────────────────────
interface DropdownMenuLabelProps {
  children: React.ReactNode
  className?: string
  inset?: boolean
}

export function DropdownMenuLabel({
  children,
  className,
  inset,
}: DropdownMenuLabelProps) {
  return (
    <div
      className={cn(
        "px-2 py-1.5 text-sm font-semibold",
        inset && "pl-8",
        className
      )}
    >
      {children}
    </div>
  )
}
