<template>
  <div class="parse-review-form">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>解析审核 - {{ fileName }}</h2>
        <!-- <el-text v-if="remainingTime" type="info" size="small" style="display: block; margin-top: 4px;">
          剩余时间：{{ remainingTime }}
        </el-text> -->
      </div>
      <div class="header-right">
        <el-button @click="handleReparseAll" :loading="loading.reparseAll">
          重新解析
        </el-button>
        <el-button @click="handleBack">返回</el-button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-loading="loading.results" class="content-container">
      <!-- 解析结果表格 -->
      <el-table v-if="formattedEntries.length > 0" :data="formattedEntries" style="width: 100%" border
        highlight-current-row>
        <el-table-column label="Beancount 条目预览" min-width="400">
          <template #default="scope">
            <div
              :class="getEntryClasses(scope.row.uuid, scope.row.edited_formatted)"
            >
              <template v-if="!isEntryTextEditMode(scope.row.uuid)">
                <div
                  class="entry-preview-render"
                  role="textbox"
                  tabindex="0"
                  @click="onEntryPreviewShellClick(scope.row, $event)"
                  @keydown.enter.prevent="startTextEdit(scope.row.uuid)"
                >
                  <div
                    v-for="(pline, li) in buildLineSegments(scope.row.edited_formatted)"
                    :key="li"
                    class="entry-preview-line"
                  >
                    <template v-for="(seg, si) in pline.segments" :key="`${li}-${si}`">
                      <button
                        v-if="seg.kind === 'account'"
                        type="button"
                        class="entry-preview-account-link"
                        @click.stop="openAccountAssistFromSegment(scope.row, seg, $event)"
                      >
                        {{ seg.text }}
                      </button>
                      <span v-else class="entry-preview-plain">{{ seg.text }}</span>
                    </template>
                  </div>
                </div>
              </template>
              <el-input
                v-else
                :ref="(el) => setEntryInputRef(scope.row.uuid, el)"
                v-model="scope.row.edited_formatted"
                type="textarea"
                :autosize="{ minRows: 7, maxRows: 40 }"
                class="entry-preview"
                placeholder="编辑 Beancount 条目；失焦后返回预览。过账行中账户在预览模式下点击可更换"
                @blur="onEntryTextareaBlur(scope.row)"
                @input="clearTabCompleteSession(scope.row.uuid)"
                @keydown.tab="bindEntryPreviewTab(scope.row)"
              />
              <div v-if="errorEntries[scope.row.uuid]" class="validation-message error-message">
                {{ errorEntries[scope.row.uuid] }}
              </div>
              <div v-else-if="validationWarnings[scope.row.uuid]" class="validation-message warning-message">
                {{ validationWarnings[scope.row.uuid] }}
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="AI分类反馈" min-width="400">
          <template #default="scope">
            <div class="ai-classification-container">
              <div class="current-selection">
                <span class="label">当前分类：</span>
                <el-tag v-if="scope.row.selected_expense_key" type="success" class="selected-tag">
                  {{ scope.row.selected_expense_key }}
                </el-tag>
                <span v-else class="no-category-tip">无分类建议</span>
              </div>
              <div v-if="scope.row.expense_candidates_with_score && scope.row.expense_candidates_with_score.length > 0"
                class="candidates">
                <span class="label">候选分类：</span>
                <div class="candidate-tags">
                  <el-tag v-for="(candidate, idx) in scope.row.expense_candidates_with_score" :key="idx"
                    :type="candidate.key === scope.row.selected_expense_key ? 'success' : 'info'"
                    :class="['candidate-tag', { 'is-selected': candidate.key === scope.row.selected_expense_key }]"
                    @click="handleKeywordSelect(scope.row.uuid, candidate.key)">
                    {{ candidate.key }}
                    <span class="score" v-if="candidate.score !== undefined">
                      ({{ candidate.score }})
                    </span>
                  </el-tag>
                  <el-button size="small" plain @click="handleOpenMappingDialog(scope.row)" class="add-mapping-btn">
                    <el-icon><Plus /></el-icon> 新增映射
                  </el-button>
                </div>
              </div>
              <div v-else class="candidates">
                <span class="label muted">无候选分类</span>
                <el-button size="small" plain @click="handleOpenMappingDialog(scope.row)" class="add-mapping-btn">
                  <el-icon><Plus /></el-icon> 新增映射
                </el-button>
              </div>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 空状态 -->
      <el-empty v-else description="暂无解析结果" />
    </div>

    <!-- 底部操作栏 -->
    <div class="action-bar">
      <el-button @click="handlePreview" :disabled="formattedEntries.length === 0">
        预览
      </el-button>
      <el-button type="primary" @click="handleConfirmWrite" :loading="loading.confirm"
        :disabled="formattedEntries.length === 0">
        确认写入
      </el-button>
    </div>

    <!-- 预览对话框 -->
    <el-dialog v-model="showPreviewDialog" title="预览所有条目" width="80%">
      <el-input v-model="previewContent" type="textarea" :rows="20" class="preview-textarea"
        placeholder="可以在此处编辑所有条目，编辑后点击保存按钮将更新到列表中" />
      <template #footer>
        <el-button @click="showPreviewDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSavePreview" :loading="loading.savePreview">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 内联新增映射对话框 -->
    <el-dialog v-model="mappingDialog.visible" title="新增映射" width="500px">
      <el-form :model="mappingForm" :rules="mappingRules" ref="mappingFormRef" label-width="100px">
        <el-form-item label="关键字" prop="key">
          <el-input v-model="mappingForm.key" placeholder="请输入关键字" />
        </el-form-item>
        <el-form-item label="映射账户" prop="accountId">
          <AccountSelector v-model="mappingForm.accountId"
            placeholder="请选择或搜索账户" />
        </el-form-item>
        <el-form-item :label="mappingForm.type === 'expense' ? '对方' : '付款方'" prop="party">
          <el-input v-model="mappingForm.party" :placeholder="mappingForm.type === 'expense' ? '如腾讯、星巴克' : '选填：付款方信息'" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mappingDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleMappingSubmit" :loading="mappingDialog.loading">
          保存并重解析
        </el-button>
      </template>
    </el-dialog>

    <!-- 点击预览内账户：浮动选择器（Teleport 至 body，兼容 EP 2.3 无 trigger=manual 类型） -->
    <Teleport to="body">
      <div
        v-if="accountPopover.visible"
        class="parse-review-account-overlay"
        @click.self="closeAccountAssistOverlay"
      >
        <div
          class="parse-review-account-panel"
          :style="accountAssistPanelStyle"
          @click.stop
        >
          <div class="parse-review-account-original">{{ accountPopover.originalToken }}</div>
          <el-input
            ref="accountOverlayQueryRef"
            v-model="accountAssistQuery"
            class="parse-review-account-query"
            clearable
            placeholder="输入筛选或完整账户名；↑↓ 选择，回车 / Tab 确认"
            @keydown="onOverlayQueryKeydown"
          />
          <ul
            v-if="overlayAccountMatches.length > 0"
            ref="accountSuggestionsListRef"
            class="parse-review-account-suggestions"
            role="listbox"
          >
            <li
              v-for="(name, idx) in overlayAccountMatches"
              :key="name"
              role="option"
              :class="[
                'parse-review-account-suggestion-item',
                { 'is-active': idx === overlayActiveIndex }
              ]"
              @click="applyAccountReplacementByName(name)"
            >
              {{ name }}
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import AccountSelector from '../../components/common/AccountSelector.vue'
import axios from '../../utils/request'
import {
  getParseResults,
  reparseEntry,
  updateEntryEdit,
  confirmWrite,
  reparseAll
} from '../../api/parse-review'
import { getTask } from '../../api/reconciliation'
import type { FormattedEntry, ParseResult, ErrorEntry } from '../../types/parse-review'
import type { ScheduledTask } from '../../types/reconciliation'
import { emitTaskBannerRefresh } from '../../utils/accountEvents'

