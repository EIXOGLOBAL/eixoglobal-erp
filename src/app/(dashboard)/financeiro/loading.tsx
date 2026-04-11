import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function FinanceiroLoading() {
  return <PageSkeleton titleWidth="w-40" cards={4} tableRows={8} tableColumns={6} />
}
