import { useEffect, useRef, useState } from 'react'
import { BookmarkPlus, Dumbbell, Flame, Plus, Search, Send, Sparkles, Trash2, UtensilsCrossed, Zap } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import useAivoChat from '../lib/useAivoChat'
import WorkoutChatSuggestion, { parseWorkoutSuggestion } from '../components/workouts/WorkoutChatSuggestion'
import { parseNutritionSuggestion } from '../lib/nutritionSuggestion'
import { api } from '../lib/api'
import { toYmd } from '../lib/nutrition'
import NutritionChatSuggestion from '../components/nutrition/NutritionChatSuggestion'
import logo from '../assets/logo.png'

const QUICK = [
  { icon: Dumbbell, text: 'Adjust my workout plan' },
  { icon: UtensilsCrossed, text: 'What should I eat for dinner?' },
  { icon: Zap, text: 'Quick workout (no equipment)' },
  { icon: Flame, text: 'How many calories do I need?' },
]

const TABS = [
  { id: 'workout', label: 'Workout', page: 'Workout plans' },
  { id: 'nutrition', label: 'Nutrition', page: 'Nutrition' },
  { id: 'general', label: 'General', page: 'AIVO Coach' },
]

const Avatar = ({ size = 'h-10 w-10' }) => (
  <span className={`grid ${size} shrink-0 place-items-center rounded-full border border-gold/50 bg-[#101010]`}><img src={logo} alt="" className="h-[60%] w-auto" /></span>
)

