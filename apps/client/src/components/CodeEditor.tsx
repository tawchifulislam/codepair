'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { socket } from '@/lib/socket';

const ROOM_ID = 'test-room';

export default function CodeEditor() {
  const isRemoteChange = useRef(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  useEffect(() => {
    socket.connect();
    socket.emit('join-room', ROOM_ID);

    socket.on('code-change', (code: string) => {
      const editor = editorRef.current;
      if (!editor) return;

      isRemoteChange.current = true;
      editor.setValue(code);
    });

    return () => {
      socket.off('code-change');
      socket.disconnect();
    };
  }, []);

  const handleMount: OnMount = editor => {
    editorRef.current = editor;
  };

  const handleChange = (value: string | undefined) => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    socket.emit('code-change', { roomId: ROOM_ID, code: value ?? '' });
  };

  return (
    <Editor
      height="100vh"
      defaultLanguage="javascript"
      defaultValue="// start coding here"
      theme="vs-dark"
      onMount={handleMount}
      onChange={handleChange}
    />
  );
}
