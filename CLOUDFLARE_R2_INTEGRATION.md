# Integração Cloudflare R2 - EixoGlobal ERP

Documentação completa da integração de armazenamento de arquivos com Cloudflare R2.

## Índice

1. [Visão Geral](#visão-geral)
2. [Configuração do Cloudflare R2](#configuração-do-cloudflare-r2)
3. [Configuração do Projeto](#configuração-do-projeto)
4. [Estrutura de Arquivos](#estrutura-de-arquivos)
5. [Uso Básico](#uso-básico)
6. [API Routes](#api-routes)
7. [Componentes React](#componentes-react)
8. [Casos de Uso](#casos-de-uso)
9. [Segurança](#segurança)
10. [Troubleshooting](#troubleshooting)

---

## Visão Geral

Esta integração permite armazenar arquivos no Cloudflare R2, um serviço de armazenamento de objetos compatível com S3, sem custos de egress (saída de dados).

### Recursos Implementados

- ✅ Upload direto do browser (presigned URLs)
- ✅ Upload via servidor (server-side)
- ✅ Download com URLs assinadas
- ✅ Listagem de arquivos
- ✅ Exclusão de arquivos
- ✅ Componentes React com drag & drop
- ✅ Preview de imagens
- ✅ Progress tracking
- ✅ Validação de tipos e tamanhos
- ✅ Controle de permissões por categoria

### Casos de Uso Suportados

1. **Notas Fiscais** - Upload de XML e PDF
2. **Fotos de Produtos** - Imagens com preview
3. **Documentos de Contratos** - PDFs e Word
4. **Backup de Relatórios** - Armazenamento de relatórios gerados

---

## Configuração do Cloudflare R2

### 1. Criar Bucket no Cloudflare

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Vá em **R2** no menu lateral
3. Clique em **Create bucket**
4. Escolha um nome (ex: `eixoglobal-erp-storage`)
5. Selecione a região (recomendado: mais próxima dos usuários)

### 2. Criar API Token

1. No painel do R2, vá em **Manage R2 API Tokens**
2. Clique em **Create API Token**
3. Configure as permissões:
   - **Object Read & Write** (para upload e download)
   - **Bucket List** (para listar arquivos)
4. Copie as credenciais:
   - `Access Key ID`
   - `Secret Access Key`
   - `Account ID` (encontrado na URL do dashboard)

### 3. Configurar CORS (Opcional)

Para uploads diretos do browser, configure CORS no bucket:

```json
[
  {
    "AllowedOrigins": [
      "https://seu-dominio.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Para configurar via CLI:

```bash
# Instalar Wrangler
npm install -g wrangler

# Login
wrangler login

# Configurar CORS
wrangler r2 bucket cors put eixoglobal-erp-storage --cors-config cors.json
```

### 4. Configurar Domínio Público (Opcional)

Para servir arquivos públicos (como imagens de produtos):

1. No bucket, vá em **Settings**
2. Em **Public Access**, clique em **Allow Access**
3. Configure um domínio customizado:
   - Vá em **Custom Domains**
   - Adicione um subdomínio (ex: `cdn.eixoglobal.com`)
   - Configure o DNS conforme instruções

---

## Configuração do Projeto

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env`:

```bash
# Cloudflare R2
R2_ACCOUNT_ID=seu_account_id_aqui
R2_ACCESS_KEY_ID=sua_access_key_aqui
R2_SECRET_ACCESS_KEY=sua_secret_key_aqui
R2_BUCKET_NAME=eixoglobal-erp-storage

# URL pública (opcional - apenas se configurou domínio customizado)
R2_PUBLIC_URL=https://cdn.eixoglobal.com
```

### 2. Dependências

As dependências já foram instaladas:

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x.x",
    "@aws-sdk/s3-request-presigner": "^3.x.x"
  }
}
```

---

## Estrutura de Arquivos

```
src/
├── lib/
│   └── storage/
│       ├── r2-client.ts          # Cliente S3 configurado para R2
│       ├── upload.ts              # Funções de upload
│       ├── download.ts            # Funções de download e listagem
│       └── examples.tsx           # Exemplos de uso
├── app/
│   └── api/
│       └── storage/
│           ├── upload/
│           │   └── route.ts       # POST/GET - Upload e presigned URLs
│           └── files/
│               ├── route.ts       # GET - Listar arquivos
│               └── [key]/
│                   └── route.ts   # GET/DELETE - Download e exclusão
└── components/
    └── upload/
        ├── file-uploader.tsx      # Componente de upload genérico
        └── image-uploader.tsx     # Componente de upload de imagens
```

### Organização no Bucket

```
bucket/
├── invoices/          # Notas fiscais (XML/PDF)
├── products/          # Fotos de produtos
├── contracts/         # Documentos de contratos
├── reports/           # Relatórios e backups
└── [custom]/          # Outras categorias
```

---

## Uso Básico

### Upload Server-Side

```typescript
import { uploadFile, uploadInvoice } from '@/lib/storage/upload'

// Upload genérico
const file = new File([blob], 'documento.pdf', { type: 'application/pdf' })
const result = await uploadFile(file, {
  prefix: 'documents',
  public: false,
  metadata: {
    userId: '123',
    category: 'contract',
  },
})

// Upload de nota fiscal (com validação específica)
const invoice = new File([xmlBlob], 'nfe.xml', { type: 'application/xml' })
const invoiceResult = await uploadInvoice(invoice)

console.log(invoiceResult)
// {
//   key: 'invoices/abc123_nfe.xml',
//   url: 'invoices/abc123_nfe.xml',
//   fileName: 'abc123_nfe.xml',
//   size: 12345,
//   contentType: 'application/xml'
// }
```

### Upload Direto (Presigned URL)

```typescript
import { generatePresignedUploadUrl } from '@/lib/storage/upload'

// 1. Gerar URL assinada
const { uploadUrl, key } = await generatePresignedUploadUrl('foto.jpg', {
  prefix: 'products',
  contentType: 'image/jpeg',
})

// 2. Upload direto do browser
const file = document.getElementById('file-input').files[0]
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
})

console.log('Arquivo enviado! Chave:', key)
```

### Download

```typescript
import { generatePresignedDownloadUrl, downloadFile } from '@/lib/storage/download'

// Gerar URL de download (válida por 1 hora)
const downloadUrl = await generatePresignedDownloadUrl('invoices/abc123_nfe.xml', {
  expiresIn: 3600,
  downloadFileName: 'nota-fiscal.xml',
  forceDownload: true,
})

window.open(downloadUrl, '_blank')

// Download direto (server-side)
const buffer = await downloadFile('invoices/abc123_nfe.xml')
// Processar o buffer...
```

### Listagem

```typescript
import { listFiles, listInvoices } from '@/lib/storage/download'

// Listar arquivos com paginação
const result = await listFiles({
  prefix: 'invoices/',
  maxKeys: 50,
})

console.log(result.files) // Array de FileMetadata
console.log(result.isTruncated) // true se houver mais resultados
console.log(result.nextContinuationToken) // Token para próxima página

// Listar todas as notas fiscais
const invoices = await listInvoices()
```

### Exclusão

```typescript
import { deleteFile, deleteFiles } from '@/lib/storage/download'

// Excluir um arquivo
await deleteFile('invoices/abc123_nfe.xml')

// Excluir múltiplos arquivos
await deleteFiles([
  'invoices/file1.xml',
  'invoices/file2.xml',
])
```

---

## API Routes

### POST /api/storage/upload

Upload de arquivo via FormData (server-side).

**Request:**

```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('category', 'invoice') // invoice, product, contract, report
formData.append('prefix', 'custom-folder') // opcional
formData.append('public', 'true') // opcional

const response = await fetch('/api/storage/upload', {
  method: 'POST',
  body: formData,
})
```

**Response:**

```json
{
  "success": true,
  "key": "invoices/abc123_file.xml",
  "url": "invoices/abc123_file.xml",
  "fileName": "abc123_file.xml",
  "size": 12345,
  "contentType": "application/xml"
}
```

### GET /api/storage/upload

Gera presigned URL para upload direto.

**Request:**

```typescript
const params = new URLSearchParams({
  fileName: 'foto.jpg',
  contentType: 'image/jpeg',
  category: 'product', // opcional
  prefix: 'custom-folder', // opcional
})

const response = await fetch(`/api/storage/upload?${params}`)
```

**Response:**

```json
{
  "success": true,
  "uploadUrl": "https://account.r2.cloudflarestorage.com/...",
  "key": "products/abc123_foto.jpg"
}
```

### GET /api/storage/files

Lista arquivos do bucket.

**Request:**

```typescript
const params = new URLSearchParams({
  prefix: 'invoices/', // opcional
  maxKeys: '50', // opcional
  continuationToken: 'token', // opcional (paginação)
})

const response = await fetch(`/api/storage/files?${params}`)
```

**Response:**

```json
{
  "success": true,
  "files": [
    {
      "key": "invoices/file1.xml",
      "size": 12345,
      "contentType": "application/xml",
      "lastModified": "2026-04-12T00:00:00.000Z"
    }
  ],
  "isTruncated": false,
  "nextContinuationToken": null
}
```

### GET /api/storage/files/[key]

Gera URL de download ou retorna metadados.

**Request:**

```typescript
const key = encodeURIComponent('invoices/abc123_file.xml')
const params = new URLSearchParams({
  action: 'download', // download, metadata
  fileName: 'nota-fiscal.xml', // opcional
  expiresIn: '3600', // opcional (segundos)
})

const response = await fetch(`/api/storage/files/${key}?${params}`)
```

**Response (download):**

```json
{
  "success": true,
  "downloadUrl": "https://account.r2.cloudflarestorage.com/...",
  "key": "invoices/abc123_file.xml",
  "expiresIn": 3600
}
```

**Response (metadata):**

```json
{
  "success": true,
  "metadata": {
    "key": "invoices/abc123_file.xml",
    "size": 12345,
    "contentType": "application/xml",
    "lastModified": "2026-04-12T00:00:00.000Z",
    "etag": "\"abc123\""
  }
}
```

### DELETE /api/storage/files/[key]

Exclui um arquivo.

**Request:**

```typescript
const key = encodeURIComponent('invoices/abc123_file.xml')
const response = await fetch(`/api/storage/files/${key}`, {
  method: 'DELETE',
})
```

**Response:**

```json
{
  "success": true,
  "message": "Arquivo excluído com sucesso",
  "key": "invoices/abc123_file.xml"
}
```

---

## Componentes React

### FileUploader

Componente genérico para upload de arquivos com drag & drop.

```tsx
import { FileUploader } from '@/components/upload/file-uploader'

<FileUploader
  category="invoice"
  accept=".xml,.pdf"
  maxSize={5 * 1024 * 1024}
  buttonText="Selecionar Nota Fiscal"
  description="Arraste o arquivo XML ou PDF aqui"
  useDirectUpload={true}
  onUploadComplete={(result) => {
    console.log('Upload concluído:', result)
  }}
  onError={(error) => {
    console.error('Erro:', error)
  }}
/>
```

**Props:**

- `category`: Categoria do arquivo (invoice, product, contract, report)
- `prefix`: Prefixo customizado
- `accept`: Tipos de arquivo aceitos
- `maxSize`: Tamanho máximo em bytes
- `buttonText`: Texto do botão
- `description`: Descrição na área de drop
- `disabled`: Desabilitar uploader
- `useDirectUpload`: Usar presigned URL (recomendado)
- `onUploadComplete`: Callback de sucesso
- `onError`: Callback de erro

### ImageUploader

Componente especializado para upload de imagens com preview.

```tsx
import { ImageUploader } from '@/components/upload/image-uploader'

<ImageUploader
  category="product"
  currentImageUrl={productImage}
  maxSize={5 * 1024 * 1024}
  previewWidth={400}
  previewHeight={400}
  useDirectUpload={true}
  allowRemove={true}
  onUploadComplete={(result) => {
    setProductImage(result.url)
  }}
  onRemove={() => {
    setProductImage(null)
  }}
/>
```

**Props:**

- `category`: Categoria da imagem (product, logo, avatar)
- `currentImageUrl`: URL da imagem atual
- `maxSize`: Tamanho máximo (padrão: 5MB)
- `previewWidth`: Largura do preview
- `previewHeight`: Altura do preview
- `allowRemove`: Permitir remover imagem
- `onRemove`: Callback ao remover
- Demais props do FileUploader

---

## Casos de Uso

### 1. Upload de Nota Fiscal

```tsx
import { FileUploader } from '@/components/upload/file-uploader'

<FileUploader
  category="invoice"
  accept=".xml,.pdf"
  maxSize={5 * 1024 * 1024}
  useDirectUpload={true}
  onUploadComplete={async (result) => {
    // Salvar no banco de dados
    await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileKey: result.key,
        fileName: result.fileName,
        fileSize: result.size,
      }),
    })
  }}
/>
```

### 2. Galeria de Fotos de Produto

```tsx
import { ImageUploader } from '@/components/upload/image-uploader'

function ProductGallery() {
  const [images, setImages] = useState<string[]>([])

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((url, i) => (
        <img key={i} src={url} alt={`Produto ${i + 1}`} />
      ))}
      
      <ImageUploader
        category="product"
        useDirectUpload={true}
        onUploadComplete={(result) => {
          setImages([...images, result.url])
        }}
      />
    </div>
  )
}
```

### 3. Backup Automático de Relatórios

```typescript
import { uploadReport } from '@/lib/storage/upload'