const route = useRoute()
const router = useRouter()

const taskId = computed(() => parseInt(route.params.taskId as string))

const fileName = ref('')
const formattedEntries = ref<FormattedEntry[]>([])
const loading = ref({
  results: false,
  reparseAll: false,
  confirm: false,
  savePreview: false
})

const showPreviewDialog = ref(false)
const previewContent = ref('')

const taskInfo = ref<ScheduledTask | null>(null)
const parseResult = ref<ParseResult | null>(null)

const errorEntries = ref<Record<string, string>>({})
const validationWarnings = ref<Record<string, string>>({})

/** 与后端 /account/tree/ 及 AccountSelector 注入结构一致 */
const accountTreeForAssist = ref<any[]>([])
const flatAccountNames = ref<string[]>([])
const entryInputRefs = new Map<string, { textarea?: HTMLTextAreaElement }>()

/** 某条条目是否处于整段 textarea 编辑模式（默认 false = 结构化预览） */
const entryTextEditMode = ref<Record<string, boolean>>({})

const isEntryTextEditMode = (uuid: string) => !!entryTextEditMode.value[uuid]

const setEntryTextEditMode = (uuid: string, on: boolean) => {
  if (on) {
    entryTextEditMode.value = { ...entryTextEditMode.value, [uuid]: true }
  } else {
    const next = { ...entryTextEditMode.value }
    delete next[uuid]
    entryTextEditMode.value = next
  }
}

const accountPopover = ref({
  visible: false,
  x: 0,
  y: 0,
  entryUuid: '',
  replaceStart: 0,
  replaceEnd: 0,
  originalToken: ''
})

const accountAssistQuery = ref('')
const accountOverlayQueryRef = ref<{ focus: () => void } | null>(null)
const accountSuggestionsListRef = ref<HTMLUListElement | null>(null)
/** 浮层建议列表当前高亮下标（↑↓ 移动，回车 / Tab 应用该项） */
const overlayActiveIndex = ref(0)

type TabCompleteSession = { start: number; end: number; candidatesKey: string; idx: number }
const tabCompleteByUuid = ref<Record<string, TabCompleteSession | undefined>>({})

