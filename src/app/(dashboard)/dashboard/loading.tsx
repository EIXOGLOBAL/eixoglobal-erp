import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function DashboardLoading() {
  return <PageSkeleton titleWidth="w-44" cards={4} tableRows={6} tableColumns={4} />
}
