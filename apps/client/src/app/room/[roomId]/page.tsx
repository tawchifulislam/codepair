import CodeEditorLoader from '@/components/CodeEditorLoader';

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <CodeEditorLoader roomId={roomId} />;
}
