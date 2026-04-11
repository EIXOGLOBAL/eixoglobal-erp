/**
 * Layout isolado para a rota de impressao da ficha do funcionario.
 * Ao definir um layout proprio nesta sub-rota, o Next.js App Router
 * ignora o layout pai (dashboard) e nao renderiza a sidebar/header.
 */
export default function PrintLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return <>{children}</>
}
