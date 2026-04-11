'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Calculator, TrendingUp, AlertTriangle } from "lucide-react"

interface BDICalculatorProps {
    administracaoCentral: number
    seguroGarantia: number
    risco: number
    despesasFinanceiras: number
    lucro: number
    iss: number
    pis: number
    cofins: number
    irpj: number
    csll: number
}

function calculateBDIPreview(data: BDICalculatorProps) {
    const ac = data.administracaoCentral / 100
    const sg = data.seguroGarantia / 100
    const r = data.risco / 100
    const df = data.despesasFinanceiras / 100
    const l = data.lucro / 100
    const tributos = (data.iss + data.pis + data.cofins + data.irpj + data.csll) / 100

    if (tributos >= 1) return { bdi: 0, tributos: tributos * 100, custoIndireto: 0, error: true }

    const fatorCustosIndiretos = 1 + ac + sg + r
    const fatorFinanceiro = 1 + df
    const fatorLucro = 1 + l
    const fatorTributos = 1 - tributos

    const bdi = (fatorCustosIndiretos * fatorFinanceiro * fatorLucro) / fatorTributos - 1

    return {
        bdi: Math.round(bdi * 10000) / 100,
        tributos: tributos * 100,
        custoIndireto: (ac + sg + r) * 100,
        fatorCustosIndiretos,
        fatorFinanceiro,
        fatorLucro,
        fatorTributos,
        error: false,
    }
}

export function BDICalculator(props: BDICalculatorProps) {
    const result = calculateBDIPreview(props)

    const faixaRef = result.bdi >= 20 && result.bdi <= 30
        ? "dentro"
        : result.bdi < 20
            ? "abaixo"
            : "acima"

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Preview do BDI
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* BDI Total */}
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">BDI Calculado</p>
                    <p className={`text-4xl font-bold tabular-nums ${result.error ? 'text-red-600' : 'text-primary'}`}>
                        {result.error ? '---' : `${result.bdi.toFixed(2)}%`}
                    </p>
                    {!result.error && (
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                            {faixaRef === "dentro" ? (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Dentro da faixa referencial TCU (20%~30%)
                                </span>
                            ) : (
                                <span className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {faixaRef === "abaixo" ? "Abaixo" : "Acima"} da faixa referencial TCU (20%~30%)
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <Separator />

                {/* Composição */}
                <div className="space-y-2 text-sm">
                    <p className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Composição</p>

                    <div className="space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Custos Indiretos (AC + S + R)</span>
                            <span className="tabular-nums font-medium">{result.custoIndireto.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Despesas Financeiras</span>
                            <span className="tabular-nums font-medium">{props.despesasFinanceiras.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Lucro</span>
                            <span className="tabular-nums font-medium">{props.lucro.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Tributos (ISS+PIS+COFINS+IRPJ+CSLL)</span>
                            <span className="tabular-nums font-medium">{result.tributos.toFixed(2)}%</span>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Fórmula */}
                <div className="rounded-md border bg-muted/20 p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Formula TCU (Acordao 2.622/2013)</p>
                    <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                        BDI = ((1 + AC + S + R) x (1 + DF) x (1 + L)) / (1 - I) - 1
                    </p>
                    {!result.error && result.fatorCustosIndiretos && (
                        <p className="text-xs font-mono text-muted-foreground mt-1">
                            = ({result.fatorCustosIndiretos.toFixed(4)} x {result.fatorFinanceiro?.toFixed(4)} x {result.fatorLucro?.toFixed(4)}) / {result.fatorTributos?.toFixed(4)} - 1
                        </p>
                    )}
                </div>

                {/* Exemplo prático */}
                {!result.error && (
                    <div className="rounded-md border p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Exemplo pratico</p>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Custo direto da obra</span>
                                <span className="tabular-nums">R$ 100.000,00</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">BDI ({result.bdi.toFixed(2)}%)</span>
                                <span className="tabular-nums">R$ {(1000 * result.bdi).toFixed(2).replace('.', ',')}</span>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex justify-between font-medium">
                                <span>Preco de venda</span>
                                <span className="tabular-nums">
                                    R$ {((100000 + 1000 * result.bdi)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
