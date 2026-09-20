import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * Sizes start at 44px because the stranger view gets used one-handed, in a
 * hurry, sometimes in a dim room. See docs/ARCHITECTURE.md §9.
 */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] ' +
    'font-medium transition-colors disabled:pointer-events-none ' +
    'disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:opacity-90',
        outline: 'border border-border bg-surface text-fg hover:bg-surface-2',
        ghost: 'text-fg hover:bg-surface-2',
        /** Reserved for genuine urgency. Never for emphasis. */
        urgent: 'bg-urgent text-urgent-fg hover:opacity-90',
      },
      size: {
        md: 'h-11 px-4 text-sm',
        lg: 'h-13 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<'button'> &
  VariantProps<typeof button> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(button({ variant, size }), className)} {...props} />
}
