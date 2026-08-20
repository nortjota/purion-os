'use client'

import { useState } from 'react'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { Save, Building2, Globe } from 'lucide-react'

export function GeralSettings() {
  const { salvarConfiguracoes } = useConfiguracoes()

  const [nomeEmpresa, setNomeEmpresa] = useState('PURION')
  const [slogan, setSlogan] = useState('Atmosfera que marca.')
  const [corDestaque, setCorDestaque] = useState('#C9A84C')
  const [fuso, setFuso] = useState('America/Sao_Paulo')
  const [moeda, setMoeda] = useState('BRL (R$)')
  const [formatoData, setFormatoData] = useState('DD/MM/YYYY')
  const [idioma, setIdioma] = useState('Português BR')

  const handleSave = async () => {
    await salvarConfiguracoes({})
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Configurações Gerais</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Informações da empresa e preferências regionais.</p>
      </div>

      {/* Company Info */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Informações da Empresa</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Nome da empresa</label>
            <input
              className="input-purion w-full"
              value={nomeEmpresa}
              onChange={e => setNomeEmpresa(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Slogan</label>
            <input
              className="input-purion w-full"
              value={slogan}
              onChange={e => setSlogan(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Logo</label>
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" className="text-sm text-[var(--text-secondary)]" />
              <span className="text-xs text-[var(--text-secondary)]">Armazenado no Supabase Storage — em breve</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Cor de destaque</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={corDestaque}
                onChange={e => setCorDestaque(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
              />
              <div
                className="w-10 h-10 rounded-lg border border-[var(--border)]"
                style={{ background: corDestaque }}
              />
              <span className="text-sm text-[var(--text-secondary)] font-mono">{corDestaque}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Regional */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Regional</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Fuso horário</label>
            <select
              className="input-purion w-full"
              value={fuso}
              onChange={e => setFuso(e.target.value)}
            >
              {['America/Sao_Paulo', 'America/Manaus', 'America/Fortaleza', 'America/Belem', 'America/Noronha'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Moeda</label>
            <select
              className="input-purion w-full"
              value={moeda}
              onChange={e => setMoeda(e.target.value)}
            >
              {['BRL (R$)', 'USD ($)', 'EUR (€)'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Formato de data</label>
            <select
              className="input-purion w-full"
              value={formatoData}
              onChange={e => setFormatoData(e.target.value)}
            >
              {['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'].map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Idioma</label>
            <select
              className="input-purion w-full"
              value={idioma}
              onChange={e => setIdioma(e.target.value)}
            >
              {['Português BR', 'English'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar configurações
      </button>
    </div>
  )
}
