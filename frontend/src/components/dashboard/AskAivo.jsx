import { useEffect, useRef, useState } from 'react'
import { ChevronRight, Send, Sparkles } from 'lucide-react'
import { Card } from './Cards'

const SUGGESTIONS = [
  'Can you adjust my workout plan?',
  'What should I eat for dinner?',
  'How many calories do I need?',
  'Give me a quick workout (no equipment)',
]

export default function AskAivo() {
  const [messages, setMessages] = useState([{ from: 'ai', text: 'How can I help you today?' }])
  const [text, setText] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // TODO: replace the canned reply with a call to your Laravel AI endpoint.
  const send = (q) => {
    const msg = q.trim()
    if (!msg) return
    setMessages((m) => [...m, { from: 'me', text: msg }, { from: 'ai', text: 'The AI coach is not connected yet. Soon I will answer this for you.' }])
    setText('')
  }

  return (
    <Card className="flex h-full min-h-[34rem] flex-col p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-gold"><Sparkles size={20} /></span>
        <div><p className="text-sm font-bold">Ask AIVO</p><p className="text-[11px] text-mute">Your AI fitness &amp; nutrition coach</p></div>
      </div>

      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <p key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.from === 'me' ? 'ml-auto bg-gold text-black' : 'bg-white/10'}`}>{m.text}</p>
        ))}
        {messages.length === 1 && (
          <div className="space-y-2 pt-3">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => send(s)} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-xs transition hover:border-gold/60">
                {s}<ChevronRight size={14} className="text-mute" />
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 py-2 pl-4 pr-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your question..." className="w-full bg-transparent text-xs outline-none placeholder:text-mute" />
        <button type="submit" aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-black"><Send size={14} /></button>
      </form>
    </Card>
  )
}