const accountAssistPanelStyle = computed(() => {
  const pad = 8
  const panelW = 360
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const left = Math.max(pad, Math.min(accountPopover.value.x, vw - panelW - pad))
  const top = Math.max(pad, Math.min(accountPopover.value.y + pad, vh - 200))
  return {
    position: 'fixed' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${panelW}px`,
    zIndex: 3001
  }
})

function closeAccountAssistOverlay() {
  accountPopover.value.visible = false
  accountAssistQuery.value = ''
}

const onEscapeCloseOverlay = (ev: KeyboardEvent) => {
  if (ev.key === 'Escape' && accountPopover.value.visible) {
    closeAccountAssistOverlay()
  }
}

/** 查询串是否为账户名的有序子序列（如 wefu → …WechatFund） */
function isOrderedSubsequence(haystackLower: string, needleLower: string): boolean {
  if (!needleLower) return true
  let i = 0
  for (let j = 0; j < haystackLower.length && i < needleLower.length; j++) {
    if (haystackLower[j] === needleLower[i]) i++
  }
  return i === needleLower.length
}

function accountMatchesAssistQuery(account: string, qLower: string): boolean {
  if (!qLower) return false
  const al = account.toLowerCase()
  if (al.includes(qLower)) return true
  return isOrderedSubsequence(al, qLower)
}

const overlayAccountMatches = computed(() => {
  if (!accountPopover.value.visible) return []
  const q = accountAssistQuery.value.trim().toLowerCase()
  if (!q) return []
  const hits = flatAccountNames.value.filter((a) => accountMatchesAssistQuery(a, q))
  hits.sort((a, b) => {
    const al = a.toLowerCase()
    const bl = b.toLowerCase()
    const ai = al.includes(q) ? 0 : 1
    const bi = bl.includes(q) ? 0 : 1
    if (ai !== bi) return ai - bi
    if (a.length !== b.length) return a.length - b.length
    return a.localeCompare(b)
  })
  return hits.slice(0, 80)
})

watch(overlayAccountMatches, async () => {
  overlayActiveIndex.value = 0
  await nextTick()
  const ul = accountSuggestionsListRef.value
  const active = ul?.querySelector('.parse-review-account-suggestion-item.is-active')
  active?.scrollIntoView({ block: 'nearest' })
})

watch(overlayActiveIndex, async () => {
  await nextTick()
  const ul = accountSuggestionsListRef.value
  if (!ul) return
  const active = ul.querySelector('.parse-review-account-suggestion-item.is-active')
  active?.scrollIntoView({ block: 'nearest' })
})

watch(
  () => accountPopover.value.visible,
  async (visible) => {
    if (visible) {
      window.addEventListener('keydown', onEscapeCloseOverlay)
      accountAssistQuery.value = ''
      await nextTick()
      await nextTick()
      accountOverlayQueryRef.value?.focus?.()
    } else {
      window.removeEventListener('keydown', onEscapeCloseOverlay)
      accountAssistQuery.value = ''
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEscapeCloseOverlay)
})

/** 根为五大类，段内允许非空白（含中文等） */
const ACCOUNT_FULL_RE = /^(?:Assets|Expenses|Income|Liabilities|Equity)(?::[^\s]+)*$/
const POSTING_LINE_RE = /^\s+[!\*]?\s*(?:Assets|Expenses|Income|Liabilities|Equity)(?::|$)/
/** 从过账行提取账户子串（不含行首缩进与金额） */
const POSTING_ACCOUNT_IN_LINE =
  /^\s+[!\*]?\s*((?:Assets|Expenses|Income|Liabilities|Equity)(?::[^\s]+)*)(?=\s|$)/

type PreviewAccountSegment = {
  kind: 'account'
  text: string
  token: string
  absStart: number
  absEnd: number
}
type PreviewTextSegment = { kind: 'text'; text: string }
type PreviewSegment = PreviewAccountSegment | PreviewTextSegment
type PreviewLine = { segments: PreviewSegment[] }

function parseSingleLineToSegments(line: string, lineBase: number): PreviewSegment[] {
  if (!isPostingLine(line)) {
    return [{ kind: 'text', text: line }]
  }
  const m = POSTING_ACCOUNT_IN_LINE.exec(line)
  if (!m || !ACCOUNT_FULL_RE.test(m[1])) {
    return [{ kind: 'text', text: line }]
  }
  const token = m[1]
  const from = m.index !== undefined ? m.index : 0
  const idxToken = line.indexOf(token, from)
  if (idxToken < 0) {
    return [{ kind: 'text', text: line }]
  }
  const absStart = lineBase + idxToken
  const absEnd = absStart + token.length
  const prefix = line.slice(0, idxToken)
  const suffix = line.slice(idxToken + token.length)
  const segs: PreviewSegment[] = []
  if (prefix) segs.push({ kind: 'text', text: prefix })
  segs.push({ kind: 'account', text: token, token, absStart, absEnd })
  if (suffix) segs.push({ kind: 'text', text: suffix })
  return segs.length ? segs : [{ kind: 'text', text: line }]
}

/** 将全文拆成多行，每行若干 text / account 片段（含全文下标） */
function buildLineSegments(fullText: string): PreviewLine[] {
  const lines = fullText.split('\n')
  const out: PreviewLine[] = []
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    out.push({ segments: parseSingleLineToSegments(line, offset) })
    offset += line.length
    if (i < lines.length - 1) offset += 1
  }
  return out
}

function rebuildFlatAccountNames() {
  const set = new Set<string>()
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      if (n.account) set.add(n.account)
      if (n.children?.length) walk(n.children)
    }
  }
  walk(accountTreeForAssist.value)
  flatAccountNames.value = Array.from(set).sort((a, b) => a.localeCompare(b))
}

async function loadAccountTreeAssist() {
  try {
    const response = await axios.get('/account/tree/')
    let data: any[] = []
    if (Array.isArray(response.data)) data = response.data as any[]
    else if (response.data && Array.isArray(response.data.results)) {
      data = response.data.results as any[]
    }
    accountTreeForAssist.value = data
    rebuildFlatAccountNames()
  } catch {
    accountTreeForAssist.value = []
    flatAccountNames.value = []
  }
}

function getLineBounds(text: string, index: number) {
  let lineStart = 0
  let i = index
  while (i > 0 && text[i - 1] !== '\n') i--
  lineStart = i
  let lineEnd = index
  while (lineEnd < text.length && text[lineEnd] !== '\n') lineEnd++
  return { lineStart, lineEnd, line: text.slice(lineStart, lineEnd) }
}

function isPostingLine(line: string) {
  return POSTING_LINE_RE.test(line)
}

/** 全局下标 pos 落在过账行账户 token 内时，返回该 token 在全文中的起止 */
function findAccountRangeAtGlobalIndex(text: string, pos: number) {
  const { lineStart, line } = getLineBounds(text, pos)
  if (!isPostingLine(line)) return null
  const m = POSTING_ACCOUNT_IN_LINE.exec(line)
  if (!m) return null
  const token = m[1]
  if (!ACCOUNT_FULL_RE.test(token)) return null
  const from = m.index !== undefined ? m.index : 0
  const relAccStart = line.indexOf(token, from)
  if (relAccStart < 0) return null
  const absStart = lineStart + relAccStart
  const absEnd = absStart + token.length
  if (pos < absStart || pos > absEnd) return null
  return { start: absStart, end: absEnd, token }
}

function openAccountAssist(payload: {
  entryUuid: string
  replaceStart: number
  replaceEnd: number
  originalToken: string
  clientX: number
  clientY: number
}) {
  accountPopover.value = {
    visible: true,
    x: payload.clientX,
    y: payload.clientY,
    entryUuid: payload.entryUuid,
    replaceStart: payload.replaceStart,
    replaceEnd: payload.replaceEnd,
    originalToken: payload.originalToken
  }
}

function openAccountAssistFromSegment(row: FormattedEntry, seg: PreviewAccountSegment, e: MouseEvent) {
  openAccountAssist({
    entryUuid: row.uuid,
    replaceStart: seg.absStart,
    replaceEnd: seg.absEnd,
    originalToken: seg.token,
    clientX: e.clientX,
    clientY: e.clientY
  })
}

/** 将视口坐标映射为与 `edited_formatted` 一致的字符偏移（块级行间为换行符） */
function getCharOffsetInPreviewRoot(
  root: HTMLElement,
  clientX: number,
  clientY: number
): number | null {
  const doc = root.ownerDocument
  if (!doc) return null
  let node: Node | null = null
  let offset = 0
  const d = doc as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null
  }
  const range = d.caretRangeFromPoint?.(clientX, clientY)
  if (range) {
    node = range.startContainer
    offset = range.startOffset
  } else {
    const pos = d.caretPositionFromPoint?.(clientX, clientY)
    if (pos) {
      node = pos.offsetNode
      offset = pos.offset
    }
  }
  if (!node || !root.contains(node)) return null
  try {
    const pre = doc.createRange()
    pre.selectNodeContents(root)
    pre.setEnd(node, offset)
    return pre.toString().replace(/\r\n/g, '\n').length
  } catch {
    return null
  }
}

function onEntryPreviewShellClick(row: FormattedEntry, e: MouseEvent) {
  const t = e.target as HTMLElement
  if (t.closest('.entry-preview-account-link')) return
  const root = e.currentTarget
  const max = row.edited_formatted?.length ?? 0
  let caret = max
  if (root instanceof HTMLElement) {
    const raw = getCharOffsetInPreviewRoot(root, e.clientX, e.clientY)
    if (raw !== null) caret = Math.min(Math.max(0, raw), max)
  }
  startTextEdit(row.uuid, caret)
}

function startTextEdit(uuid: string, caret?: number) {
  clearTabCompleteSession(uuid)
  setEntryTextEditMode(uuid, true)
  nextTick(() => {
    nextTick(() => {
      const ta = entryInputRefs.get(uuid)?.textarea
      ta?.focus()
      if (ta && typeof caret === 'number' && caret >= 0) {
        const c = Math.min(caret, ta.value.length)
        ta.setSelectionRange(c, c)
      }
    })
  })
}

async function onEntryTextareaBlur(row: FormattedEntry) {
  try {
    await handleEntryEdit(row.uuid, row.edited_formatted)
  } finally {
    setEntryTextEditMode(row.uuid, false)
  }
}

function onOverlayQueryKeydown(e: Event | KeyboardEvent) {
  if (!(e instanceof KeyboardEvent)) return
  const list = overlayAccountMatches.value
  if (e.key === 'ArrowDown') {
    if (!list.length) return
    e.preventDefault()
    overlayActiveIndex.value = Math.min(overlayActiveIndex.value + 1, list.length - 1)
    return
  }
  if (e.key === 'ArrowUp') {
    if (!list.length) return
    e.preventDefault()
    overlayActiveIndex.value = Math.max(overlayActiveIndex.value - 1, 0)
    return
  }
  if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
    if (list.length) {
      e.preventDefault()
      const idx = Math.min(Math.max(0, overlayActiveIndex.value), list.length - 1)
      void applyAccountReplacementByName(list[idx])
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      void applyOverlayAccountByInput()
    }
  }
}

function setEntryInputRef(uuid: string, el: unknown) {
  if (el && typeof el === 'object') {
    const comp = el as { textarea?: HTMLTextAreaElement }
    if (comp.textarea instanceof HTMLTextAreaElement) {
      entryInputRefs.set(uuid, comp)
      return
    }
  }
  entryInputRefs.delete(uuid)
}

function clearTabCompleteSession(uuid: string) {
  delete tabCompleteByUuid.value[uuid]
}

const bindEntryPreviewTab = (row: FormattedEntry) => (e: Event) => {
  if (e instanceof KeyboardEvent) {
    handleEntryPreviewTab(row, e)
  }
}

function longestCommonPrefix(strs: string[]): string {
  if (!strs.length) return ''
  let s = strs[0]
  for (let k = 1; k < strs.length; k++) {
    const t = strs[k]
    let j = 0
    while (j < s.length && j < t.length && s[j] === t[j]) j++
    s = s.slice(0, j)
    if (!s) return ''
  }
  return s
}

const handleEntryPreviewTab = (row: FormattedEntry, e: KeyboardEvent) => {
  if (e.shiftKey) return
  const input = entryInputRefs.get(row.uuid)
  const ta = input?.textarea
  if (!ta) return

  const text = row.edited_formatted
  const cur = ta.selectionStart
  const range = findAccountRangeAtGlobalIndex(text, cur)
  if (!range) return
  if (cur < range.start || cur > range.end) return

  const typed = text.slice(range.start, cur)
  if (typed.length < 1) return

  const names = flatAccountNames.value.filter((a) => a.startsWith(typed))
  if (names.length === 0) return

  const fullToken = text.slice(range.start, range.end)
  if (names.length === 1 && names[0] === fullToken && cur === range.end) return

  e.preventDefault()

  const candidatesKey = names.join('\0')
  let sess = tabCompleteByUuid.value[row.uuid]
  if (
    !sess ||
    sess.start !== range.start ||
    sess.end !== range.end ||
    sess.candidatesKey !== candidatesKey
  ) {
    sess = { start: range.start, end: range.end, candidatesKey, idx: 0 }
    tabCompleteByUuid.value[row.uuid] = sess
  }

  const lcp = longestCommonPrefix(names)
  if (lcp.length > typed.length) {
    const newText = text.slice(0, range.start) + lcp + text.slice(range.end)
    row.edited_formatted = newText
    delete tabCompleteByUuid.value[row.uuid]
    nextTick(() => {
      const nc = range.start + lcp.length
      ta.setSelectionRange(nc, nc)
    })
    return
  }

  if (names.length > 1) {
    const pick = names[sess!.idx % names.length]
    sess!.idx += 1
    const newText = text.slice(0, range.start) + pick + text.slice(range.end)
    row.edited_formatted = newText
    nextTick(() => {
      const nc = range.start + pick.length
      ta.setSelectionRange(nc, nc)
    })
    return
  }

  const pick = names[0]
  const newText = text.slice(0, range.start) + pick + text.slice(range.end)
  row.edited_formatted = newText
  delete tabCompleteByUuid.value[row.uuid]
  nextTick(() => {
    const nc = range.start + pick.length
    ta.setSelectionRange(nc, nc)
  })
}

async function applyAccountReplacementByName(accountName: string) {
  const pop = accountPopover.value
  if (!pop.visible || !pop.entryUuid) return

  const row = formattedEntries.value.find((r) => r.uuid === pop.entryUuid)
  if (!row) return

  const t = row.edited_formatted
  const oldText = t
  const newText = t.slice(0, pop.replaceStart) + accountName + t.slice(pop.replaceEnd)
  row.edited_formatted = newText

  accountPopover.value.visible = false
  accountAssistQuery.value = ''

  const focusPos = pop.replaceStart + accountName.length
  try {
    await persistEntryEdit(pop.entryUuid, newText)
  } catch (error: any) {
    row.edited_formatted = oldText
    ElMessage.error(error.response?.data?.error || '更新编辑内容失败')
    return
  }
  if (isEntryTextEditMode(pop.entryUuid)) {
    const input = entryInputRefs.get(pop.entryUuid)
    const ta = input?.textarea
    if (ta) {
      nextTick(() => {
        ta.focus()
        ta.setSelectionRange(focusPos, focusPos)
      })
    }
  }
}

async function applyOverlayAccountByInput() {
  const q = accountAssistQuery.value.trim()
  if (!q) {
    ElMessage.warning('请输入账户名或从下方列表选择')
    return
  }
  if (flatAccountNames.value.includes(q)) {
    await applyAccountReplacementByName(q)
    return
  }
  const lower = q.toLowerCase()
  const exactCi = flatAccountNames.value.filter((a) => a.toLowerCase() === lower)
  if (exactCi.length === 1) {
    await applyAccountReplacementByName(exactCi[0])
    return
  }
  const subs = overlayAccountMatches.value
  if (subs.length === 1) {
    await applyAccountReplacementByName(subs[0])
    return
  }
  if (subs.length > 1) {
    ElMessage.warning('请用 ↑↓ 选择一条，或补充筛选至仅一条后再回车')
    return
  }
  ElMessage.warning('未找到匹配的账户，请检查输入')
}

// 内联新增映射相关
const mappingDialog = ref({
  visible: false,
  loading: false,
  targetEntryUuid: ''
})

const mappingFormRef = ref<FormInstance>()
const mappingForm = ref({
  type: 'expense',
  key: '',
  accountId: null as number | null,
  party: ''
})

const mappingRules: FormRules = {
  key: [{ required: true, message: '请输入关键字', trigger: 'blur' }],
  accountId: [{ required: true, message: '请选择映射账户', trigger: 'change' }]
}

// 处理打开新增映射对话框
const handleOpenMappingDialog = (row: FormattedEntry) => {
  mappingDialog.value.targetEntryUuid = row.uuid
  
  // 预填数据
  let defaultType = 'expense'
  let defaultKey = ''
  const defaultParty = ''
  
  if (row.original_row) {
    if (row.original_row.transaction_type && row.original_row.transaction_type.includes('收入')) {
      defaultType = 'income'
    }
    
    if (row.original_row.counterparty) {
      defaultKey = row.original_row.counterparty
      
    } else if (row.original_row.commodity) {
      defaultKey = row.original_row.commodity.substring(0, 10) // 截取一部分作为关键字
    }
  }
  
  mappingForm.value = {
    type: defaultType,
    key: defaultKey,
    accountId: null,
    party: defaultParty
  }
  
  mappingDialog.value.visible = true
}

// 处理映射提交
const handleMappingSubmit = async () => {
  if (!mappingFormRef.value) return
  
  await mappingFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    mappingDialog.value.loading = true
    try {
      // 1. 创建映射
      if (mappingForm.value.type === 'expense') {
        await axios.post('/expense/', {
          key: mappingForm.value.key,
          expend_id: mappingForm.value.accountId,
          payee: mappingForm.value.party,
          currency: 'CNY' // 默认CNY
        })
      } else {
        await axios.post('/income/', {
          key: mappingForm.value.key,
          income_id: mappingForm.value.accountId,
          payer: mappingForm.value.party
        })
      }
      
      ElMessage.success('映射创建成功')
      
      // 2. 自动重解析当前条目
      try {
        const response = await reparseEntry(taskId.value, {
          entry_uuid: mappingDialog.value.targetEntryUuid,
          selected_key: mappingForm.value.key
        })

        const updated = response.data
        const index = formattedEntries.value.findIndex(e => e.uuid === mappingDialog.value.targetEntryUuid)
        if (index !== -1) {
          formattedEntries.value[index] = {
            ...formattedEntries.value[index],
            formatted: updated.formatted,
            edited_formatted: (updated.edited_formatted || '').replace(/\n+$/, ''),
            selected_expense_key: updated.selected_expense_key,
            expense_candidates_with_score: updated.expense_candidates_with_score
          }
        }
        
        ElMessage.success('重解析完成')
        mappingDialog.value.visible = false
      } catch (reparseError: any) {
        ElMessage.error(reparseError.response?.data?.error || '重新解析失败，请手动点击重试')
      }
    } catch (error: any) {
      if (error.response?.status === 400 && error.response.data?.non_field_errors) {
        ElMessage.error(error.response.data.non_field_errors[0])
      } else {
        ElMessage.error('创建映射失败')
      }
    } finally {
      mappingDialog.value.loading = false
    }
  })
}

// 计算剩余时间（基于 expires_at 或 created）
const remainingTime = computed(() => {
  if (!taskInfo.value) return null

  // 优先使用 parseResult 中的 expires_at（这是缓存的实际过期时间）
  if (parseResult.value?.expires_at) {
    const expiryTime = parseResult.value.expires_at * 1000  // expires_at 是 Unix 时间戳（秒），转换为毫秒
    const now = Date.now()
    const remainingMs = expiryTime - now

    if (remainingMs <= 0) {
      return '已过期'
    }

    const remainingHours = Math.floor(remainingMs / (3600 * 1000))
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

    if (remainingHours > 0) {
      return `${remainingHours}小时${remainingMinutes}分钟`
    } else {
      return `${remainingMinutes}分钟`
    }
  }

  // 回退到使用 taskInfo.expires_at（如果序列化器返回了）
  if (taskInfo.value.expires_at) {
    const expiryTime = taskInfo.value.expires_at * 1000
    const now = Date.now()
    const remainingMs = expiryTime - now

    if (remainingMs <= 0) {
      return '已过期'
    }

    const remainingHours = Math.floor(remainingMs / (3600 * 1000))
    const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

    if (remainingHours > 0) {
      return `${remainingHours}小时${remainingMinutes}分钟`
    } else {
      return `${remainingMinutes}分钟`
    }
  }

  // 最后回退到使用 created（兼容旧数据）
  const createdTime = new Date(taskInfo.value.created).getTime()
  const now = Date.now()
  const elapsed = now - createdTime
  const totalHours = 24
  const remainingMs = totalHours * 3600 * 1000 - elapsed

  if (remainingMs <= 0) {
    return '已过期'
  }

  const remainingHours = Math.floor(remainingMs / (3600 * 1000))
  const remainingMinutes = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000))

  if (remainingHours > 0) {
    return `${remainingHours}小时${remainingMinutes}分钟`
  } else {
    return `${remainingMinutes}分钟`
  }
})

// 加载待办任务信息和解析结果
const loadResults = async () => {
  loading.value.results = true
  try {
    // 先获取待办任务信息（包含文件名）
    const taskResponse = await getTask(taskId.value)
    taskInfo.value = taskResponse.data
    fileName.value = taskInfo.value.file_name || `文件 #${taskInfo.value.file_id || taskId.value}`

    // 再获取解析结果
    const response = await getParseResults(taskId.value)
    const result: ParseResult = response.data
    parseResult.value = result  // 保存解析结果，用于计算剩余时间

    // 确保每条记录都有 edited_formatted，并去除末尾的换行符
    formattedEntries.value = result.formatted_data.map(entry => ({
      ...entry,
      edited_formatted: (entry.edited_formatted || entry.formatted || '').replace(/\n+$/, '')
    }))
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '加载解析结果失败')
  } finally {
    loading.value.results = false
  }
}

