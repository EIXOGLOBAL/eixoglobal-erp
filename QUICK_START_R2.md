# Guia Rápido de Configuração - Cloudflare R2

## Passo 1: Criar Bucket no Cloudflare

1. Acesse https://dash.cloudflare.com/
2. Vá em **R2** no menu lateral
3. Clique em **Create bucket**
4. Nome sugerido: `eixoglobal-erp-storage`
5. Escolha a região mais próxima dos usuários

## Passo 2: Criar API Token

1. No painel do R2, clique em **Manage R2 API Tokens**
2. Clique em **Create API Token**
3. Dê um nome: `eixoglobal-erp-token`
4. Permissões:
   - ✅ Object Read & Write
   - ✅ Bucket List
5. Clique em **Create API Token**
6. **IMPORTANTE:** Copie e salve as credenciais:
   - Access Key ID
   - Secret Access Key

## Passo 3: Configurar Variáveis de Ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.r2.example .env.local
   ```

2. Edite `.env.local` e preencha:
   ```bash
   R2_ACCOUNT_ID=seu_account_id_aqui
   R2_ACCESS_KEY_ID=sua_access_key_aqui
   R2_SECRET_ACCESS_KEY=sua_secret_key_aqui
   R2_BUCKET_NAME=eixoglobal-erp-storage
   ```

   **Onde encontrar o Account ID:**
   - Na URL do dashboard: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2`
   - Ou em: Account Home > Workers & Pages > Overview (lado direito)

## Passo 4: Testar Conexão

```bash
npx tsx scripts/test-r2-connection.ts
```

Se tudo estiver correto, você verá:
```
✅ Teste concluído com sucesso!
🎉 A integração com Cloudflare R2 está funcionando corretamente!
```

## Passo 5: (Opcional) Configurar CORS

Para uploads diretos do browser, configure CORS:

1. Instale Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```

2. Faça login:
   ```bash
   wrangler login
   ```

3. Configure CORS:
   ```bash
   wrangler r2 bucket cors put eixoglobal-erp-storage --cors-config r2-cors-config.json
   ```

4. Edite `r2-cors-config.json` e adicione seus domínios:
   ```json
   {
     "AllowedOrigins": [
       "https://seu-dominio.com",
       "http://localhost:3000"
     ]
   }
   ```

## Passo 6: (Opcional) Configurar Domínio Público

Para servir arquivos públicos (como imagens de produtos):

1. No bucket, vá em **Settings**
2. Em **Public Access**, clique em **Allow Access**
3. Em **Custom Domains**, adicione um subdomínio (ex: `cdn.eixoglobal.com`)
4. Configure o DNS conforme instruções
5. Adicione no `.env.local`:
   ```bash
   R2_PUBLIC_URL=https://cdn.eixoglobal.com
   ```

## Pronto!

Agora você pode usar os componentes de upload:

```tsx
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

## Troubleshooting

### Erro: "R2_ACCOUNT_ID não configurado"
- Verifique se o arquivo `.env.local` existe
- Confirme que as variáveis estão preenchidas corretamente

### Erro: "Access Denied"
- Verifique se o API Token tem as permissões corretas
- Confirme que o bucket name está correto

### Upload direto não funciona
- Configure CORS (veja Passo 5)
- Ou use `useDirectUpload={false}` para upload via servidor

## Documentação Completa

Para mais detalhes, consulte:
- `CLOUDFLARE_R2_INTEGRATION.md` - Documentação completa
- `R2_INTEGRATION_SUMMARY.md` - Resumo da integração
- `src/lib/storage/examples.tsx` - Exemplos de código
