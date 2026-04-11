import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { VariantProps } from 'class-variance-authority'

interface LoadingButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  /** Mostra spinner e desabilita o botao */
  loading?: boolean
  /** Texto alternativo enquanto carrega */
  loadingText?: string
  asChild?: boolean
}

/**
 * Botao com suporte a estado de loading.
 * Quando `loading=true`, exibe um spinner Loader2 e desabilita o botao.
 */
const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      loading = false,
      loadingText,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || loading}
        className={cn(loading && 'cursor-not-allowed', className)}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Button>
    )
  },
)

LoadingButton.displayName = 'LoadingButton'

export { LoadingButton }
