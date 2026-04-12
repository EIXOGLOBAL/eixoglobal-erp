# Resumo da Integração Cloudflare R2

## Arquivos Criados

### 📚 Biblioteca Core (src/lib/storage/)
- ✅ `r2-client.ts` - Cliente S3 configurado para Cloudflare R2
- ✅ `upload.ts` - Funções de upload (server-side e presigned URLs)
- ✅ `download.ts` - Funções de download, listagem e exclusão
- ✅ `index.ts` - Exportações centralizadas
- ✅ `examples.tsx` - Exemplos práticos de uso
- ✅ `README.md` - Documentação da biblioteca

### 🌐 API Routes (src/app/api/storage/)
- ✅ `upload/route.ts` - POST/GET para upload e presigned URLs
- ✅ `files/route.ts` - GET para listar arquivos
- ✅ `files/[key]/route.ts` - GET/DELETE para download e exclusão

### 🎨 Componentes React (src/components/upload/)
- ✅ `file-uploader.tsx` - Upload genérico com drag & drop
- ✅ `image-uploader.tsx` - Upload de imagens com preview
- ✅ `file-manager-example.tsx` - Exemplo completo de gerenciador

### 📖 Documentação
- ✅ `CLOUDFLARE_R2_INTEGRATION.md` - Documentação completa
- ✅ `.env.r2.example` - Exemplo de variáveis de ambiente
- ✅ `r2-cors-config.json` - Configuração CORS para R2

### 🧪 Scripts
- ✅ `scripts/test-r2-connection.ts` - Script de teste de conexão

## Dependências Instaladas

```json
{
  "@aws-sdk/client-s3": "^3.x.x",
  "@aws-sdk/s3-request-presigner": "^3.x.x"
}
```

## Próximos Passos

### 1. Configurar Cloudflare R2

1. Criar bucket no Cloudflare Dashboard
2. Gerar API Token com permissões adequadas
3. Configurar variáveis de ambiente no `.env`
4. (Opcional) Configurar CORS para uploads diretos
5. (Opcional) Configurar domínio público

### 2. Testar Conexão

```bash
# Copiar exemplo de variáveis de ambiente
cp .env.r2.example .env.local

# Editar .env.local com suas credenciais
# Depois executar:
npx tsx scripts/test-r2-connection.ts
```

### 3. Usar na Aplicação

```tsx
// Exemplo: Upload de nota fiscal
import { FileUploader } from '@/components/upload/file-uploader'

<FileUploader
  category="invoice"
  accept=".xml,.pdf"
  useDirectUpload={true}
  onUploadComplete={(result) => {
    console.log('Upload concluído:', result)
  }}
/>
```

## Recursos Implementados

### Upload
- ✅ Upload server-side via FormData
- ✅ Upload direto do browser (presigned URLs)
- ✅ Validação de tipos de arquivo
- ✅ Validação de tamanho
- ✅ Categorização automática (invoices, products, contracts, reports)
- ✅ Metadados customizados
- ✅ Progress tracking

### Download
- ✅ URLs assinadas temporárias
- ✅ URLs públicas (para arquivos públicos)
- ✅ Download direto (server-side)
- ✅ Metadados de arquivo
- ✅ Verificação de existência

### Listagem
- ✅ Listar arquivos por prefixo
- ✅ Paginação
- ✅ Filtros por categoria
- ✅ Funções específicas (listInvoices, listProducts, etc)

### Exclusão
- ✅ Excluir arquivo único
- ✅ Excluir múltiplos arquivos
- ✅ Excluir pasta completa
- ✅ Controle de permissões

### Componentes
- ✅ Drag & drop
- ✅ Preview de imagens
- ✅ Progress bar
- ✅ Estados de loading/success/error
- ✅ Validação visual
- ✅ Responsivo

### Segurança
- ✅ Autenticação obrigatória
- ✅ Controle de permissões por role
- ✅ URLs assinadas com expiração
- ✅ Validação de tipos de arquivo
- ✅ Sanitização de nomes de arquivo

## Casos de Uso Implementados

1. **Notas Fiscais (XML/PDF)**
   - Upload com validação específica
   - Armazenamento em `invoices/`
   - Permissões: ADMIN, MANAGER, ACCOUNTANT

2. **Fotos de Produtos**
   - Upload de imagens
   - Preview automático
   - Armazenamento público em `products/`
   - Suporte a múltiplas imagens

3. **Documentos de Contratos**
   - Upload de PDF/Word
   - Armazenamento em `contracts/`
   - Permissões: ADMIN, MANAGER

4. **Backup de Relatórios**
   - Upload de relatórios gerados
   - Armazenamento em `reports/`
   - Listagem e download

## Estrutura no Bucket

```
eixoglobal-erp-storage/
├── invoices/
│   ├── abc123_nota-fiscal.xml
│   └── def456_nota-fiscal.pdf
├── products/
│   ├── xyz789_produto-foto.jpg
│   └── uvw012_produto-foto.png
├── contracts/
│   ├── contract-001.pdf
│   └── contract-002.docx
└── reports/
    ├── relatorio-financeiro-2026-04-12.pdf
    └── relatorio-vendas-2026-04-12.xlsx
```

## API Endpoints

### POST /api/storage/upload
Upload de arquivo via FormData

### GET /api/storage/upload
Gerar presigned URL para upload direto

### GET /api/storage/files
Listar arquivos do bucket

### GET /api/storage/files/[key]
Gerar URL de download ou obter metadados

### DELETE /api/storage/files/[key]
Excluir arquivo

## Exemplos de Código

Veja exemplos completos em:
- `src/lib/storage/examples.tsx` - Exemplos de uso
- `src/components/upload/file-manager-example.tsx` - Gerenciador completo
- `CLOUDFLARE_R2_INTEGRATION.md` - Documentação detalhada

## Suporte

Para dúvidas ou problemas:
1. Consulte `CLOUDFLARE_R2_INTEGRATION.md`
2. Veja exemplos em `src/lib/storage/examples.tsx`
3. Execute o teste: `npx tsx scripts/test-r2-connection.ts`
4. Verifique a documentação do Cloudflare R2

---

**Data de Criação:** 12 de abril de 2026
**Versão:** 1.0.0
