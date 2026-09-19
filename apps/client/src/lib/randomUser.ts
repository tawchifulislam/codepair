const COLORS = [
  '#f87171',
  '#fb923c',
  '#facc15',
  '#4ade80',
  '#22d3ee',
  '#818cf8',
  '#f472b6',
];

export function createGuestUser() {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const name = `Guest-${Math.floor(1000 + Math.random() * 9000)}`;
  return { name, color };
}
