/**
 * 解析页结果草稿：解析结果暂存 sessionStorage，
 * 供匿名用户「写入账本」引导登录后回跳恢复，避免重新上传。
 *
 * 仅存会话（关闭标签即失效），不长期留存账单数据。
 */
import type { FormattedEntry, TagDetail } from '../types/parse-review'

const DRAFT_KEY = 'trans_parse_draft'

/** 草稿条目：与解析页本地条目结构一致（含本地标签来源，便于恢复后继续调整） */
export type ParseDraftEntry = FormattedEntry & {
  _source_tag_details?: TagDetail[]
}

export interface ParseDraft {
  entries: ParseDraftEntry[]
  savedAt: number
}

export function saveParseDraft(entries: ParseDraftEntry[]): void {
  if (!entries.length) return
  try {
    const draft: ParseDraft = { entries, savedAt: Date.now() }
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    // 存储不可用（隐私模式/超配额）时静默失败，不影响主流程
    console.warn('保存解析草稿失败:', error)
  }
}

export function loadParseDraft(): ParseDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as ParseDraft
    if (!Array.isArray(draft?.entries) || draft.entries.length === 0) {
      clearParseDraft()
      return null
    }
    return draft
  } catch (error) {
    console.warn('读取解析草稿失败:', error)
    clearParseDraft()
    return null
  }
}

export function clearParseDraft(): void {
  sessionStorage.removeItem(DRAFT_KEY)
}
