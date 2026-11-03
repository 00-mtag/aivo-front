import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import AskAivo from './dashboard/AskAivo'

// Gold button when closed; opens the chat as a side panel (full screen on phones).
export default function AskAivoFloating({ suggestions }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      {!open && (
        <button type="button" aria-label="Ask AIVO" onClick={() => setOpen(true)}
          className="fixed bottom-20 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-gold text-black shadow-lg shadow-gold/30 transition hover:scale-105 lg:bottom-8 lg:right-8">
          <Sparkles size={24} />
        </button>
      )}
      {/* Stays mounted while hidden so the conversation is kept */}
      <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
        <aside role="dialog" aria-label="Ask AIVO" className="absolute inset-y-0 right-0 w-full max-w-md border-l border-white/10 bg-card">
          <AskAivo bare suggestions={suggestions} onClose={() => setOpen(false)} />
        </aside>
      </div>
    </>
  )
}