// 处理关键字选择
const handleKeywordSelect = async (uuid: string, selectedKey: string) => {
  try {
    const response = await reparseEntry(taskId.value, {
      entry_uuid: uuid,
      selected_key: selectedKey
    })

    const updated = response.data
    const index = formattedEntries.value.findIndex(e => e.uuid === uuid)
    if (index !== -1) {
      formattedEntries.value[index] = {
        ...formattedEntries.value[index],
        formatted: updated.formatted,
        edited_formatted: (updated.edited_formatted || '').replace(/\n+$/, ''),
        selected_expense_key: updated.selected_expense_key,
        expense_candidates_with_score: updated.expense_candidates_with_score
      }
    }

    ElMessage.success('已反馈AI选择')
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '重解析失败')
  }
}

async function persistEntryEdit(uuid: string, editedFormatted: string) {
  if (errorEntries.value[uuid]) {
    delete errorEntries.value[uuid]
  }

  const response = await updateEntryEdit(taskId.value, uuid, {
    edited_formatted: editedFormatted
  })

  if (response.data.validation_warning) {
    validationWarnings.value[uuid] = response.data.validation_warning
  } else {
    delete validationWarnings.value[uuid]
  }

  ElMessage.success('编辑内容已保存')
}

// 处理条目编辑
const handleEntryEdit = async (uuid: string, editedFormatted: string) => {
  try {
    await persistEntryEdit(uuid, editedFormatted)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '更新编辑内容失败')
  }
}

