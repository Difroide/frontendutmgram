/**
 * Preview da mensagem formatada no estilo Telegram
 */
import { useEffect, useState } from 'react'
import { fixadorService } from '../fixadorService'

export function MensagemPreview({ texto }: { texto: string }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    if (!texto?.trim()) {
      setHtml('')
      return
    }
    fixadorService.prepararPreviewHtml(texto).then(setHtml).catch(() => setHtml(texto))
  }, [texto])

  if (!html) return null

  return (
    <div
      className="rounded-lg border border-gray-700 bg-[#0d1117] px-3 py-2 text-sm text-gray-200"
      style={{ minHeight: 40 }}
    >
      <div
        className="whitespace-pre-wrap break-words [&_b]:font-bold [&_i]:italic [&_u]:underline [&_s]:line-through [&_code]:rounded [&_code]:bg-gray-800 [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_pre]:block [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-gray-800 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:border-gray-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-400 [&_a]:text-cyan-400 [&_a]:underline [&_a]:hover:text-cyan-300"
        dangerouslySetInnerHTML={{
          __html: sanitizePreviewHtml(html),
        }}
      />
    </div>
  )
}

/** Permite apenas tags seguras do Telegram e converte tg-spoiler para span */
function sanitizePreviewHtml(html: string): string {
  let r = html
  r = r.replace(/<script\b[\s\S]*?<\/script>/gi, '')
  r = r.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
  r = r.replace(/on\w+="[^"]*"/gi, '')
  r = r.replace(/<tg-spoiler>([\s\S]*?)<\/tg-spoiler>/gi, '<span class="rounded bg-gray-700 px-0.5 text-gray-700 hover:bg-gray-600 hover:text-gray-300">$1</span>')
  return r
}
