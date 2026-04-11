'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { DeleteDocumentDialog } from './delete-document-dialog'

interface DocumentRowActionsProps {
  documentId: string
  documentName: string
}

export function DocumentRowActions({
  documentId,
  documentName,
}: DocumentRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <DeleteDocumentDialog
        documentId={documentId}
        documentName={documentName}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
