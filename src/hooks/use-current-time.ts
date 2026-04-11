'use client'

import { useState, useEffect } from 'react'

const TZ = 'America/Sao_Paulo'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
})

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function formatFullDateTime(date: Date): string {
  const datePart = capitalize(dateFormatter.format(date))
  const timePart = timeFormatter.format(date)
  return `${datePart} - ${timePart}`
}

export interface UseCurrentTimeReturn {
  /** Hora formatada: "14:35" */
  currentTime: string
  /** Data formatada: "Sexta-feira, 11 de Abril de 2026" */
  currentDate: string
  /** Data e hora completa: "Sexta-feira, 11 de Abril de 2026 - 14:35" */
  formattedDateTime: string
}

export function useCurrentTime(): UseCurrentTimeReturn {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    // Alinha o próximo tick ao início do próximo minuto
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()

    const alignTimeout = setTimeout(() => {
      setNow(new Date())

      // Após alinhar, atualiza a cada 60 segundos
      const interval = setInterval(() => {
        setNow(new Date())
      }, 60_000)

      // Limpa o interval no cleanup
      cleanupRef = () => clearInterval(interval)
    }, msUntilNextMinute)

    let cleanupRef = () => {}

    return () => {
      clearTimeout(alignTimeout)
      cleanupRef()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentTime = timeFormatter.format(now)
  const currentDate = capitalize(dateFormatter.format(now))
  const formattedDateTime = formatFullDateTime(now)

  return { currentTime, currentDate, formattedDateTime }
}
