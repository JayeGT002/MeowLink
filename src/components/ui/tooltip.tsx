import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface TooltipContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLDivElement | null>
}

const TooltipContext = React.createContext<TooltipContextValue | undefined>(undefined)

function useTooltipContext() {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) {
    throw new Error("Tooltip components must be used within <Tooltip>")
  }
  return ctx
}

interface TooltipProps {
  children: React.ReactNode
}

export function Tooltip({ children }: TooltipProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const value = React.useMemo(() => ({ open, setOpen, triggerRef }), [open, setOpen])

  return (
    <TooltipContext.Provider value={value}>
      {children}
    </TooltipContext.Provider>
  )
}

interface TooltipTriggerProps {
  children: React.ReactNode
  className?: string
}

export function TooltipTrigger({ children, className }: TooltipTriggerProps) {
  const { setOpen, triggerRef } = useTooltipContext()
  const showTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    showTimerRef.current = setTimeout(() => {
      setOpen(true)
    }, 300)
  }

  const handleMouseLeave = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    setOpen(false)
  }

  React.useEffect(() => {
    return () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={triggerRef as React.Ref<HTMLDivElement>}
      className={cn("inline-flex", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
}

export function TooltipContent({ children, className }: TooltipContentProps) {
  const { open, triggerRef } = useTooltipContext()
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null)

  React.useEffect(() => {
    if (open && triggerRef.current && contentRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const contentRect = contentRef.current.getBoundingClientRect()
      setPosition({
        top: triggerRect.top - contentRect.height - 8 + window.scrollY,
        left: triggerRect.left + triggerRect.width / 2 - contentRect.width / 2 + window.scrollX,
      })
    }
  }, [open, triggerRef])

  return (
    <AnimatePresence>
      {open && position && (
        <motion.div
          ref={contentRef}
          className={cn(
            "z-50 overflow-hidden rounded-md border border-border/40 bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-float",
            className
          )}
          style={{
            position: "absolute",
            top: position.top,
            left: position.left,
          }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
