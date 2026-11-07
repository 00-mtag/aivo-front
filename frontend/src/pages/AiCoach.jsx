import { Check, Clock, Dumbbell, Flame, Plus, Search, Send, Sparkles, UtensilsCrossed, Zap } from 'lucide-react'
import Sidebar from '../components/dashboard/Sidebar'
import logo from '../assets/logo.png'

/* Design only: everything here is sample content. Nothing is sent or saved yet. */

const HISTORY = [
  { group: 'Today', items: [{ title: 'Adjust my workout plan', time: '9:12 AM', active: true }, { title: 'Dinner ideas high in protein', time: '8:40 AM' }] },
  { group: 'Yesterday', items: [{ title: 'How many calories do I need?' }, { title: 'Quick no-equipment workout' }] },
  { group: 'Last 7 days', items: [{ title: 'Fixing my squat form' }, { title: 'Rest day or light cardio?' }, { title: 'Breakfast under 400 kcal' }] },
]

const QUICK = [
  { icon: Dumbbell, text: 'Adjust my workout plan' },
  { icon: UtensilsCrossed, text: 'What should I eat for dinner?' },
  { icon: Zap, text: 'Quick workout (no equipment)' },
  { icon: Flame, text: 'How many calories do I need?' },
]

const PLAN = [['Push-ups', '3 × 12'], ['Dumbbell Shoulder Press', '3 × 10'], ['Seated Cable Row', '3 × 12'], ['Plank', '3 × 45 sec']]

const Avatar = ({ size = 'h-10 w-10' }) => (
  <span className={`grid ${size} shrink-0 place-items-center rounded-full border border-gold/50 bg-[#101010]`}><img src={logo} alt="" className="h-[60%] w-auto" /></span>
)

const AiMessage = ({ children }) => (
  <div className="flex items-start gap-3">
    <Avatar />
    <div className="min-w-0 max-w-[85%] space-y-3">{children}</div>
  </div>
)
const Bubble = ({ children }) => <p className="rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-sm leading-relaxed">{children}</p>

export default function AiCoach() {
  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      <Sidebar />
      <main className="flex h-screen flex-col overflow-hidden bg-[#161616] pb-16 lg:ml-20 lg:rounded-tl-[2.5rem] lg:pb-0">
        <div className="flex min-h-0 flex-1">

          {/* Conversation history (desktop) */}
          <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 p-4 lg:flex">
            <button type="button" className="flex w-full items-center justify-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"><Plus size={16} /> New chat</button>
            <label className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-card px-3 py-2.5 text-mute focus-within:border-gold">
              <Search size={16} />
              <input placeholder="Search chats" aria-label="Search chats" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-mute" />
            </label>
            <div className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
              {HISTORY.map(({ group, items }) => (
                <section key={group}>
                  <h2 className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-mute">{group.toUpperCase()}</h2>
                  <ul className="space-y-1">
                    {items.map(({ title, time, active }) => (
                      <li key={title}>
                        <button type="button" className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${active ? 'bg-gold/15 text-ink' : 'text-ink/80 hover:bg-white/5'}`}>
                          <span className="truncate">{title}</span>
                          {time && <span className="shrink-0 text-[10px] text-mute">{time}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </aside>

          {/* Chat */}
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-8">
              <Avatar size="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-bold leading-tight">AIVO Coach</h1>
                <p className="flex items-center gap-1.5 text-xs text-mute"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Your AI fitness &amp; nutrition coach</p>
              </div>
              <button type="button" className="flex items-center gap-1.5 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold transition hover:bg-white/5 lg:hidden"><Plus size={14} /> New chat</button>
              <button type="button" aria-label="More options" className="grid h-9 w-9 place-items-center rounded-lg text-mute transition hover:bg-white/10 hover:text-ink">
                <span className="flex flex-col gap-[3px]"><i className="h-1 w-1 rounded-full bg-current" /><i className="h-1 w-1 rounded-full bg-current" /><i className="h-1 w-1 rounded-full bg-current" /></span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
              <div className="mx-auto max-w-3xl space-y-6">
                <p className="text-center text-[11px] text-mute">Today · 9:12 AM</p>

                <AiMessage>
                  <Bubble>Hi Genn! I'm AIVO, your coach. Ask me about your workouts, meals or progress, and I'll help you plan your next move.</Bubble>
                </AiMessage>

                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gold px-4 py-3 text-sm font-medium leading-relaxed text-black">Can you adjust my workout plan? I only have 30 minutes today.</p>
                </div>

                <AiMessage>
                  <Bubble>Of course! Here is a 30-minute version of today's upper body session. It keeps the main movements and skips the long rest periods.</Bubble>
                  <div className="rounded-2xl border border-white/10 bg-card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">Upper Body Express</p>
                      <span className="flex items-center gap-3 text-[11px] text-mute"><span className="flex items-center gap-1"><Clock size={12} /> 30 min</span><span className="flex items-center gap-1"><Flame size={12} className="text-orange-400" /> ~250 kcal</span></span>
                    </div>
                    <ul className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10 bg-black/20">
                      {PLAN.map(([name, sets]) => (
                        <li key={name} className="flex items-center justify-between px-3 py-2.5 text-sm"><span>{name}</span><span className="font-semibold text-gold">{sets}</span></li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="flex items-center gap-1.5 rounded-full bg-gold px-5 py-2 text-xs font-bold text-black transition hover:brightness-110"><Check size={14} strokeWidth={3} /> Add to my plan</button>
                      <button type="button" className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold transition hover:bg-white/5">Start now</button>
                    </div>
                  </div>
                  <Bubble>Want me to make the same change for the rest of the week?</Bubble>
                </AiMessage>
              </div>
            </div>

            {/* Composer */}
            <footer className="border-t border-white/10 px-5 pb-4 pt-3 sm:px-8">
              <div className="mx-auto max-w-3xl">
                <div className="flex gap-2 overflow-x-auto pb-3">
                  {QUICK.map(({ icon: Icon, text }) => (
                    <button key={text} type="button" className="flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs transition hover:border-gold/60">
                      <Icon size={14} className="text-gold" />{text}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-card p-2 pl-4 focus-within:border-gold">
                  <Sparkles size={18} className="shrink-0 text-gold" />
                  <input placeholder="Ask AIVO anything about training or nutrition..." aria-label="Message" className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-mute" />
                  <button type="button" aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-black transition hover:brightness-110"><Send size={16} /></button>
                </div>
                <p className="mt-2 text-center text-[11px] text-mute">AIVO can make mistakes. Check important health advice with a professional.</p>
              </div>
            </footer>
          </section>
        </div>
      </main>
    </div>
  )
}
