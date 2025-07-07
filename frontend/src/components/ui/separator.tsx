import * as React from "react"
import { cn } from "@/lib/utils"

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical"
  className?: string
}

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & SeparatorProps
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className
    )}
    {...props}
  />
))
Separator.displayName = "Separator"

export { Separator } 