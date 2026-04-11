'use client'

import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MaintenanceInfo {
  active: boolean
  reason?: string
  estimatedEnd?: string | null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ManutencaoPage() {
  const [info, setInfo] = useState<MaintenanceInfo | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>

    async function fetchStatus() {
      try {
        const res = await fetch('/api/system/maintenance')
        const data = await res.json()
        setInfo(data)
      } catch {
        setInfo({ active: true, reason: 'Não foi possível conectar ao servidor.' })
      }
    }

    fetchStatus()
    timer = setInterval(fetchStatus, 30_000) // auto-refresh 30s

    return () => clearInterval(timer)
  }, [])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  function formatEstimated(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // If maintenance is NOT active, redirect hint
  if (info && !info.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="text-6xl text-green-500">&#10003;</div>
          <h1 className="text-2xl font-bold text-gray-800">Sistema Operacional</h1>
          <p className="text-gray-600">O sistema esta funcionando normalmente.</p>
          <a
            href="/"
            className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir para o sistema
          </a>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Maintenance active
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <style>{`
        @keyframes gear-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gear-spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .gear-animation {
          animation: gear-spin 4s linear infinite;
        }
        .gear-animation-reverse {
          animation: gear-spin-reverse 3s linear infinite;
        }
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        .dot-1 { animation: pulse-dot 1.4s ease-in-out infinite; }
        .dot-2 { animation: pulse-dot 1.4s ease-in-out 0.2s infinite; }
        .dot-3 { animation: pulse-dot 1.4s ease-in-out 0.4s infinite; }
      `}</style>

      <div className="text-center px-6 max-w-lg">
        {/* Gear animation */}
        <div className="relative inline-block mb-8">
          <svg
            className="gear-animation"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" opacity="0" />
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" opacity="0" />
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            className="gear-animation-reverse absolute -bottom-2 -right-4"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Sistema em Manutenção
        </h1>

        {/* Reason */}
        <p className="text-lg text-gray-300 mb-6">
          {info?.reason ?? 'Estamos realizando melhorias no sistema.'}
        </p>

        {/* Estimated return */}
        {info?.estimatedEnd && (
          <div className="bg-white/10 rounded-lg p-4 mb-6 backdrop-blur-sm">
            <p className="text-sm text-gray-400 mb-1">Previsao de retorno</p>
            <p className="text-xl font-semibold text-amber-400">
              {formatEstimated(info.estimatedEnd)}
            </p>
          </div>
        )}

        {/* Loading dots */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          <span className="dot-1 inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="dot-2 inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="dot-3 inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
        </div>

        <p className="text-sm text-gray-500">
          Esta pagina atualiza automaticamente a cada 30 segundos.
        </p>
      </div>
    </div>
  )
}
