import { cn } from '@/lib/utils'

export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-b-2 bg-muted/50 px-1.5 py-0.5 font-mono text-[11px] font-medium shadow-sm',
        className
      )}
      {...props}
    />
  )
}
