'use client'

import { CreateFolderDialog } from './create-folder-dialog'
import { UploadDocumentDialog } from './upload-document-dialog'

export function DocumentActionsBar() {
  return (
    <div className="flex gap-2">
      <CreateFolderDialog />
      <UploadDocumentDialog />
    </div>
  )
}
