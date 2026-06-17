import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'hr', 'a',
]

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

function secureExternalLinks(html: string): string {
  return html.replace(
    /<a\s+([^>]*?)>/gi,
    (_match, attrs: string) => {
      const cleaned = attrs.replace(/\s*target\s*=\s*["'][^"']*["']/gi, '')
        .replace(/\s*rel\s*=\s*["'][^"']*["']/gi, '')
      return `<a ${cleaned.trim()} target="_blank" rel="noopener noreferrer">`
    },
  )
}

export function renderMarkdown(content: string): string {
  if (!content) return ''
  const raw = md.render(content)
  const sanitized = DOMPurify.sanitize(raw, { ALLOWED_TAGS })
  return secureExternalLinks(sanitized)
}
