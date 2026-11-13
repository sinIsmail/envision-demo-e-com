import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-border/80 bg-background px-3 py-2.5 text-base sm:text-sm text-foreground transition-all outline-none placeholder:text-muted-foreground/70 hover:border-primary/50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:bg-muted/30 dark:border-border/80 dark:hover:border-primary/60 dark:focus-visible:border-primary",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
