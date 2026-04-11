/**
 * Layout isolado para a rota de impressão do Fluxo de Caixa.
 * Ao definir um layout próprio nesta sub-rota, o Next.js App Router
 * ignora o layout pai (dashboard) e não renderiza a sidebar/header.
 */
export default function PrintLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
