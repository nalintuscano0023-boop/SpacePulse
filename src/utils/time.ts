export function formatUtcTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${hours}:${minutes}:${seconds} UTC`;
}

export function formatUtcDateFull(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const day = pad(date.getUTCDate());
  const time = formatUtcTime(date);
  return `${day} ${month} ${year} • ${time}`;
}

export function getRelativeTimeStr(isoString: string): string {
  try {
    const epoch = new Date(isoString).getTime();
    if (isNaN(epoch)) return isoString;
    const diffSec = Math.round((Date.now() - epoch) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return isoString;
  }
}
