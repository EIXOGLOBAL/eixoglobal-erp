'use client'

import { useState, useMemo } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Copy, Trash2, Search } from "lucide-react"
import { deleteCostComposition } from "@/app/actions/cost-composition-actions"
import { useToast } from "@/hooks/use-toast"
import { DuplicateCompositionDialog } from "./duplicate-composition-dialog"

interface CompositionsTableProps {
    compositions: any[]
}

export function CompositionsTable({ compositions }: CompositionsTableProps) {
    const { toast } = useToast()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search) return compositions
        return compositions.filter(c =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.description.toLowerCase().includes(search.toLowerCase())
        )
    }, [compositions, search])

    async function handleDelete(id: string, code: string) {
        if (!confirm(`Tem certeza que deseja deletar a composição ${code}?`)) {
            return
        }

        setDeletingId(id)
        try {
            const result = await deleteCostComposition(id)

            if (result.success) {
                toast({
                    title: "Composição Deletada",
                    description: `${code} foi removida com sucesso.`,
                })
                window.location.reload()
            } else {
                toast({
                    variant: "destructive",
                    title: "Erro",
                    description: result.error,
                })
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro inesperado",
                description: "Não foi possível deletar a composição.",
            })
        } finally {
            setDeletingId(null)
        }
    }

    if (compositions.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">
                    Nenhuma composição cadastrada ainda.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[180px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Buscar por código ou descrição..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <span className="text-sm text-muted-foreground self-center">
                    {filtered.length} composição(ões)
                </span>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead className="text-right">Custo Direto</TableHead>
                        <TableHead className="text-right">BDI (%)</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                        <TableHead>Projeto</TableHead>
                        <TableHead>Insumos</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                Nenhuma composição encontrada com os filtros aplicados.
                            </TableCell>
                        </TableRow>
                    )}
                    {filtered.map((composition) => (
                        <TableRow key={composition.id}>
                            <TableCell className="font-medium">
                                <Link
                                    href={`/composicoes/${composition.id}`}
                                    className="hover:underline text-blue-600"
                                >
                                    {composition.code}
                                </Link>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                                {composition.description}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{composition.unit}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(Number(composition.directCost))}
                            </TableCell>
                            <TableCell className="text-right">
                                {Number(composition.bdi).toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-700">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                }).format(Number(composition.salePrice))}
                            </TableCell>
                            <TableCell>
                                {composition.project ? (
                                    <Link href={`/projects/${composition.project.id}`}>
                                        <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                                            {composition.project.name}
                                        </Badge>
                                    </Link>
                                ) : (
                                    <Badge>Global</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="text-sm text-muted-foreground">
                                    {(composition._count.materials || 0) +
                                     (composition._count.labor || 0) +
                                     (composition._count.equipment || 0)} itens
                                </div>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" aria-label="Abrir menu de ações">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href={`/composicoes/${composition.id}`}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Ver Detalhes
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => setDuplicatingId(composition.id)}
                                        >
                                            <Copy className="mr-2 h-4 w-4" />
                                            Duplicar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={() => handleDelete(composition.id, composition.code)}
                                            disabled={deletingId === composition.id}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Deletar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {duplicatingId && (
                <DuplicateCompositionDialog
                    compositionId={duplicatingId}
                    onClose={() => setDuplicatingId(null)}
                />
            )}
        </div>
    )
}
