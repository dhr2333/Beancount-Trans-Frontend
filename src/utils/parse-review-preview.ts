/**
 * 解析审核「预览所有条目」文本解析与条目对齐
 */

export interface PreviewAlignSourceEntry {
  uuid: string
  edited_formatted: string
}

export interface PreviewAlignResult {
  kept: Array<{ uuid: string; edited_formatted: string }>
  removedCount: number
}

export function normalizeEntryText(text: string): string {
  return (text || '').replace(/\n+$/, '').trim()
}

export function parsePreviewContent(content: string): string[] {
  return content
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
}

/**
 * 将预览块与列表条目对齐。
 * 条数相等时按索引对应；不等时按有序子序列匹配（跳过的条目视为已删除）。
 */
export function alignPreviewBlocksToEntries(
  blocks: string[],
  entries: PreviewAlignSourceEntry[]
): PreviewAlignResult {
  if (blocks.length === entries.length) {
    return {
      kept: blocks.map((block, index) => ({
        uuid: entries[index].uuid,
        edited_formatted: normalizeEntryText(block)
      })),
      removedCount: 0
    }
  }

  const kept: PreviewAlignResult['kept'] = []
  let entryIdx = 0

  for (const block of blocks) {
    const normBlock = normalizeEntryText(block)
    let foundIdx = -1

    for (let j = entryIdx; j < entries.length; j++) {
      if (normalizeEntryText(entries[j].edited_formatted) === normBlock) {
        foundIdx = j
        break
      }
    }

    if (foundIdx >= 0) {
      kept.push({
        uuid: entries[foundIdx].uuid,
        edited_formatted: normBlock
      })
      entryIdx = foundIdx + 1
    } else if (entryIdx < entries.length) {
      kept.push({
        uuid: entries[entryIdx].uuid,
        edited_formatted: normBlock
      })
      entryIdx += 1
    }
  }

  const keptUuidSet = new Set(kept.map((item) => item.uuid))
  const removedCount = entries.filter((entry) => !keptUuidSet.has(entry.uuid)).length

  return { kept, removedCount }
}
