/**
 * Script de teste para validar a configuração do Cloudflare R2
 * 
 * Execute com: npx tsx scripts/test-r2-connection.ts
 */

import { getR2Client, getR2Config } from '../src/lib/storage/r2-client'
import { ListBucketsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

async function testR2Connection() {
  console.log('🔍 Testando conexão com Cloudflare R2...\n')

  try {
    // 1. Validar configuração
    console.log('1️⃣ Validando variáveis de ambiente...')
    const config = getR2Config()
    console.log('✅ Configuração válida:')
    console.log(`   - Account ID: ${config.accountId}`)
    console.log(`   - Bucket: ${config.bucketName}`)
    console.log(`   - Public URL: ${config.publicUrl || 'Não configurado'}`)
    console.log()

    // 2. Testar conexão
    console.log('2️⃣ Testando conexão com R2...')
    const client = getR2Client()
    console.log('✅ Cliente S3 criado com sucesso')
    console.log()

    // 3. Listar buckets (opcional - pode não ter permissão)
    console.log('3️⃣ Tentando listar buckets...')
    try {
      const bucketsCommand = new ListBucketsCommand({})
      const bucketsResponse = await client.send(bucketsCommand)
      console.log('✅ Buckets encontrados:')
      bucketsResponse.Buckets?.forEach((bucket) => {
        console.log(`   - ${bucket.Name}`)
      })
    } catch (error: any) {
      console.log('⚠️  Não foi possível listar buckets (permissão pode não estar configurada)')
      console.log(`   Erro: ${error.message}`)
    }
    console.log()

    // 4. Listar objetos no bucket
    console.log('4️⃣ Listando objetos no bucket...')
    const objectsCommand = new ListObjectsV2Command({
      Bucket: config.bucketName,
      MaxKeys: 10,
    })
    const objectsResponse = await client.send(objectsCommand)
    
    if (objectsResponse.Contents && objectsResponse.Contents.length > 0) {
      console.log(`✅ ${objectsResponse.Contents.length} arquivo(s) encontrado(s):`)
      objectsResponse.Contents.forEach((obj) => {
        const size = obj.Size ? `${(obj.Size / 1024).toFixed(2)} KB` : 'N/A'
        console.log(`   - ${obj.Key} (${size})`)
      })
    } else {
      console.log('ℹ️  Bucket vazio (nenhum arquivo encontrado)')
    }
    console.log()

    // 5. Sucesso
    console.log('✅ Teste concluído com sucesso!')
    console.log('🎉 A integração com Cloudflare R2 está funcionando corretamente!')
    console.log()
    console.log('Próximos passos:')
    console.log('1. Configure CORS se for usar upload direto do browser')
    console.log('2. Configure domínio público se quiser servir arquivos públicos')
    console.log('3. Teste os componentes de upload na aplicação')

  } catch (error: any) {
    console.error('❌ Erro ao testar conexão com R2:')
    console.error(`   ${error.message}`)
    console.error()
    console.error('Verifique:')
    console.error('1. As variáveis de ambiente estão configuradas corretamente?')
    console.error('2. O API Token tem as permissões necessárias?')
    console.error('3. O nome do bucket está correto?')
    console.error('4. O Account ID está correto?')
    process.exit(1)
  }
}

// Executar teste
testR2Connection()
