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
        <p><strong>Mensagem:</strong> {error?.message ?? '(sem mensagem)'}</p>
        <p><strong>Nome:</strong> {error?.name ?? 'Error'}</p>
        <p><strong>Digest:</strong> {error?.digest ?? '(sem digest)'}</p>
        {error?.stack && (
          <pre style={{ background: '#f3f4f6', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 12 }}>
            {error.stack}
          </pre>
        )}
        <button onClick={() => reset()} style={{ padding: '8px 16px', background: '#111', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </body>
    </html>
  )
}
