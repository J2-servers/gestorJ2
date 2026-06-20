// @ts-nocheck
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, style, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-[min(18rem,calc(100vw-24px))] rounded-2xl border-0 bg-[var(--j2-surface)] p-4 text-[var(--j2-text)] shadow-[var(--j2-neu)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      style={{
        background: "var(--j2-surface, rgba(6, 7, 7, .96))",
        color: "var(--j2-text, #fff8f2)",
        border: 0,
        boxShadow: "var(--j2-neu, 8px 10px 22px rgba(0,0,0,.44), -4px -4px 12px rgba(255,255,255,.016), inset 1px 1px 0 rgba(255,255,255,.014))",
        ...style,
      }}
      {...props} />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
