'use client'

import dynamic from 'next/dynamic'

const AIChat = dynamic(
  () => import('@/components/ai/AIChat').then(m => m.AIChat),
  { ssr: false }
)

export function AIAssistantWrapper() {
  return <AIChat />
}
