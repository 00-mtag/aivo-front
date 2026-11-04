import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import AskAivoPanel from './AskAivoPanel'

// Desktop: a large card docked beside the page. Phone and tablet: a modal over the page with a dark backdrop.
export default function AskAivoFloating({ open, onOpen, onClose, suggestions, wide, onToggleWide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {!open && (
        <button type="button" aria-label="Ask AIVO" onClick={onOpen}
          className="fixed bottom-20 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-gold text-black shadow-lg shadow-gold/30 transition hover:scale-105 lg:bottom-8 lg:right-8">
          <Sparkles size={24} />
        </button>
      )}
      {/* Stays mounted while hidden so the conversation is kept */}
      <div className={`fixed inset-0 z-50 xl:pointer-events-none ${open ? '' : 'hidden'}`}>
        <div className="absolute inset-0 bg-black/60 xl:hidden" onClick={onClose} />
        <aside role="dialog" aria-label="Ask AIVO" className={`pointer-events-auto absolute inset-3 rounded-2xl border border-white/10 bg-card shadow-2xl shadow-black/60 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[36rem] sm:max-h-[90vh] sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 xl:left-auto xl:right-5 xl:top-5 xl:bottom-5 xl:h-auto xl:max-h-none xl:translate-x-0 xl:translate-y-0 xl:shadow-none ${wide ? 'xl:w-[40rem] 2xl:w-[48rem]' : 'xl:w-[28rem] 2xl:w-[32rem]'}`}>
          <AskAivoPanel suggestions={suggestions} onClose={onClose} wide={wide} onToggleWide={onToggleWide} />
        </aside>
      </div>
    </>
  )
}
