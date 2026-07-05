import * as React from "react"
import { cn } from "@/lib/utils"

export interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className={cn("relative overflow-hidden", className)} {...props}>
        <div
          ref={ref}
          className="h-full w-full rounded-[inherit] overflow-auto"
        >
          {children}
        </div>
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

export { ScrollArea }