// 获取条目预览的类名
const getEntryClasses = (uuid: string, editedFormatted: string) => {
  const isError = !!errorEntries.value[uuid]
  const isWarning = !!validationWarnings.value[uuid] && !isError
  
  // 检查是否包含 Other 分类
  const isOther = /(?:Assets|Expenses|Income):Other/.test(editedFormatted || '')

  return [
    'entry-preview-wrapper',
    {
      'has-error': isError,
      'has-warning': isWarning,
      'has-other': isOther && !isError && !isWarning, // 错误和警告优先级更高
      'is-entry-preview-mode': !isEntryTextEditMode(uuid),
      'is-entry-edit-mode': isEntryTextEditMode(uuid)
    }
  ]
}

// 预览所有条目
const handlePreview = () => {
  previewContent.value = formattedEntries.value
    .map(entry => entry.edited_formatted.replace(/\n+$/, ''))
    .join('\n\n')
  showPreviewDialog.value = true
}

// 保存预览框中的编辑内容
const handleSavePreview = async () => {
  if (!previewContent.value.trim()) {
    ElMessage.warning('预览内容不能为空')
    return
  }

  loading.value.savePreview = true
  try {
    // 将预览内容按空行分割成条目
    const editedEntries = previewContent.value
      .split(/\n\n+/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 0)

    // 检查条目数量是否匹配
    if (editedEntries.length !== formattedEntries.value.length) {
      try {
        await ElMessageBox.confirm(
          `预览框中有 ${editedEntries.length} 条条目，列表中应有 ${formattedEntries.value.length} 条。是否继续保存？将只更新前 ${Math.min(editedEntries.length, formattedEntries.value.length)} 条。`,
          '条目数量不匹配',
          {
            confirmButtonText: '继续保存',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
      } catch {
        // 用户取消
        loading.value.savePreview = false
        return
      }
    }

    // 更新条目内容
    const updatePromises: Promise<void>[] = []
    const minLength = Math.min(editedEntries.length, formattedEntries.value.length)

    for (let i = 0; i < minLength; i++) {
      const entry = formattedEntries.value[i]
      const editedContent = editedEntries[i].replace(/\n+$/, '')

      // 如果内容有变化，才更新
      if (entry.edited_formatted.replace(/\n+$/, '') !== editedContent) {
        // 清除错误状态
        if (errorEntries.value[entry.uuid]) {
          delete errorEntries.value[entry.uuid]
        }

        updatePromises.push(
          updateEntryEdit(taskId.value, entry.uuid, {
            edited_formatted: editedContent
          }).then((response) => {
            // 更新本地数据
            entry.edited_formatted = editedContent
            
            if (response.data.validation_warning) {
              validationWarnings.value[entry.uuid] = response.data.validation_warning
            } else {
              delete validationWarnings.value[entry.uuid]
            }
          })
        )
      }
    }

    // 等待所有更新完成
    await Promise.all(updatePromises)

    ElMessage.success('预览内容已保存')
    showPreviewDialog.value = false
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: string } } }
      ElMessage.error(axiosError.response?.data?.error || '保存预览内容失败')
    } else {
      ElMessage.error('保存预览内容失败')
    }
  } finally {
    loading.value.savePreview = false
  }
}

