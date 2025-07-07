"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

export interface DatePickerProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="mb-1 block text-xs text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type="date"
            className={cn(
              "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "[&::-webkit-calendar-picker-indicator]:bg-transparent [&::-webkit-calendar-picker-indicator]:cursor-pointer",
              className
            )}
            ref={ref}
            {...props}
          />
          <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker } 