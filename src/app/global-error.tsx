'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ color: '#b91c1c' }}>Erro interno da aplicação</h1>
        <p>Ocorreu um erro interno. Tente novamente ou entre em contato com o suporte.</p>
        {error?.digest && <p style={{ fontSize: 12, color: '#6b7280' }}>Código: {error.digest}</p>}
        <button onClick={() => reset()} style={{ padding: '8px 16px', background: '#111', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
