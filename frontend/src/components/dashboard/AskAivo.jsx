import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Send, Sparkles, X } from 'lucide-react'
import { Card } from './Cards'
import useAivoChat from '../../lib/useAivoChat'

const SUGGESTIONS = [
  'Can you adjust my workout plan?',
  'What should I eat for dinner?',
  'How many calories do I need?',
  'Give me a quick workout (no equipment)',
]

export default function AskAivo({ suggestions = SUGGESTIONS, context, onClose, bare = false }) {
  const Wrapper = bare ? 'div' : Card
  const { messages, busy, error, send, page } = useAivoChat(context)
  const [text, setText] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy, error])
  const submit = (value) => {
    send(value)
    setText('')
  }

  return (
    <Wrapper className={bare ? 'flex h-full flex-col p-5' : 'flex h-full min-h-[34rem] flex-col p-5'}>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-gold"><Sparkles size={20} /></span>
        <div><p className="text-sm font-bold">Ask AIVO</p><p className="text-[11px] text-mute">Helping with {page.toLowerCase()}</p></div>
        {onClose && <button type="button" aria-label="Close" onClick={onClose} className="ml-auto text-mute transition hover:text-ink"><X size={20} /></button>}
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && <p className="max-w-[85%] rounded-2xl bg-white/10 px-4 py-2.5 text-sm">Hi! I'm AIVO. I can help with your {page.toLowerCase()}. What would you like to know?</p>}
        {messages.map((m, i) => (
          <p key={i} className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'ml-auto bg-gold text-black' : 'bg-white/10'}`}>{m.content}</p>
        ))}
        {busy && <p role="status" className="max-w-[85%] rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-mute">AIVO is thinking...</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {messages.length === 0 && (
          <div className="space-y-2 pt-3">
            {suggestions.map((s) => (
              <button key={s} type="button" disabled={busy} onClick={() => submit(s)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-xs transition hover:border-gold/60 disabled:opacity-50">
                {s}<ChevronRight size={14} className="text-mute" />
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submit(text) }} className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 py-2 pl-4 pr-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask about ${page.toLowerCase()}...`} className="w-full bg-transparent text-xs outline-none placeholder:text-mute" />
        <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-black disabled:opacity-50"><Send size={14} /></button>
      </form>
    </Wrapper>
  )
}
