import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function RHLoading() {
  return <PageSkeleton titleWidth="w-52" cards={4} tableRows={6} tableColumns={5} />
}
