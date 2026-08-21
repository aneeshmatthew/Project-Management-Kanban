const LABEL_PALETTE = [
  "#5B8DEF", // blue
  "#4FD1C5", // teal
  "#E8A33D", // amber
  "#B683E8", // violet
  "#F0546B", // red
  "#7FC97F", // green
];

/** Deterministic color for a label string, so the same label always renders the same pill color. */
export function labelColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  return LABEL_PALETTE[Math.abs(hash) % LABEL_PALETTE.length];
//return LABEL_PALETTE[Math.abs(hash) % LABEL_PALETTE.length]!;
}
