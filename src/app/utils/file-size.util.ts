export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const unitSize = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(unitSize)),
    units.length - 1,
  );
  const value = bytes / Math.pow(unitSize, unitIndex);

  return `${parseFloat(value.toFixed(2))} ${units[unitIndex]}`;
}
