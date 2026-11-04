const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function ago(isoString: string, now: number = Date.now()): string {
  const time = new Date(isoString).getTime();
  if (Number.isNaN(time)) return "unknown time";
  const diff = now - time;

  if (diff < MINUTE) return "just now";
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE);
    return `${mins}m ago`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours}h ago`;
  }
  const days = Math.floor(diff / DAY);
  return `${days}d ago`;
}
