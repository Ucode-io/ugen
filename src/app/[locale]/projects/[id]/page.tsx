import { ProjectWorkspaceClient } from "./project-client"

interface ProjectPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function ProjectSinglePage({ params }: ProjectPageProps) {
  const { id } = await params

  return <ProjectWorkspaceClient projectId={id} />
}
