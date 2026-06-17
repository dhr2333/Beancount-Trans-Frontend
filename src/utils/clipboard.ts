export async function copyText(text: string): Promise<void> {
  if (!text) {
    throw new Error('没有可复制的内容')
  }

  try {
    await navigator.clipboard.writeText(text)
    return
  } catch {
    // fallback below
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  try {
    const ok = document.execCommand('copy')
    if (!ok) {
      throw new Error('复制失败')
    }
  } finally {
    document.body.removeChild(textArea)
  }
}
