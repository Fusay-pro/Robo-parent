export default function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #006686 100%)' }}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        </div>
        <span className="text-white font-bold text-xl">RoboKids</span>
      </div>

      <div className="relative z-10">
        <h1 className="text-5xl font-bold text-white leading-tight mb-6">
          Join the<br />RoboKids<br />Community
        </h1>
        <p className="text-white/70 text-lg leading-relaxed max-w-sm">
          Create your parent account to start tracking sessions, communicating with staff, and watching your child grow.
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        {[
          { icon: 'check_circle', text: 'Free to join — no credit card needed' },
          { icon: 'check_circle', text: 'Real-time session updates' },
          { icon: 'check_circle', text: "Direct line to your child's teacher" },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-center gap-3">
            <span className="material-symbols-outlined text-white/80 text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <span className="text-white/80 text-sm">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
