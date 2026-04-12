# Storage Library - Cloudflare R2

Biblioteca para integração com Cloudflare R2 (S3-compatible storage).

## Arquivos

- **r2-client.ts** - Cliente S3 configurado para Cloudflare R2
- **upload.ts** - Funções de upload (server-side e presigned URLs)
- **download.ts** - Funções de download, listagem e exclusão
- **index.ts** - Exportações centralizadas
- **examples.tsx** - Exemplos práticos de uso

## Uso Rápido

### Upload

```typescript
import { uploadFile, uploadInvoice } from '@/lib/storage'

// Upload genérico
const result = await uploadFile(file, {
  prefix: 'documents',
  public: false,
})

// Upload de nota fiscal (com validação)
const invoice = await uploadInvoice(xmlFile)
```

### Download

```typescript
import { generatePresignedDownloadUrl, listFiles } from '@/lib/storage'

// Gerar URL de download
const url = await generatePresignedDownloadUrl('invoices/file.xml')

// Listar arquivos
const { files } = await listFiles({ prefix: 'invoices/' })
```

### Componentes

```tsx
import { FileUploader } from '@/components/upload/file-uploader'
import { ImageUploader } from '@/components/upload/image-uploader'

// Upload genérico
<FileUploader
  category="invoice"
  useDirectUpload={true}
  onUploadComplete={(result) => console.log(result)}
/>

// Upload de imagem
<ImageUploader
  category="product"
  useDirectUpload={true}
  allowRemove={true}
/>
```

## Documentação Completa

Veja [CLOUDFLARE_R2_INTEGRATION.md](/CLOUDFLARE_R2_INTEGRATION.md) na raiz do projeto.
