import React from 'react';

export default function DesignTokens() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto py-12 px-6">
      <header className="space-y-4">
        <h1 className="text-5xl font-serif text-primary">PhysioFlow Design System</h1>
        <p className="text-lg text-primary/60 max-w-2xl">
          Medical-grade clarity meets refined luxury. A design system crafted for the modern, 
          high-end physiotherapy clinic.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-serif border-b pb-2 border-primary/10">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ColorCard name="Primary (Navy)" hex="#1B2A4A" className="bg-primary text-white" />
          <ColorCard name="Accent (Sage)" hex="#7BAE7F" className="bg-accent text-primary" />
          <ColorCard name="Surface (Warm White)" hex="#FAFAF8" className="bg-surface border border-primary/10 text-primary" />
          <ColorCard name="Surface Muted" hex="#F1F1EF" className="bg-surface-muted text-primary" />
          <ColorCard name="Success" hex="#4A7C59" className="bg-success text-white" />
          <ColorCard name="Warning" hex="#D4A373" className="bg-warning text-white" />
          <ColorCard name="Error" hex="#BC4749" className="bg-error text-white" />
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-serif border-b pb-2 border-primary/10">Typography</h2>
        <div className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-primary/40 font-bold">Display Serif (Headings)</p>
            <h3 className="text-4xl font-serif">The quick brown fox jumps over the lazy dog</h3>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-primary/40 font-bold">Sans-Serif (Body)</p>
            <p className="text-xl">The quick brown fox jumps over the lazy dog</p>
            <p className="text-base text-primary/70 leading-relaxed">
              Physiotherapy is a healthcare profession that includes the use of mechanical force and movements, 
              manual therapy, exercise therapy, and electrotherapy, remediates impairments and promotes mobility 
              and function.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-serif border-b pb-2 border-primary/10">Components Preview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary/40">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <button className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-sm">
                Primary Action
              </button>
              <button className="px-6 py-2 bg-accent text-primary rounded-lg font-medium hover:opacity-90 transition-all shadow-sm">
                Secondary Action
              </button>
              <button className="px-6 py-2 border border-primary/20 text-primary rounded-lg font-medium hover:bg-primary/5 transition-all">
                Outline
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary/40">Badges</h3>
            <div className="flex flex-wrap gap-3">
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                Scheduled
              </span>
              <span className="px-3 py-1 bg-success/10 text-success text-xs font-bold rounded-full uppercase tracking-wider">
                Completed
              </span>
              <span className="px-3 py-1 bg-error/10 text-error text-xs font-bold rounded-full uppercase tracking-wider">
                Cancelled
              </span>
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary/40">Cards</h3>
            <div className="bg-white p-8 rounded-2xl border border-primary/5 shadow-xl shadow-primary/5 max-w-md">
              <h4 className="text-xl font-serif mb-2">Patient Consultation</h4>
              <p className="text-primary/60 text-sm mb-6">Initial assessment for post-operative knee rehabilitation.</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center">JD</div>
                  <div>
                    <p className="text-sm font-bold">John Doe</p>
                    <p className="text-xs text-primary/40">ID: #8291</p>
                  </div>
                </div>
                <button className="text-accent font-bold text-sm hover:underline">View Details</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ColorCard({ name, hex, className }: { name: string; hex: string; className: string }) {
  return (
    <div className={`p-4 rounded-xl space-y-8 ${className}`}>
      <div className="h-12" />
      <div>
        <p className="text-sm font-bold">{name}</p>
        <p className="text-xs opacity-60">{hex}</p>
      </div>
    </div>
  );
}
