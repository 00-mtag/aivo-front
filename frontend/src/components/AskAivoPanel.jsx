import { useEffect, useRef, useState } from 'react'
import { Dumbbell, Maximize2, Minimize2, Send, Sparkles, UtensilsCrossed, X, Zap } from 'lucide-react'
import logo from '../assets/logo.png'
import useAivoChat from '../lib/useAivoChat'

const ICONS = [Dumbbell, UtensilsCrossed, Zap]
const Avatar = () => (
  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/50 bg-[#101010]"><img src={logo} alt="" className="h-6 w-auto" /></span>
)

export default function AskAivoPanel({ suggestions = [], context, onClose, wide, onToggleWide }) {
  const { messages, busy, error, send, newChat, page } = useAivoChat(context)
  const [text, setText] = useState('')
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy, error])
  const submit = (value) => {
    send(value)
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <Sparkles size={30} className="shrink-0 text-gold" />
        <div className="min-w-0 flex-1"><p className="text-lg font-bold leading-tight">Ask AIVO</p><p className="truncate text-xs text-mute">Helping with {page.toLowerCase()}</p></div>
        {messages.length > 0 && <button type="button" onClick={newChat} className="text-xs text-mute transition hover:text-ink">New chat</button>}
        {onToggleWide && (
          <button type="button" aria-label={wide ? 'Shrink panel' : 'Expand panel'} title={wide ? 'Shrink' : 'Expand'} onClick={onToggleWide} className="hidden text-mute transition hover:text-ink xl:block">
            {wide ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}
        <button type="button" aria-label="Close" onClick={onClose} className="text-mute transition hover:text-ink"><X size={22} /></button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && <div className="flex items-start gap-3"><Avatar /><p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm">Hi! I'm AIVO. I can help with your {page.toLowerCase()}. What would you like to know?</p></div>}
        {messages.map((m, i) => m.role === 'assistant' ? (
          <div key={i} className="flex items-start gap-3"><Avatar /><p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm">{m.content}</p></div>
        ) : (
          <p key={i} className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-gold px-4 py-2.5 text-sm text-black">{m.content}</p>
        ))}
        {busy && <div className="flex items-start gap-3"><Avatar /><p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm text-mute">AIVO is thinking...</p></div>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2 pl-[52px]">
            {suggestions.map((s, i) => {
              const Icon = ICONS[i % ICONS.length]
              return (
                <button key={s} type="button" disabled={busy} onClick={() => submit(s)} className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-left text-xs transition hover:border-gold/60 disabled:opacity-50">
                  <Icon size={15} className="shrink-0 text-gold" />{s}
                </button>
              )
            })}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="px-5 pb-2">
        <form onSubmit={(e) => { e.preventDefault(); submit(text) }} className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/30 p-2 pl-4">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask about ${page.toLowerCase()}...`} className="w-full bg-transparent text-sm outline-none placeholder:text-mute" />
          <button type="submit" disabled={!text.trim() || busy} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold text-black transition hover:brightness-110 disabled:opacity-50"><Send size={16} /></button>
        </form>
      </div>
      <p className="flex items-center justify-center gap-1.5 pb-4 pt-2 text-[11px] text-mute"><Sparkles size={12} className="text-gold" /> Train smarter. Live stronger.</p>
    </div>
  )
}
