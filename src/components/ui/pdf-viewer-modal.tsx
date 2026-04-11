"use client"

import * as React from "react"
import { FileTextIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { PdfViewer } from "@/components/ui/pdf-viewer"

interface PdfViewerModalProps {
  src: string
  title?: string
  isOpen: boolean
  onClose: () => void
}

export function PdfViewerModal({
  src,
  title = "Documento PDF",
  isOpen,
  onClose,
}: PdfViewerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-[90vh] max-w-5xl flex-col gap-0 p-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
            <DialogTitle className="truncate">{title}</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Visualizador de documento PDF: {title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <PdfViewer
            src={src}
            title={title}
            height="100%"
            className="h-full rounded-none border-0"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
