/**
 * Beancount 交易首行标签处理（忽略引号字符串内的 #）
 *
 * 与后端 project/apps/translate/services/beancount_header_tags.py 保持一致，
 * 便于前端在不请求后端的情况下预演标签增删后的首行文本。
 */

export interface HeaderTagMatch {
  start: number
  end: number
  path: string
  text: string
}

const HEADER_TAG_TOKEN_RE = /^#\S+/

/** 返回首行中引号外的标签：起止下标、路径（不含 #）与原始文本。 */
export function findHeaderTagsOutsideQuotes(line: string): HeaderTagMatch[] {
  const tags: HeaderTagMatch[] = []
  let inQuote = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === '"') {
      inQuote = !inQuote
      i += 1
      continue
    }
    if (!inQuote && ch === '#') {
      const match = HEADER_TAG_TOKEN_RE.exec(line.slice(i))
      if (match) {
        tags.push({
          start: i,
          end: i + match[0].length,
          path: match[0].slice(1),
          text: match[0]
        })
        i += match[0].length
        continue
      }
    }
    i += 1
  }
  return tags
}

/** 移除首行引号外的 #tag，保留引号内文本。 */
export function stripHeaderTagsOutsideQuotes(line: string): string {
  const parts: string[] = []
  let inQuote = false
  let i = 0
  while (i < line.length) {
    const ch = line[i]
    if (ch === '"') {
      parts.push('"')
      inQuote = !inQuote
      i += 1
      continue
    }
    if (!inQuote && ch === '#') {
      const match = HEADER_TAG_TOKEN_RE.exec(line.slice(i))
      if (match) {
        i += match[0].length
        continue
      }
    }
    parts.push(ch)
    i += 1
  }
  return parts.join('').replace(/ +/g, ' ').trimEnd()
}

/** 将首行引号外标签替换为 tagPaths 对应的 #path 列表。 */
export function replaceHeaderTagsOutsideQuotes(line: string, tagPaths: string[]): string {
  const base = stripHeaderTagsOutsideQuotes(line)
  if (!tagPaths.length) {
    return base
  }
  const tagStr = tagPaths.map((path) => `#${path}`).join(' ')
  return `${base} ${tagStr}`.trimEnd()
}

/**
 * 按 tag 覆盖计算有效标签并写回首行。
 *
 * 对齐后端 ParseReviewService.apply_tag_overrides + set_header_tags：
 * 先按 removed_paths 过滤，再追加尚不存在的 added_paths（均忽略大小写）。
 */
export function applyTagOverridesToHeader(
  formatted: string,
  tagDetails: Array<{ path: string }>,
  overrides?: { removed_paths?: string[]; added_paths?: string[] }
): string {
  if (!formatted) {
    return formatted
  }

  const removed = new Set((overrides?.removed_paths ?? []).map((path) => path.toLowerCase()))
  const effectivePaths: string[] = []
  const existing = new Set<string>()

  for (const detail of tagDetails ?? []) {
    const path = detail?.path ?? ''
    if (!path || removed.has(path.toLowerCase())) continue
    effectivePaths.push(path)
    existing.add(path.toLowerCase())
  }
  for (const path of overrides?.added_paths ?? []) {
    if (!path || existing.has(path.toLowerCase())) continue
    effectivePaths.push(path)
    existing.add(path.toLowerCase())
  }

  const lines = formatted.split('\n')
  lines[0] = replaceHeaderTagsOutsideQuotes(lines[0], effectivePaths)
  return lines.join('\n')
}