// 确认写入
const handleConfirmWrite = async () => {
  loading.value.confirm = true
  errorEntries.value = {}
  try {
    await confirmWrite(taskId.value)
    ElMessage.success('确认写入成功')
    
    // 返回待办列表
    router.push('/reconciliation')
    
    // 延迟触发横幅更新，确保页面跳转完成后再更新
    // 这样横幅组件可以正确检测到任务数量变化并触发导览步骤5
    setTimeout(() => {
      emitTaskBannerRefresh()
    }, 500)
  } catch (error: any) {
    if (error.response?.data?.error_entries) {
      const entries = error.response.data.error_entries as ErrorEntry[]
      entries.forEach(entry => {
        errorEntries.value[entry.uuid] = entry.error_message
      })
      ElMessage.error(error.response?.data?.error || '确认写入失败，请修正错误')
      
      // 自动滚动到第一个错误
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.has-error')
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
    } else {
      ElMessage.error(error.response?.data?.error || '确认写入失败')
    }
  } finally {
    loading.value.confirm = false
  }
}

// 重新解析
const handleReparseAll = async () => {
  loading.value.reparseAll = true
  try {
    await reparseAll(taskId.value)
    ElMessage.success('重新解析任务已提交，稍后将自动刷新')
    // 可以延迟刷新
    setTimeout(() => {
      loadResults()
    }, 2000)
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error || '重新解析失败')
  } finally {
    loading.value.reparseAll = false
  }
}

