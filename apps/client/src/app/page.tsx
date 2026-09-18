'use client';

import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleCreateRoom = () => {
    const roomId = crypto.randomUUID();
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <button
        onClick={handleCreateRoom}
        className="rounded-md bg-white px-6 py-3 font-medium text-black"
      >
        Create Room
      </button>
    </div>
  );
}
