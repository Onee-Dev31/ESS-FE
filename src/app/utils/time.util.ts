export function formatElapsedTime(hours: number): string {
  if (hours < 24) {
    return `${Math.floor(hours)} hours ago`;
  }

  const days = Math.floor(hours / 24);

  return days === 1 ? '1 day ago' : `${days} days ago`;
}