// 返回
const handleBack = () => {
  router.push('/reconciliation')
}

onMounted(() => {
  void loadResults()
  void loadAccountTreeAssist()
})
</script>

<style scoped lang="scss">
.parse-review-form {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color);

  .header-left {
    h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 600;
    }
  }

  .header-right {
    display: flex;
    gap: 12px;
  }
}

.content-container {
  min-height: 400px;
  margin-bottom: 24px;
}

.entry-preview-wrapper {
  position: relative;
  flex-shrink: 0;
  min-height: calc(7 * 1.6em + 10px + 2px);
  font-size: 12px;
  line-height: 1.6;
  
  &.has-error {
    :deep(.el-textarea__inner),
    :deep(.ep-textarea__inner),
    .entry-preview-render {
      border-color: var(--el-color-danger);
      box-shadow: 0 0 0 1px var(--el-color-danger) inset;
    }
  }
  
  &.has-warning {
    :deep(.el-textarea__inner),
    :deep(.ep-textarea__inner),
    .entry-preview-render {
      border-color: var(--el-color-warning);
      box-shadow: 0 0 0 1px var(--el-color-warning) inset;
    }
  }
  
  &.has-other {
    :deep(.el-textarea__inner),
    :deep(.ep-textarea__inner),
    .entry-preview-render {
      border-color: var(--ep-color-primary, var(--el-color-primary));
      box-shadow: 0 0 0 1px var(--ep-color-primary, var(--el-color-primary)) inset;
      background-color: var(--ep-color-primary-light-9, var(--el-color-primary-light-9));
    }
  }
}

// 暗黑模式下：避免 primary-light-* 过亮导致文本对比度差
:deep(html.dark) .entry-preview-wrapper.has-other {
  :deep(.el-textarea__inner),
  :deep(.ep-textarea__inner),
  .entry-preview-render {
    /* el-config-provider namespace=ep：暗黑语义在 --ep-*，--el-* 在 dist/index.css 中仍为亮色 */
    color: var(--ep-text-color-primary, var(--el-text-color-primary));
    background-color: color-mix(
      in srgb,
      var(--ep-color-primary, var(--el-color-primary)) 18%,
      var(--ep-bg-color, var(--el-bg-color))
    );
  }
}

.validation-message {
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
  padding: 4px 8px;
  border-radius: 4px;
  
  &.error-message {
    color: var(--el-color-danger);
    background-color: var(--el-color-danger-light-9);
  }
  
  &.warning-message {
    color: var(--el-color-warning);
    background-color: var(--el-color-warning-light-9);
  }
}

// 预览块与编辑 textarea 共用同一套「占位尺寸」。
// border-box 下 min-height 须包含 7 行内容高度（line-height 1.6 → 7×1.6em）+ 上下 padding(10px) + 上下 border(2px)，否则少于 7 行时外框会偏矮。
$entry-preview-inner-padding: 5px 11px;
$entry-preview-inner-radius: var(--el-border-radius-base);
$entry-preview-inner-border: 1px solid;
$entry-preview-min-height: calc(7 * 1.6em + 10px + 2px);

.entry-preview {
  width: 100%;

  :deep(.el-textarea),
  :deep(.ep-textarea) {
    display: block;
  }

  :deep(.el-textarea__inner),
  :deep(.ep-textarea__inner) {
    box-sizing: border-box;
    font-family: Monaco, Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
    min-height: $entry-preview-min-height;
    padding: $entry-preview-inner-padding;
    border-radius: $entry-preview-inner-radius;
    border-width: 1px;
    border-style: solid;
    resize: none;
    outline: none;
    transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
    background-color: var(--ep-input-bg-color, var(--el-input-bg-color, var(--ep-fill-color-blank, var(--el-fill-color-blank))));
    color: var(--ep-input-text-color, var(--el-input-text-color, var(--ep-text-color-regular, var(--el-text-color-regular))));
    border-color: var(--ep-input-border-color, var(--el-input-border-color, var(--ep-border-color, var(--el-border-color))));
  }
}

.entry-preview-render {
  display: block;
  width: 100%;
  box-sizing: border-box;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  min-height: $entry-preview-min-height;
  white-space: pre-wrap;
  word-break: break-word;
  padding: $entry-preview-inner-padding;
  border-radius: $entry-preview-inner-radius;
  border: $entry-preview-inner-border
    var(--ep-input-border-color, var(--el-input-border-color, var(--ep-border-color, var(--el-border-color))));
  background-color: var(
    --ep-input-bg-color,
    var(--el-input-bg-color, var(--ep-fill-color-blank, var(--el-fill-color-blank)))
  );
  color: var(
    --ep-input-text-color,
    var(--el-input-text-color, var(--ep-text-color-regular, var(--el-text-color-regular)))
  );
  cursor: text;
  outline: none;
  transition: border-color 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
}

