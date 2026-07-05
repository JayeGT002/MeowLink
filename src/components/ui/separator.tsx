import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  (
    { className, orientation = "horizontal", decorative = true, ...props },
    ref
  ) => {
    const ariaProps = decorative ? { "aria-hidden": true } : {}

    return (
      <div
        className={cn(
          "shrink-0 bg-border",
          orientation === "horizontal"
            ? "h-[1px] w-full my-4"
            : "h-full w-[1px] mx-4",
          className
        )}
        ref={ref}
        {...ariaProps}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"

export { Separator }
