// Deterministic, reasonably distinct palette for coloring calendar events by room.
const PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];

export function colorForRoomId(roomId: string | undefined): string {
  if (!roomId) return "#52525b"; // neutral gray for multi-room/unassigned events
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    hash = (hash * 31 + roomId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
