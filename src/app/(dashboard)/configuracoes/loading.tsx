import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function ConfiguracoesLoading() {
  return (
    <PageSkeleton
      titleWidth="w-48"
      cards={3}
      showTable={false}
      showCards={true}
    />
  )
}
