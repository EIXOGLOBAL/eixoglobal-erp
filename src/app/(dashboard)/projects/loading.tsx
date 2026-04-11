import { PageSkeleton } from '@/components/ui/page-skeleton'

export default function ProjectsLoading() {
  return <PageSkeleton titleWidth="w-36" cards={4} tableRows={8} tableColumns={5} />
}
