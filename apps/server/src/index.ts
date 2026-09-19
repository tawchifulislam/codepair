import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as Y from 'yjs';

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const docs = new Map<string, Y.Doc>();

function getDoc(roomId: string): Y.Doc {
  let doc = docs.get(roomId);
  if (!doc) {
    doc = new Y.Doc();
    docs.set(roomId, doc);
  }
  return doc;
}

io.on('connection', socket => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    const doc = getDoc(roomId);
    socket.emit('sync-init', Y.encodeStateAsUpdate(doc));
  });

  socket.on(
    'sync-update',
    ({ roomId, update }: { roomId: string; update: Uint8Array }) => {
      const doc = getDoc(roomId);
      Y.applyUpdate(doc, new Uint8Array(update));
      socket.to(roomId).emit('sync-update', update);
    },
  );

  socket.on(
    'awareness-update',
    ({ roomId, update }: { roomId: string; update: Uint8Array }) => {
      socket.to(roomId).emit('awareness-update', update);
    },
  );

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
