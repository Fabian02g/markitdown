import { useState } from 'react'
import { Bell, Plus, X } from 'lucide-react'
import { REMINDER_PRESETS, ruleLabel } from '../lib/constants'

/** value === null → usar los recordatorios por defecto del perfil */
export function ReminderRules({ value, defaults, onChange, fixed }: { value: string[] | null; defaults: string[]; onChange: (v: string[] | null) => void; fixed?: boolean }) {
  const custom = value !== null
  const list = value ?? defaults
  const [mins, setMins] = useState('')
  const toggle = (r: string) => {
    const base = value ?? defaults
    onChange(base.includes(r) ? base.filter((x) => x !== r) : [...base, r])
  }
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted"><Bell size={14} /> Recordatorios</span>
        {fixed ? null : custom
          ? <button type="button" className="text-xs text-accent-2 hover:underline" onClick={() => onChange(null)}>Usar los de siempre</button>
          : <span className="text-[11px] text-faint">Los de siempre (Configuración)</span>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {list.length === 0 && <span className="text-xs text-faint">Sin recordatorios</span>}
        {list.map((r) => (
          <span key={r} className="chip chip-on">
            {ruleLabel(r)}
            <button type="button" onClick={() => toggle(r)} aria-label={`Quitar ${ruleLabel(r)}`}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {REMINDER_PRESETS.filter((p) => !list.includes(p.rule)).map((p) => (
          <button type="button" key={p.rule} className="chip" onClick={() => toggle(p.rule)}><Plus size={11} />{p.label}</button>
        ))}
        <span className="inline-flex items-center gap-1">
          <input className="input h-7 w-16 rounded-full px-2 text-xs" inputMode="numeric" placeholder="min" value={mins}
            onChange={(e) => setMins(e.target.value.replace(/\D/g, ''))} aria-label="Minutos antes" />
          <button type="button" className="chip" disabled={!mins}
            onClick={() => { if (mins && !list.includes('m:' + Number(mins))) toggle('m:' + Number(mins)); setMins('') }}>
            <Plus size={11} />min antes
          </button>
        </span>
      </div>
    </div>
  )
}
