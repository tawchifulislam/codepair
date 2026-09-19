'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as Y from 'yjs';
import {
  Awareness,
  encodeAwarenessUpdate,
  applyAwarenessUpdate,
} from 'y-protocols/awareness';
import { MonacoBinding } from 'y-monaco';
import { socket } from '@/lib/socket';
import { createGuestUser } from '@/lib/randomUser';

type CodeEditorProps = {
  roomId: string;
};

export default function CodeEditor({ roomId }: CodeEditorProps) {
  const docRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    docRef.current = doc;

    const awareness = new Awareness(doc);
    awarenessRef.current = awareness;
    awareness.setLocalStateField('user', createGuestUser());

    const handleLocalUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return;
      socket.emit('sync-update', { roomId, update });
    };
    doc.on('update', handleLocalUpdate);

    const handleAwarenessUpdate = (
      {
        added,
        updated,
        removed,
      }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === 'remote') return;
      const changedClients = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(awareness, changedClients);
      socket.emit('awareness-update', { roomId, update });
    };
    awareness.on('update', handleAwarenessUpdate);

    socket.on('sync-init', (state: Uint8Array) => {
      Y.applyUpdate(doc, new Uint8Array(state), 'remote');
    });

    socket.on('sync-update', (update: Uint8Array) => {
      Y.applyUpdate(doc, new Uint8Array(update), 'remote');
    });

    socket.on('awareness-update', (update: Uint8Array) => {
      applyAwarenessUpdate(awareness, new Uint8Array(update), 'remote');
    });

    socket.connect();
    socket.emit('join-room', roomId);

    return () => {
      socket.off('sync-init');
      socket.off('sync-update');
      socket.off('awareness-update');
      doc.off('update', handleLocalUpdate);
      awareness.off('update', handleAwarenessUpdate);
      socket.disconnect();
      bindingRef.current?.destroy();
      awareness.destroy();
      doc.destroy();
    };
  }, [roomId]);

  const handleMount: OnMount = editor => {
    const doc = docRef.current;
    const awareness = awarenessRef.current;
    const model = editor.getModel();
    if (!doc || !awareness || !model) return;

    const yText = doc.getText('monaco');
    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      awareness,
    );
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
