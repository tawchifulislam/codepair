'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { socket } from '@/lib/socket';

type CodeEditorProps = {
  roomId: string;
};

export default function CodeEditor({ roomId }: CodeEditorProps) {
  const docRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;

    const handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      socket.emit('sync-update', { roomId, update });
    };
    doc.on('update', handleLocalUpdate);

    socket.on('sync-init', (state: Uint8Array) => {
      Y.applyUpdate(doc, new Uint8Array(state), 'remote');
    });

    socket.on('sync-update', (update: Uint8Array) => {
      Y.applyUpdate(doc, new Uint8Array(update), 'remote');
    });

    socket.connect();
    socket.emit('join-room', roomId);

    return () => {
      socket.off('sync-init');
      socket.off('sync-update');
      doc.off('update', handleLocalUpdate);
      socket.disconnect();
      bindingRef.current?.destroy();
      doc.destroy();
    };
  }, [roomId]);

  const handleMount: OnMount = editor => {
    const doc = docRef.current;
    const model = editor.getModel();
    if (!doc || !model) return;

    const yText = doc.getText('monaco');
    bindingRef.current = new MonacoBinding(yText, model, new Set([editor]));
  };

  return (
    <Editor
      height="100vh"
      defaultLanguage="javascript"
      defaultValue=""
      theme="vs-dark"
      onMount={handleMount}
    />
  );
}
