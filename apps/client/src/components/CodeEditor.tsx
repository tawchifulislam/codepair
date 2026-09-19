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

const STYLE_ID = 'yjs-awareness-styles';

function updateAwarenessStyles(awareness: Awareness) {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  const rules: string[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return;
    const user = state.user as { name: string; color: string } | undefined;
    if (!user) return;

    rules.push(`
      .yRemoteSelection-${clientId} {
        background-color: ${user.color}55;
      }
      .yRemoteSelectionHead-${clientId} {
        position: absolute;
        border-left: 2px solid ${user.color};
      }
      .yRemoteSelectionHead-${clientId}::after {
        content: "${user.name}";
        position: absolute;
        top: -1.1em;
        left: -2px;
        font-size: 10px;
        line-height: 1.2;
        background-color: ${user.color};
        color: #000;
        padding: 0 4px;
        border-radius: 2px;
        white-space: nowrap;
        pointer-events: none;
      }
    `);
  });

  styleEl.textContent = rules.join('\n');
}

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
    awareness.on('change', () => updateAwarenessStyles(awareness));

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
      awareness.destroy();
      socket.disconnect();
      bindingRef.current?.destroy();
      doc.destroy();
      document.getElementById(STYLE_ID)?.remove();
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
