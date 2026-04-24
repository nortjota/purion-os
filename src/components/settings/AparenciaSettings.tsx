'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Save } from 'lucide-react'

type Tema = 'dark' | 'light' | 'sistema'
type Densidade = 'compacto' | 'normal' | 'espaçoso'
type Fonte = 'inter' | 'system' | 'mono'
type Animacoes = 'ativadas' | 'reduzidas' | 'desativadas'

function OptionGroup<T extends string>({
  label, value, onChange, options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div>
      <label className="text-xs text-[#8A8A8A] block mb-2">{label}</label>
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              value === opt.value
                ? 'bg-[rgba(201,168,76,0.12)] text-[#C9A84C] border-[#C9A84C]'
                : 'text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--text-secondary)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function AparenciaSettings() {
  const { success } = useToast()

  const [tema, setTema] = useState<Tema>('dark')
  const [corDestaque, setCorDestaque] = useState('#C9A84C')
  const [densidade, setDensidade] = useState<Densidade>('normal')
  const [fonte, setFonte] = useState<Fonte>('inter')
  const [animacoes, setAnimacoes] = useState<Animacoes>('ativadas')

  const handleSave = () => {
    success('Aparência salva')
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Aparência</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Personalize a interface do PURION OS.</p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-6">
        <OptionGroup
          label="Tema"
          value={tema}
          onChange={setTema}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'sistema', label: 'Sistema' },
          ]}
        />

        <div>
          <label className="text-xs text-[#8A8A8A] block mb-2">Cor de destaque</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={corDestaque}
              onChange={e => setCorDestaque(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
            />
            <div className="w-10 h-10 rounded-lg border border-[var(--border)]" style={{ background: corDestaque }} />
            <span className="text-sm text-[var(--text-secondary)] font-mono">{corDestaque}</span>
          </div>
          {/* Preview */}
          <div className="mt-3 border border-[var(--border)] rounded-lg overflow-hidden w-48">
            <div className="h-2" style={{ background: corDestaque }} />
            <div className="flex">
              <div className="w-10 bg-[var(--bg-surface-2)] p-2 space-y-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full ${i === 0 ? '' : 'bg-[var(--border)]'}`}
                    style={i === 0 ? { background: corDestaque } : {}} />
                ))}
              </div>
              <div className="flex-1 bg-[var(--bg-primary)] p-2">
                <div className="h-2 w-full bg-[var(--border)] rounded mb-1.5" />
                <div className="h-1.5 w-3/4 bg-[var(--border)] rounded" />
              </div>
            </div>
          </div>
        </div>

        <OptionGroup
          label="Densidade"
          value={densidade}
          onChange={setDensidade}
          options={[
            { value: 'compacto', label: 'Compacto' },
            { value: 'normal', label: 'Normal' },
            { value: 'espaçoso', label: 'Espaçoso' },
          ]}
        />

        <OptionGroup
          label="Fonte"
          value={fonte}
          onChange={setFonte}
          options={[
            { value: 'inter', label: 'Inter' },
            { value: 'system', label: 'System' },
            { value: 'mono', label: 'Mono' },
          ]}
        />

        <OptionGroup
          label="Animações"
          value={animacoes}
          onChange={setAnimacoes}
          options={[
            { value: 'ativadas', label: 'Ativadas' },
            { value: 'reduzidas', label: 'Reduzidas' },
            { value: 'desativadas', label: 'Desativadas' },
          ]}
        />
      </div>

      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar aparência
      </button>
    </div>
  )
}
