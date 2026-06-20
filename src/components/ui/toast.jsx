// @ts-nocheck
import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed bottom-3 left-3 right-3 z-[100] flex max-h-screen flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-[420px]"
    {...props}
  />
));
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed bottom-3 left-3 right-3 z-[100] flex max-h-screen flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-[420px]"
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-2xl border-0 p-4 pr-10 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "bg-[var(--j2-surface)] text-[var(--j2-text)] shadow-[var(--j2-neu)]",
        destructive:
          "destructive group bg-[rgba(127,29,29,.94)] text-[#fff8f2] shadow-[var(--j2-neu)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Toast = React.forwardRef(({ className, variant, open = true, onOpenChange, ...props }, ref) => {
  void onOpenChange;
  return (
    <div
      ref={ref}
      data-state={open ? "open" : "closed"}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
});
Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border-0 bg-[var(--j2-surface-2)] px-3 text-sm font-bold text-[var(--j2-accent)] shadow-[var(--j2-neu-soft)] transition-colors hover:brightness-110 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-xl p-1 text-[var(--j2-muted)] opacity-80 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none group-[.destructive]:text-red-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </button>
));
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-black text-[var(--j2-text)] group-[.destructive]:text-[#fff8f2]", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed text-[var(--j2-muted)] group-[.destructive]:text-[#fee2e2]", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
