'use client'

import { useState } from 'react'
import { usePurionStore } from '@/store'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { Save } from 'lucide-react'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#C9A84C]' : 'bg-[var(--border)]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function AlertasSettings() {
  const { configuracoes } = usePurionStore()
  const { salvarConfiguracoes } = useConfiguracoes()

  // Tráfego Pago
  const [roasMin, setRoasMin] = useState(configuracoes.roasMinimo)
  const [cpaMax, setCpaMax] = useState(configuracoes.cpaMaximo)
  const [orcMeta, setOrcMeta] = useState(configuracoes.orcamentoDiarioMeta)
  const [orcGoogle, setOrcGoogle] = useState(configuracoes.orcamentoDiarioGoogle)
  const [orcTiktok, setOrcTiktok] = useState(configuracoes.orcamentoDiarioTikTok)
  const [gastoSemanal, setGastoSemanal] = useState(500)
  const [ctrMin, setCtrMin] = useState(1.5)

  // Financeiros
  const [margemAlerta, setMargemAlerta] = useState(Math.round(configuracoes.alertaMargemAbaixoDe * 100))
  const [saldoCaixa, setSaldoCaixa] = useState(0)
  const [despesaMensal, setDespesaMensal] = useState(0)
  const [receitaAbaixo, setReceitaAbaixo] = useState(70)

  // Estoque
  const [thNoir, setThNoir] = useState(configuracoes.thresholdNoir)
  const [thUrban, setThUrban] = useState(configuracoes.thresholdUrban)
  const [thCoastal, setThCoastal] = useState(configuracoes.thresholdCoastal)
  const [prazoExpedicao, setPrazoExpedicao] = useState(configuracoes.prazoMaxExpedicaoHoras)

  // CRM
  const [diasSemContato, setDiasSemContato] = useState(configuracoes.diasSemPedidoAlerta)
  const [diasParado, setDiasParado] = useState(14)
  const [pipelineAbaixo, setPipelineAbaixo] = useState(0)

  // Canais
  const [canalSistema, setCanalSistema] = useState(true)

  const handleSave = async () => {
    await salvarConfiguracoes({
      roasMinimo: roasMin,
      cpaMaximo: cpaMax,
      orcamentoDiarioMeta: orcMeta,
      orcamentoDiarioGoogle: orcGoogle,
      orcamentoDiarioTikTok: orcTiktok,
      alertaMargemAbaixoDe: margemAlerta / 100,
      thresholdNoir: thNoir,
      thresholdUrban: thUrban,
      thresholdCoastal: thCoastal,
      prazoMaxExpedicaoHoras: prazoExpedicao,
      diasSemPedidoAlerta: diasSemContato,
    })
  }

  const Field = ({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) => (
    <div>
      <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>
      <input type="number" step={step} className="input-purion w-full" value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Alertas</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Configure os limites que disparam notificações.</p>
      </div>

      {/* Tráfego Pago */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Tráfego Pago</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="ROAS mínimo" value={roasMin} onChange={setRoasMin} step={0.1} />
          <Field label="CPA máximo (R$)" value={cpaMax} onChange={setCpaMax} />
          <Field label="Orçamento diário Meta (R$)" value={orcMeta} onChange={setOrcMeta} />
          <Field label="Orçamento diário Google (R$)" value={orcGoogle} onChange={setOrcGoogle} />
          <Field label="Orçamento diário TikTok (R$)" value={orcTiktok} onChange={setOrcTiktok} />
          <Field label="Gasto semanal máximo (R$)" value={gastoSemanal} onChange={setGastoSemanal} />
          <Field label="CTR mínimo %" value={ctrMin} onChange={setCtrMin} step={0.1} />
        </div>
      </div>

      {/* Financeiros */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Financeiros</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Margem abaixo de %" value={margemAlerta} onChange={setMargemAlerta} />
          <Field label="Saldo caixa abaixo (R$)" value={saldoCaixa} onChange={setSaldoCaixa} />
          <Field label="Despesa mensal acima (R$)" value={despesaMensal} onChange={setDespesaMensal} />
          <Field label="Receita abaixo X% da meta" value={receitaAbaixo} onChange={setReceitaAbaixo} />
        </div>
      </div>

      {/* Estoque */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Estoque</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Threshold Noir (un)" value={thNoir} onChange={setThNoir} />
          <Field label="Threshold Urban (un)" value={thUrban} onChange={setThUrban} />
          <Field label="Threshold Coastal (un)" value={thCoastal} onChange={setThCoastal} />
          <Field label="Prazo expedição (horas)" value={prazoExpedicao} onChange={setPrazoExpedicao} />
        </div>
      </div>

      {/* CRM */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">CRM</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lead sem contato há X dias" value={diasSemContato} onChange={setDiasSemContato} />
          <Field label="Lead em negociação parado X dias" value={diasParado} onChange={setDiasParado} />
          <Field label="Pipeline abaixo (R$)" value={pipelineAbaixo} onChange={setPipelineAbaixo} />
        </div>
      </div>

      {/* Canais */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Canais de Notificação</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)]">Sistema</p>
              <p className="text-xs text-[var(--text-secondary)]">Notificações no painel</p>
            </div>
            <Toggle checked={canalSistema} onChange={setCanalSistema} />
          </div>
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="text-sm text-[var(--text-primary)]">E-mail</p>
              <p className="text-xs text-[var(--text-secondary)]">Notificações por e-mail</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[var(--bg-surface-2)] text-[#C9A84C] px-2 py-0.5 rounded-full border border-[#C9A84C]/30">Em breve</span>
              <Toggle checked={false} onChange={() => {}} />
            </div>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <div>
              <p className="text-sm text-[var(--text-primary)]">WhatsApp</p>
              <p className="text-xs text-[var(--text-secondary)]">Notificações via WhatsApp</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[var(--bg-surface-2)] text-[#C9A84C] px-2 py-0.5 rounded-full border border-[#C9A84C]/30">Em breve</span>
              <Toggle checked={false} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar alertas
      </button>
    </div>
  )
}
