// How long a saved file's object URL is kept: some browsers read the file after the click returns.
const OBJECT_URL_LIFETIME_MS = 10_000

// Hands a downloaded file to the browser to save under the given name.
export function saveFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()

  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS)
}
