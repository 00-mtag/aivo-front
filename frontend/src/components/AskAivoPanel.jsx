import { useEffect, useRef, useState } from 'react'
import { BookmarkPlus, Dumbbell, History, Maximize2, Minimize2, Send, Sparkles, UtensilsCrossed, X, Zap } from 'lucide-react'
import logo from '../assets/logo.png'
import useAivoChat from '../lib/useAivoChat'

const ICONS = [Dumbbell, UtensilsCrossed, Zap]
const isWorkoutPlanRequest = (message) => (
  /\b(?:plan|routine|schedule|program|programme)\b/i.test(message)
  && /\b(?:create|make|build|generate|design|suggest|recommend|give|write|draft|need|want|looking for)\b/i.test(message)
)
const Avatar = () => (
  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-gold/50 bg-[#101010]"><img src={logo} alt="" className="h-6 w-auto" /></span>
)

export default function AskAivoPanel({ suggestions = [], context, onClose, wide, onToggleWide, onSaveRecommendation }) {
  const {
    messages,
    busy,
    error,
    send,
    newChat,
    page,
    persistConversations,
    historyLoading,
    conversations,
    activeConversationId,
    historyError,
    selectConversation,
  } = useAivoChat(context)
  const [text, setText] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [savingSuggestion, setSavingSuggestion] = useState(false)
  const [savedReplies, setSavedReplies] = useState(() => new Set())
  const [saveFeedback, setSaveFeedback] = useState('')
  const [saveFeedbackError, setSaveFeedbackError] = useState(false)
  const endRef = useRef(null)
  const savedPlanLabel = page === 'Workout plans' ? 'workout plan' : page === 'Nutrition' ? 'meal plan' : 'plan'
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy, error])
  useEffect(() => {
    if (!saveFeedback || savingSuggestion) return undefined
    const timeout = window.setTimeout(() => {
      setSaveFeedback('')
      setSaveFeedbackError(false)
    }, 8000)
    return () => window.clearTimeout(timeout)
  }, [saveFeedback, savingSuggestion])
  const saveReply = async (reply, index) => {
    if (!onSaveRecommendation || savingSuggestion || savedReplies.has(index)) return
    setSavingSuggestion(true)
    setSaveFeedback('Saving this suggestion to your plan...')
    setSaveFeedbackError(false)
    try {
      const feedback = await onSaveRecommendation(reply)
      setSavedReplies((current) => new Set(current).add(index))
      setSaveFeedback(feedback || 'Saved to your plan.')
    } catch (saveError) {
      setSaveFeedback(saveError.message || 'This suggestion could not be saved.')
      setSaveFeedbackError(true)
    } finally {
      setSavingSuggestion(false)
    }
  }
  const startNewChat = () => {
    newChat()
    setSavedReplies(new Set())
    setSaveFeedback('')
    setSaveFeedbackError(false)
  }
  const submit = (value) => {
    setSaveFeedback('')
    setSaveFeedbackError(false)
    const saveCommand = /^\s*(please\s+)?(save|add)\s+(it|this|that)\s+to\s+(my|the)\s+(workout\s+|meal\s+)?plan[.! ]*$/i.test(value)
    if (saveCommand && onSaveRecommendation) {
      let assistantIndex = -1
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          assistantIndex = i
          break
        }
      }
      if (assistantIndex < 0) {
        setSaveFeedback('Ask AIVO for a suggestion before saving it to your plan.')
        setSaveFeedbackError(true)
      } else {
        let questionIndex = assistantIndex - 1
        while (questionIndex >= 0 && messages[questionIndex].role !== 'user') questionIndex--
        void saveReply({
          question: questionIndex >= 0 ? messages[questionIndex].content : '',
          suggestion: messages[assistantIndex].content,
        }, assistantIndex)
      }
      setText('')
      return
    }
    send(value)
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <Sparkles size={30} className="shrink-0 text-gold" />
        <div className="min-w-0 flex-1"><p className="text-lg font-bold leading-tight">Ask AIVO</p><p className="truncate text-xs text-mute">Helping with {page.toLowerCase()}</p></div>
        {persistConversations && (
          <button type="button" onClick={() => setHistoryOpen((open) => !open)} aria-expanded={historyOpen} className="inline-flex items-center gap-1 text-xs text-mute transition hover:text-ink">
            <History size={14} /> History{conversations.length ? ` (${conversations.length})` : ''}
          </button>
        )}
        {persistConversations && <button type="button" onClick={startNewChat} disabled={busy} className="text-xs text-mute transition hover:text-ink disabled:opacity-50">New chat</button>}
        {onToggleWide && (
          <button type="button" aria-label={wide ? 'Shrink panel' : 'Expand panel'} title={wide ? 'Shrink' : 'Expand'} onClick={onToggleWide} className="hidden text-mute transition hover:text-ink xl:block">
            {wide ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        )}
        <button type="button" aria-label="Close" onClick={onClose} className="text-mute transition hover:text-ink"><X size={22} /></button>
      </div>

      {persistConversations && historyOpen && (
        <div className="max-h-40 shrink-0 space-y-1 overflow-y-auto border-b border-white/10 px-4 py-2">
          {historyError && <p role="alert" className="px-2 py-1 text-xs text-red-300">{historyError}</p>}
          {historyLoading && <p role="status" className="px-2 py-1 text-xs text-mute">Loading saved conversations...</p>}
          {conversations.map((conversation) => (
            <button
              key={conversation.conversation_id}
              type="button"
              onClick={() => {
                void selectConversation(conversation.conversation_id)
                setSavedReplies(new Set())
                setSaveFeedback('')
                setSaveFeedbackError(false)
                setHistoryOpen(false)
              }}
              disabled={busy || historyLoading}
              title={conversation.title || 'New chat'}
              className={`block w-full truncate rounded-lg px-3 py-2 text-left text-xs transition hover:bg-white/5 disabled:opacity-50 ${
                String(activeConversationId) === String(conversation.conversation_id) ? 'bg-gold/15 text-ink' : 'text-mute'
              }`}
            >
              {conversation.title || 'New chat'}
            </button>
          ))}
          {conversations.length === 0 && !historyError && !historyLoading && <p className="px-2 py-1 text-xs text-mute">No saved conversations yet.</p>}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {historyError && !historyOpen && <p role="alert" className="text-sm text-red-300">{historyError}</p>}
        {historyLoading && <p role="status" className="text-sm text-mute">Loading saved conversations...</p>}
        {messages.length === 0 && <div className="flex items-start gap-3"><Avatar /><p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm">Hi! I'm AIVO. I can help with your {page.toLowerCase()}. What would you like to know?</p></div>}
        {messages.map((m, i) => m.role === 'assistant' ? (
          <div key={i} className="flex items-start gap-3">
            <Avatar />
            <div className="min-w-0">
              <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm">{m.content}</p>
              {onSaveRecommendation
                && messages[i - 1]?.role === 'user'
                && (page !== 'Workout plans' || isWorkoutPlanRequest(messages[i - 1].content))
                && (
                <button type="button" disabled={savingSuggestion || savedReplies.has(i)} onClick={() => saveReply({
                  question: messages[i - 1].content,
                  suggestion: m.content,
                }, i)} className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50">
                  <BookmarkPlus size={14} /> {savedReplies.has(i) ? `Saved to my ${savedPlanLabel}` : `Save to my ${savedPlanLabel}`}
                </button>
              )}
            </div>
          </div>
        ) : (
          <p key={i} className="ml-auto max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-gold px-4 py-2.5 text-sm text-black">{m.content}</p>
        ))}
        {busy && <div className="flex items-start gap-3"><Avatar /><p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm text-mute">AIVO is thinking...</p></div>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {saveFeedback && <p role={savingSuggestion || !saveFeedbackError ? 'status' : 'alert'} className={`text-sm ${savingSuggestion || !saveFeedbackError ? 'text-emerald-300' : 'text-red-300'}`}>{saveFeedback}</p>}
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2 pl-[52px]">
            {suggestions.map((s, i) => {
              const Icon = ICONS[i % ICONS.length]
              return (
                <button key={s} type="button" disabled={busy || historyLoading} onClick={() => submit(s)} className="flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-left text-xs transition hover:border-gold/60 disabled:opacity-50">
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
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask about ${page.toLowerCase()}...`} disabled={historyLoading} className="w-full bg-transparent text-sm outline-none placeholder:text-mute disabled:opacity-60" />
          <button type="submit" disabled={!text.trim() || busy || historyLoading} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold text-black transition hover:brightness-110 disabled:opacity-50"><Send size={16} /></button>
        </form>
      </div>
      <p className="flex items-center justify-center gap-1.5 pb-4 pt-2 text-[11px] text-mute"><Sparkles size={12} className="text-gold" /> Train smarter. Live stronger.</p>
    </div>
  )
}
