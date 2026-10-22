import StoriesExperience from '@/components/stories/StoriesExperience'

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StoriesExperience storyId={id} />
}
