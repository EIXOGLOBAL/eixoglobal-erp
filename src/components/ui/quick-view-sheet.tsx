'use client'

import * as React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface QuickViewSheetProps {
  title: string
  description?: string
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Largura customizada do sheet. Padr\u00e3o: "max-w-[500px]" */
  className?: string
  /** Conte\u00fado do footer (bot\u00f5es de a\u00e7\u00e3o) */
  footer?: React.ReactNode
}

export function QuickViewSheet({
  title,
  description,
  children,
  open,
  onOpenChange,
  className,
  footer,
}: QuickViewSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('w-full sm:max-w-[500px] p-0 flex flex-col', className)}
        showCloseButton
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-lg">{title}</SheetTitle>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-6 py-4">
            {children}
          </div>
        </ScrollArea>

        {footer && (
          <div className="border-t px-6 py-4 shrink-0 flex items-center gap-2">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
