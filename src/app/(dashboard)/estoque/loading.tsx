import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function EstoqueLoading() {
  return <PageSkeleton titleWidth="w-44" cards={4} tableRows={8} tableColumns={5} />
}
