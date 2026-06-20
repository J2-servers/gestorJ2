// @ts-nocheck
"use client";
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    (<Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-0 group-[.toaster]:bg-[var(--j2-surface)] group-[.toaster]:text-[var(--j2-text)] group-[.toaster]:shadow-[var(--j2-neu)]",
          description: "group-[.toast]:text-[var(--j2-muted)]",
          actionButton:
            "group-[.toast]:border-0 group-[.toast]:bg-gradient-to-br group-[.toast]:from-[#ff4b12] group-[.toast]:to-[#8f1608] group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:border-0 group-[.toast]:bg-[var(--j2-surface-2)] group-[.toast]:text-[var(--j2-muted)]",
        },
      }}
      {...props} />)
  );
}

export { Toaster }
