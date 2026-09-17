'use client';

import Editor from '@monaco-editor/react';

export default function CodeEditor() {
  return (
    <Editor
      height="100vh"
      defaultLanguage="javascript"
      defaultValue="// start coding here"
      theme="vs-dark"
    />
  );
}
