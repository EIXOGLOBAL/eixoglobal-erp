import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-6 px-4">
                <div className="space-y-2">
                    <h1 className="text-8xl font-bold text-muted-foreground/30">404</h1>
                    <h2 className="text-2xl font-bold tracking-tight">Página não encontrada</h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        O recurso que você está procurando não existe ou foi movido.
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" asChild>
                        <Link href="javascript:history.back()">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Voltar
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/dashboard">
                            <Home className="h-4 w-4 mr-2" />
                            Ir para o Dashboard
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