export default function AiCoach() {
  const [category, setCategory] = useState('general')
  const activeTab = TABS.find((tab) => tab.id === category) ?? TABS[2]
  const todayYmd = toYmd(new Date())
  const {
    messages,
    busy,
    error,
    send,
    newChat,
    conversations,
    activeConversationId,
    historyError,
    historyLoading,
    deletingConversationId,
    selectConversation,
    deleteConversation,
  } = useAivoChat({
    page: activeTab.page,
    category,
    persistConversations: true,
    ...(category === 'nutrition' ? { data: { today: todayYmd } } : {}),
  })
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const [savedReplies, setSavedReplies] = useState(() => new Set())
  const [savingSuggestion, setSavingSuggestion] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState('')
  const [saveFeedbackError, setSaveFeedbackError] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, busy, error])

  const submit = (value) => {
    if (!value.trim() || busy || historyLoading) return
    send(value)
    setText('')
  }

  const saveWorkoutSuggestion = async (question, suggestion, index) => {
    if (savingSuggestion || savedReplies.has(index)) return
    setSavingSuggestion(true)
    setSaveFeedback('Saving the suggested workout...')
    setSaveFeedbackError(false)
    try {
      await api.post('/ai/suggestions/workout/save', { question, suggestion })
      setSavedReplies((current) => new Set(current).add(index))
      setSaveFeedback('Saved to your workout plans.')
    } catch (requestError) {
      setSaveFeedback(requestError.response?.data?.message || 'This suggested workout could not be saved.')
      setSaveFeedbackError(true)
    } finally {
      setSavingSuggestion(false)
    }
  }
  const saveNutritionSuggestion = async (question, suggestion, index) => {
    const plan = parseNutritionSuggestion(suggestion)
    if (!plan || savingSuggestion || savedReplies.has(index)) return
    setSavingSuggestion(true)
    setSaveFeedback('Saving the suggested meal plan...')
    setSaveFeedbackError(false)
    try {
      if (plan.type === 'week') {
        const payload = {
          question,
          suggestion,
          start_date: plan.dates[0],
          end_date: plan.dates[plan.dates.length - 1],
          replace_existing: false,
        }
        let response
        try {
          response = await api.post('/ai/suggestions/nutrition/save-week', payload)
        } catch (requestError) {
          if (requestError.response?.status !== 409) throw requestError
          if (!window.confirm('Meals already exist in these dates. Replace them with this weekly plan?')) {
            throw new Error('The weekly plan was not saved; existing meals were left unchanged.', { cause: requestError })
          }
          response = await api.post('/ai/suggestions/nutrition/save-week', { ...payload, replace_existing: true })
        }
        setSaveFeedback(`Saved ${response.data.meals.length} meals to your meal plan.`)
      } else {
        const { data } = await api.post('/ai/suggestions/nutrition/save', {
          question,
          suggestion,
          meal_date: toYmd(new Date()),
        })
        setSaveFeedback(`${data.meal.meal_type} was saved to your meal plan for ${data.meal.meal_date}.`)
      }
      setSavedReplies((current) => new Set(current).add(index))
    } catch (requestError) {
      setSaveFeedback(requestError.response?.data?.message || requestError.message || 'This meal plan could not be saved.')
      setSaveFeedbackError(true)
    } finally {
      setSavingSuggestion(false)
    }
  }
  const filteredConversations = conversations.filter((conversation) =>
    (conversation.title || 'New chat').toLowerCase().includes(search.trim().toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      <main className="flex h-screen flex-col overflow-hidden bg-[#161616] pb-16 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-0">
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 p-4 lg:flex">
            <button type="button" onClick={newChat} disabled={busy || historyLoading} className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> New chat</button>
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2.5 text-mute focus-within:border-gold">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats" aria-label="Search chats" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute" />
            </label>
            <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
              <h2 className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-mute">{activeTab.label.toUpperCase()} CONVERSATIONS</h2>
              <div className="space-y-1">
                {filteredConversations.map((conversation) => (
                  <div key={conversation.conversation_id} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => selectConversation(conversation.conversation_id)}
                      disabled={busy || historyLoading}
                      className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-white/5 disabled:opacity-50 ${
                        String(activeConversationId) === String(conversation.conversation_id) ? 'bg-gold/15 text-ink' : 'text-mute'
                      }`}
                      title={conversation.title || 'New chat'}
                    >
                      {conversation.title || 'New chat'}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteConversation(conversation.conversation_id)}
                      disabled={busy || historyLoading || deletingConversationId !== null}
                      aria-label={`Delete ${conversation.title || 'conversation'}`}
                      title="Delete conversation"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-mute transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {filteredConversations.length === 0 && (
                  <p className="px-2 py-2 text-xs text-mute">{search ? 'No matching conversations.' : 'No saved conversations yet.'}</p>
                )}
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-8">
              <Avatar size="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold leading-tight">AIVO Coach</h1>
                <p className="flex items-center gap-1.5 text-xs text-mute"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> {activeTab.label} coaching and chat history</p>
              </div>
              <button type="button" onClick={newChat} disabled={busy || historyLoading} className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 lg:hidden"><Plus size={14} /> New chat</button>
            </header>

            <nav aria-label="Conversation categories" role="tablist" className="flex gap-2 border-b border-white/10 px-5 py-2 sm:px-8">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.id}
                  onClick={() => setCategory(tab.id)}
                  disabled={busy || historyLoading}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    category === tab.id ? 'bg-gold text-black' : 'text-mute hover:bg-white/5 hover:text-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
              <div className="mx-auto max-w-3xl space-y-6">
                {historyError && <p role="alert" className="text-sm text-red-300">{historyError}</p>}
                {messages.length === 0 && (
                  <div className="flex items-start gap-3">
                    <Avatar />
                    <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed">Hi! I'm AIVO. Ask me about {category === 'workout' ? 'your training and workout plans' : category === 'nutrition' ? 'meals and nutrition' : 'your workouts, meals or progress'}, and I'll help you plan your next move.</p>
                  </div>
                )}
                {messages.map((item, index) => item.role === 'assistant' ? (
                  <div key={index} className="flex items-start gap-3">
                    <Avatar />
                    <div className="min-w-0 max-w-[85%]">
                      {category === 'workout'
                        ? <WorkoutChatSuggestion content={item.content} />
                        : category === 'nutrition'
                          ? <NutritionChatSuggestion content={item.content} />
                        : <p className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed">{item.content}</p>}
                      {category === 'workout'
                        && parseWorkoutSuggestion(item.content)
                        && messages[index - 1]?.role === 'user'
                        && (
                          <button
                            type="button"
                            disabled={savingSuggestion || savedReplies.has(index)}
                            onClick={() => saveWorkoutSuggestion(messages[index - 1].content, item.content, index)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <BookmarkPlus size={14} />
                            {savedReplies.has(index) ? 'Saved to my workout plans' : 'Save to my workout plans'}
                          </button>
                        )}
                      {category === 'nutrition'
                        && parseNutritionSuggestion(item.content)
                        && messages[index - 1]?.role === 'user'
                        && (
                          <button
                            type="button"
                            disabled={savingSuggestion || savedReplies.has(index)}
                            onClick={() => saveNutritionSuggestion(messages[index - 1].content, item.content, index)}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <BookmarkPlus size={14} />
                            {savedReplies.has(index) ? 'Saved to my meal plan' : 'Save to my meal plan'}
                          </button>
                        )}
                    </div>
                  </div>
                ) : (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-gold px-4 py-3 text-sm font-medium leading-relaxed text-black">{item.content}</p>
                  </div>
                ))}
                {busy && <div className="flex items-start gap-3"><Avatar /><p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm text-mute">AIVO is thinking...</p></div>}
                {error && <p role="alert" className="ml-[52px] text-sm text-red-300">{error}</p>}
                {saveFeedback && <p role={saveFeedbackError ? 'alert' : 'status'} className={`ml-[52px] text-sm ${saveFeedbackError ? 'text-red-300' : 'text-emerald-300'}`}>{saveFeedback}</p>}
                {messages.length === 0 && (
                  <div className="flex flex-wrap gap-2 pl-[52px]">
                    {QUICK.filter(({ icon }) => category === 'general'
                      || (category === 'workout' ? icon === Dumbbell || icon === Zap : icon === UtensilsCrossed || icon === Flame))
                      .map(({ icon: Icon, text: suggestion }) => (
                      <button key={suggestion} type="button" disabled={busy || historyLoading} onClick={() => submit(suggestion)} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-left text-xs transition hover:border-gold/60 disabled:opacity-50">
                        <Icon size={14} className="shrink-0 text-gold" />{suggestion}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={endRef} />
              </div>
            </div>

            <footer className="border-t border-white/10 px-5 pb-4 pt-3 sm:px-8">
              <form onSubmit={(e) => { e.preventDefault(); submit(text) }} className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl border border-white/15 bg-card p-2 pl-4 focus-within:border-gold">
                <Sparkles size={18} className="shrink-0 text-gold" />
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Ask AIVO about ${activeTab.label.toLowerCase()}...`} aria-label="Message" disabled={historyLoading} className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-mute disabled:opacity-60" />
                <button type="submit" disabled={!text.trim() || busy || historyLoading} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"><Send size={16} /></button>
              </form>
              <p className="mt-2 text-center text-[11px] text-mute">AIVO can make mistakes. Check important health advice with a professional.</p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  )
}
