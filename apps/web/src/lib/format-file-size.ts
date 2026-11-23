const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * 1024

export function formatFileSize(bytes: number) {
  return bytes >= BYTES_PER_MB
    ? `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / BYTES_PER_KB))} KB`
}
