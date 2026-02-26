'use client'

import dynamic from 'next/dynamic'

const AIAssistant = dynamic(
  () => import('@/components/ai/AIAssistant').then(m => m.AIAssistant),
  { ssr: false }
)

export function AIAssistantWrapper() {
  return <AIAssistant />
}
