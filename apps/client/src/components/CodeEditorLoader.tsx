'use client';

import dynamic from 'next/dynamic';

const CodeEditor = dynamic(
  () => import('./CodeEditor').then(mod => mod.default),
  {
    ssr: false,
    loading: () => <p className="p-4 text-white">Loading editor...</p>,
  },
);

export default function CodeEditorLoader({ roomId }: { roomId: string }) {
  return <CodeEditor roomId={roomId} />;
}
