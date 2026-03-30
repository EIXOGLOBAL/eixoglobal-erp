import { randomBytes } from 'crypto'

interface NFSeData {
  prestador: { cnpj: string; inscricaoMunicipal?: string }
  tomador: { cnpj?: string; cpf?: string; razaoSocial: string; endereco?: any }
  servico: { codigoTributacao: string; discriminacao: string; valorServicos: number; aliquota: number }
  competencia: string
}

interface NFSeResult {
  success: boolean
  numero?: string
  codigoVerificacao?: string
  dataEmissao?: string
  xml?: string
  error?: string
}

class SefazService {
  private baseUrl: string
  private certificado: string | null

  constructor() {
    this.baseUrl = process.env.SEFAZ_URL || 'https://nfse.prefeitura.sp.gov.br/ws/lotenfe.asmx'
    this.certificado = process.env.SEFAZ_CERTIFICATE_PATH || null
  }

  async emitirNFSe(data: NFSeData): Promise<NFSeResult> {
    // Generate XML envelope following ABRASF v2.04 standard
    const xml = this.buildNFSeXml(data)

    if (!this.certificado) {
      // Development mode - simulate
      console.warn('[SEFAZ] Modo desenvolvimento - simulando emissão')
      return {
        success: true,
        numero: `SIM-${Date.now()}`,
        codigoVerificacao: randomBytes(8).toString('hex').toUpperCase(),
        dataEmissao: new Date().toISOString(),
        xml,
        error: undefined
      }
    }

    try {
      // Production: send SOAP request to SEFAZ
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.abrasf.org.br/nfse.xsd/RecepcionarLoteRps'
        },
        body: this.wrapInSoapEnvelope(xml)
      })

      const responseText = await response.text()
      return this.parseNFSeResponse(responseText)
    } catch (error) {
      return { success: false, error: `Erro ao comunicar com SEFAZ: ${(error as Error).message}` }
    }
  }

  async consultarNFSe(numero: string, codigoVerificacao: string): Promise<NFSeResult> {
    if (!this.certificado) {
      console.warn('[SEFAZ] Modo desenvolvimento - simulando consulta')
      return { success: true, numero }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.abrasf.org.br/nfse.xsd/ConsultarNfse'
        },
        body: this.buildConsultaXml(numero, codigoVerificacao)
      })

      const responseText = await response.text()
      return this.parseNFSeResponse(responseText)
    } catch (error) {
      return { success: false, error: `Erro ao consultar SEFAZ: ${(error as Error).message}` }
    }
  }

  async cancelarNFSe(numero: string, motivo: string): Promise<{ success: boolean; error?: string }> {
    if (!this.certificado) {
      console.warn('[SEFAZ] Modo desenvolvimento - simulando cancelamento')
      return { success: true }
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.abrasf.org.br/nfse.xsd/CancelarNfse'
        },
        body: this.buildCancelamentoXml(numero, motivo)
      })

      const responseText = await response.text()
      const hasError = responseText.includes('<MensagemRetorno>') || responseText.includes('<ListaMensagemRetorno>')

      if (hasError) {
        const errorMatch = responseText.match(/<Mensagem>(.*?)<\/Mensagem>/)
        return { success: false, error: errorMatch?.[1] || 'Erro ao cancelar NFS-e' }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: `Erro ao cancelar na SEFAZ: ${(error as Error).message}` }
    }
  }

  private buildNFSeXml(data: NFSeData): string {
    // Build ABRASF v2.04 compliant XML
    const timestamp = new Date().toISOString().split('T')[0]
    return `<?xml version="1.0" encoding="UTF-8"?>
<EnviarLoteRpsEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
  <LoteRps Id="lote_${Date.now()}" versao="2.04">
    <NumeroLote>1</NumeroLote>
    <Cnpj>${data.prestador.cnpj}</Cnpj>
    <InscricaoMunicipal>${data.prestador.inscricaoMunicipal || ''}</InscricaoMunicipal>
    <QuantidadeRps>1</QuantidadeRps>
    <ListaRps>
      <Rps>
        <InfDeclaracaoPrestacaoServico>
          <Rps>
            <IdentificacaoRps>
              <Numero>1</Numero>
              <Serie>A</Serie>
              <Tipo>1</Tipo>
            </IdentificacaoRps>
            <DataEmissao>${timestamp}</DataEmissao>
            <Status>1</Status>
          </Rps>
          <Competencia>${data.competencia}</Competencia>
          <Servico>
            <Valores>
              <ValorServicos>${data.servico.valorServicos.toFixed(2)}</ValorServicos>
              <Aliquota>${data.servico.aliquota.toFixed(4)}</Aliquota>
            </Valores>
            <ItemListaServico>${data.servico.codigoTributacao}</ItemListaServico>
            <Discriminacao>${this.escapeXml(data.servico.discriminacao)}</Discriminacao>
          </Servico>
          <Prestador>
            <CpfCnpj>
              <Cnpj>${data.prestador.cnpj}</Cnpj>
            </CpfCnpj>
          </Prestador>
          <Tomador>
            <IdentificacaoTomador>
              <CpfCnpj>
                ${data.tomador.cnpj ? `<Cnpj>${data.tomador.cnpj}</Cnpj>` : `<Cpf>${data.tomador.cpf}</Cpf>`}
              </CpfCnpj>
            </IdentificacaoTomador>
            <RazaoSocial>${this.escapeXml(data.tomador.razaoSocial)}</RazaoSocial>
          </Tomador>
        </InfDeclaracaoPrestacaoServico>
      </Rps>
    </ListaRps>
  </LoteRps>
</EnviarLoteRpsEnvio>`
  }

  private buildConsultaXml(numero: string, codigoVerificacao: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ConsultarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
      <Numero>${numero}</Numero>
      <CodigoVerificacao>${codigoVerificacao}</CodigoVerificacao>
    </ConsultarNfseEnvio>
  </soap:Body>
</soap:Envelope>`
  }

  private buildCancelamentoXml(numero: string, motivo: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CancelarNfseEnvio xmlns="http://www.abrasf.org.br/nfse.xsd">
      <Numero>${numero}</Numero>
      <Motivo>${this.escapeXml(motivo)}</Motivo>
    </CancelarNfseEnvio>
  </soap:Body>
</soap:Envelope>`
  }

  private wrapInSoapEnvelope(xml: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>${xml}</soap:Body>
</soap:Envelope>`
  }

  private parseNFSeResponse(xml: string): NFSeResult {
    // Basic XML parsing - in production use a proper XML parser
    const hasError = xml.includes('<MensagemRetorno>') || xml.includes('<ListaMensagemRetorno>')
    if (hasError) {
      const errorMatch = xml.match(/<Mensagem>(.*?)<\/Mensagem>/)
      return { success: false, error: errorMatch?.[1] || 'Erro desconhecido da SEFAZ' }
    }
    const numeroMatch = xml.match(/<Numero>(.*?)<\/Numero>/)
    const codVerMatch = xml.match(/<CodigoVerificacao>(.*?)<\/CodigoVerificacao>/)
    return {
      success: true,
      numero: numeroMatch?.[1],
      codigoVerificacao: codVerMatch?.[1],
      dataEmissao: new Date().toISOString()
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}

export const sefazService = new SefazService()