async function backupReport(reportData: ArrayBuffer) {
  const fileName = `relatorio-${new Date().toISOString()}.pdf`
  const file = new File([reportData], fileName, { type: 'application/pdf' })
  
  const result = await uploadReport(file)
  
  // Salvar referência no banco
  await db.reportBackup.create({
    data: {
      fileKey: result.key,
      fileName: result.fileName,
      createdAt: new Date(),
    },
  })
}
```

---

## Segurança

### Controle de Permissões

As API routes implementam controle de acesso baseado em roles:

```typescript
// Notas fiscais e contratos: apenas ADMIN, MANAGER, ACCOUNTANT
if (category === 'invoice') {
  if (!['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
}

// Exclusão de contratos: apenas ADMIN, MANAGER
if (prefix === 'contracts') {
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
}
```

### Validação de Arquivos

```typescript
// Tipos permitidos por categoria
const FILE_TYPES = {
  invoices: { 'application/xml': '.xml', 'application/pdf': '.pdf' },
  images: { 'image/jpeg': '.jpg', 'image/png': '.png' },
  documents: { 'application/pdf': '.pdf', 'application/msword': '.doc' },
}

// Tamanhos máximos
const MAX_FILE_SIZES = {
  image: 5 * 1024 * 1024,      // 5 MB
  document: 10 * 1024 * 1024,  // 10 MB
  invoice: 5 * 1024 * 1024,    // 5 MB
}
```

### URLs Assinadas

Todas as URLs de download são temporárias e assinadas:

```typescript
// URL válida por 1 hora (padrão)
const url = await generatePresignedDownloadUrl(key, {
  expiresIn: 3600,
})

// Após 1 hora, a URL expira e não funciona mais
```

---

## Troubleshooting

### Erro: "R2_ACCOUNT_ID não configurado"

**Solução:** Verifique se as variáveis de ambiente estão configuradas corretamente no `.env`.

### Erro: "Access Denied" ao fazer upload

**Solução:** 
1. Verifique se o API Token tem permissões de escrita
2. Confirme que o bucket name está correto
3. Verifique se o CORS está configurado (para uploads diretos)

### Upload direto não funciona

**Solução:**
1. Configure CORS no bucket (veja seção de configuração)
2. Verifique se a URL do frontend está nas origens permitidas
3. Teste com `useDirectUpload={false}` para upload via servidor

### Imagens não aparecem

**Solução:**
1. Se usar domínio público, verifique se está configurado corretamente
2. Para arquivos privados, use presigned URLs
3. Verifique se o arquivo foi realmente enviado (liste os arquivos)

### Erro de CORS no browser

**Solução:**
```bash
# Configurar CORS via Wrangler
wrangler r2 bucket cors put eixoglobal-erp-storage --cors-config cors.json
```

Arquivo `cors.json`:
```json
[
  {
    "AllowedOrigins": ["https://seu-dominio.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### Performance lenta

**Solução:**
1. Use upload direto (`useDirectUpload={true}`) para arquivos grandes
2. Configure um domínio público para servir arquivos estáticos
3. Considere usar CDN na frente do R2

---

## Próximos Passos

1. **Implementar compressão de imagens** antes do upload
2. **Adicionar suporte a múltiplos arquivos** simultâneos
3. **Criar dashboard de gerenciamento** de arquivos
4. **Implementar versionamento** de arquivos
5. **Adicionar análise de vírus** antes do upload
6. **Criar sistema de quotas** por usuário/empresa

---

## Suporte

Para dúvidas ou problemas:

1. Consulte a [documentação do Cloudflare R2](https://developers.cloudflare.com/r2/)
2. Verifique os logs do servidor
3. Teste as API routes diretamente (Postman, curl)
4. Revise os exemplos em `src/lib/storage/examples.tsx`

---

**Última atualização:** 12 de abril de 2026
