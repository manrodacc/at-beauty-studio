import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const variants = cva('button', {
  variants: { variant: { primary: 'button-primary', outline: 'button-outline', ghost: 'button-ghost' } },
  defaultVariants: { variant: 'primary' },
})

export function Button({ asChild, className, variant, type = 'button', ...props }: ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  if (asChild) return <Slot.Root className={cn(variants({ variant }), className)} {...props} />
  return <button type={type} className={cn(variants({ variant }), className)} {...props} />
}