// 无校验态：预览外框为默认输入框色；修改态外框为主题色（与预览区分）
.entry-preview-wrapper.is-entry-preview-mode:not(.has-error):not(.has-warning):not(.has-other) {
  .entry-preview-render {
    border-color: var(--ep-input-border-color, var(--el-input-border-color, var(--ep-border-color, var(--el-border-color))));
  }

  .entry-preview-render:hover {
    border-color: var(
      --ep-input-hover-border-color,
      var(--el-input-hover-border-color, var(--ep-border-color-hover, var(--el-border-color-hover)))
    );
  }

  .entry-preview-render:focus-visible {
    border-color: var(
      --ep-input-hover-border-color,
      var(--el-input-hover-border-color, var(--ep-border-color-hover, var(--el-border-color-hover)))
    );
    box-shadow: none;
  }
}

.entry-preview-wrapper.is-entry-edit-mode:not(.has-error):not(.has-warning):not(.has-other) {
  :deep(.el-textarea__inner),
  :deep(.ep-textarea__inner) {
    border-color: var(--ep-color-primary, var(--el-color-primary));
    box-shadow: none;
  }

  :deep(.el-textarea__inner:hover),
  :deep(.ep-textarea__inner:hover) {
    border-color: var(--ep-color-primary, var(--el-color-primary));
  }

  :deep(.el-textarea__inner:focus),
  :deep(.ep-textarea__inner:focus) {
    border-color: var(--ep-color-primary, var(--el-color-primary));
    box-shadow: none;
  }
}

.entry-preview-wrapper.has-error .entry-preview-render:focus-visible {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.entry-preview-wrapper.has-warning .entry-preview-render:focus-visible {
  border-color: var(--el-color-warning);
  box-shadow: 0 0 0 1px var(--el-color-warning) inset;
}

.entry-preview-wrapper.has-other .entry-preview-render:focus-visible {
  border-color: var(--ep-color-primary, var(--el-color-primary));
  box-shadow: 0 0 0 1px var(--ep-color-primary, var(--el-color-primary)) inset;
}

.entry-preview-line {
  display: block;
}

.entry-preview-account-link {
  font: inherit;
  color: inherit;
  cursor: pointer;
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  text-decoration: none;
  vertical-align: baseline;
}

.entry-preview-account-link:hover {
  color: var(--ep-color-primary, var(--el-color-primary));
}

.entry-preview-plain {
  cursor: text;
}

.ai-classification-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.current-selection,
.candidates {
  display: flex;
  align-items: center;
}

.label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-right: 8px;
  flex-shrink: 0;
}

.label.muted {
  color: var(--el-text-color-placeholder);
}

.candidate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.candidate-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.candidate-tag:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.candidate-tag.is-selected {
  font-weight: bold;
}

.score {
  font-size: 0.85em;
  color: var(--el-text-color-placeholder);
  margin-left: 2px;
}

.no-category-tip {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
  display: inline-block;
  line-height: 22px;
  padding: 0 9px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  vertical-align: middle;
}

// 暗黑模式下：无分类建议提示更柔和、对比度更稳定
:deep(html.dark) .no-category-tip {
  background: var(--ep-fill-color-darker, var(--el-fill-color-darker));
  color: var(--ep-text-color-placeholder, var(--el-text-color-placeholder));
}

.add-mapping-btn {
  margin-left: 8px;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color);
}

.preview-textarea {
  :deep(.el-textarea__inner) {
    font-family: Monaco, Consolas, 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.6;
  }
}
</style>

<style lang="scss">
.parse-review-account-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background-color: color-mix(
    in srgb,
    var(--ep-overlay-color-lighter, var(--el-overlay-color-lighter, #000)) 12%,
    transparent
  );
}

.parse-review-account-panel {
  background-color: var(--ep-bg-color-overlay, var(--ep-bg-color, var(--el-bg-color)));
  border: 1px solid var(--ep-border-color, var(--el-border-color));
  border-radius: var(--ep-border-radius-base, var(--el-border-radius-base));
  padding: 8px;
  box-shadow: var(--ep-box-shadow, var(--el-box-shadow));
}

.parse-review-account-original {
  font-family: Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  padding: 6px 8px;
  margin-bottom: 8px;
  border-radius: var(--ep-border-radius-small, var(--el-border-radius-small));
  background-color: var(--ep-fill-color-light, var(--el-fill-color-light));
  color: var(--ep-text-color-primary, var(--el-text-color-primary));
  word-break: break-all;
}

.parse-review-account-query {
  width: 100%;

  .ep-input__wrapper,
  .el-input__wrapper {
    background-color: var(--ep-fill-color-blank, var(--el-fill-color-blank));
    box-shadow: 0 0 0 1px var(--ep-input-border-color, var(--el-input-border-color)) inset;
  }

  .ep-input__inner,
  .el-input__inner {
    color: var(--ep-text-color-regular, var(--el-text-color-regular));
  }
}

.parse-review-account-suggestions {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid var(--ep-border-color-lighter, var(--el-border-color-lighter));
  border-radius: var(--ep-border-radius-small, var(--el-border-radius-small));
  background-color: var(--ep-fill-color-blank, var(--el-fill-color-blank));
}

.parse-review-account-suggestion-item {
  padding: 6px 10px;
  font-family: Monaco, Consolas, 'Courier New', monospace;
  font-size: 12px;
  cursor: pointer;
  color: var(--ep-text-color-regular, var(--el-text-color-regular));
}

.parse-review-account-suggestion-item:hover,
.parse-review-account-suggestion-item.is-active {
  background-color: var(--ep-fill-color-light, var(--el-fill-color-light));
  color: var(--ep-text-color-primary, var(--el-text-color-primary));
}

html.dark .parse-review-account-suggestion-item.is-active {
  background-color: var(--ep-fill-color-dark, var(--el-fill-color-dark));
}
</style>
