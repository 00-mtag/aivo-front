import gymBg from '../assets/gym-bg.jpg'

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Gym background (src/assets/gym-bg.jpg) */}
      <img src={gymBg} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/45" />

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-12">
        {/* Brand text */}
        <section className="text-center lg:text-left">
          <h1 className="text-6xl font-extrabold tracking-tight text-gold sm:text-7xl lg:text-8xl">AIVO</h1>
          <div className="hidden lg:block">
            <p className="mt-12 text-6xl font-bold leading-[1.1] tracking-tight">
              Your Strongest<br />self,
            </p>
            <p className="text-6xl font-bold leading-[1.15] tracking-tight text-gold">built intelligently</p>
            <p className="mt-8 max-w-xs text-sm text-ink/90">
              Adaptive training, personalized nutrition, and a coach that learns what works for you.
            </p>
          </div>
        </section>

        {/* Form card */}
        <main className="mx-auto w-full max-w-md lg:ml-auto">
          <div className="rounded-[2rem] border border-white/5 bg-card p-8 shadow-2xl shadow-black/60 sm:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
