'use client'

import { useState } from 'react'
import { usePurionStore } from '@/store'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { useToast } from '@/components/ui/Toast'
import { Save, Camera } from 'lucide-react'

interface Snapshot {
  date: string
  fat90: number
  leads: number
  creators: number
}

export function MetasSettings() {
  const { configuracoes } = usePurionStore()
  const { salvarConfiguracoes } = useConfiguracoes()
  const { success } = useToast()

  // Financeiras
  const [fat30, setFat30] = useState(0)
  const [fat90, setFat90] = useState(configuracoes.metaFaturamento90Dias)
  const [fat12m, setFat12m] = useState(configuracoes.metaFaturamento12Meses)
  const [ticketMedio, setTicketMedio] = useState(0)
  const [margemBruta, setMargemBruta] = useState(0)

  // B2B
  const [leadsAtivos, setLeadsAtivos] = useState(configuracoes.metaLeadsMes)
  const [leadsFechados, setLeadsFechados] = useState(0)
  const [valorPipeline, setValorPipeline] = useState(0)
  const [taxaConversao, setTaxaConversao] = useState(0)

  // Marketing
  const [creators, setCreators] = useState(configuracoes.metaCreatorsMes)
  const [videos, setVideos] = useState(configuracoes.metaVideosMes)
  const [alcance, setAlcance] = useState(0)
  const [segTiktok, setSegTiktok] = useState(0)
  const [segInsta, setSegInsta] = useState(0)

  // Produção
  const [unNoير, setUnNoir] = useState(0)
  const [unUrban, setUnUrban] = useState(0)
  const [unCoastal, setUnCoastal] = useState(0)
  const [prazoExpedicao, setPrazoExpedicao] = useState(configuracoes.prazoMaxExpedicaoHoras)

  const [snapshots, setSnapshots] = useState<Snapshot[]>([])

  const handleSave = async () => {
    await salvarConfiguracoes({
      metaFaturamento90Dias: fat90,
      metaFaturamento12Meses: fat12m,
      metaLeadsMes: leadsAtivos,
      metaCreatorsMes: creators,
      metaVideosMes: videos,
      prazoMaxExpedicaoHoras: prazoExpedicao,
    })
    success('Metas salvas')
  }

  const saveSnapshot = () => {
    setSnapshots(prev => [{
      date: new Date().toLocaleDateString('pt-BR'),
      fat90,
      leads: leadsAtivos,
      creators,
    }, ...prev])
    success('Snapshot salvo')
  }

  const Field = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="text-xs text-[var(--text-secondary)] block mb-1">{label}</label>
      <input type="number" className="input-purion w-full" value={value} onChange={e => onChange(Number(e.target.value))} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Metas</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Defina os objetivos da empresa para cada área.</p>
      </div>

      {/* Financeiras */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Metas Financeiras</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta faturamento 30 dias (R$)" value={fat30} onChange={setFat30} />
          <Field label="Meta faturamento 90 dias (R$)" value={fat90} onChange={setFat90} />
          <Field label="Meta faturamento 12 meses (R$)" value={fat12m} onChange={setFat12m} />
          <Field label="Meta ticket médio (R$)" value={ticketMedio} onChange={setTicketMedio} />
          <Field label="Meta margem bruta %" value={margemBruta} onChange={setMargemBruta} />
        </div>
      </div>

      {/* B2B */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Metas B2B</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta leads ativos/mês" value={leadsAtivos} onChange={setLeadsAtivos} />
          <Field label="Meta leads fechados/mês" value={leadsFechados} onChange={setLeadsFechados} />
          <Field label="Meta valor pipeline (R$)" value={valorPipeline} onChange={setValorPipeline} />
          <Field label="Meta taxa conversão %" value={taxaConversao} onChange={setTaxaConversao} />
        </div>
      </div>

      {/* Marketing */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Metas de Marketing</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta creators/mês" value={creators} onChange={setCreators} />
          <Field label="Meta vídeos/mês" value={videos} onChange={setVideos} />
          <Field label="Meta alcance mensal" value={alcance} onChange={setAlcance} />
          <Field label="Meta seguidores TikTok" value={segTiktok} onChange={setSegTiktok} />
          <Field label="Meta seguidores Instagram" value={segInsta} onChange={setSegInsta} />
        </div>
      </div>

      {/* Produção */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-4">Metas de Produção</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Meta unidades Noir/mês" value={unNoير} onChange={setUnNoir} />
          <Field label="Meta unidades Urban/mês" value={unUrban} onChange={setUnUrban} />
          <Field label="Meta unidades Coastal/mês" value={unCoastal} onChange={setUnCoastal} />
          <Field label="Prazo expedição (horas)" value={prazoExpedicao} onChange={setPrazoExpedicao} />
        </div>
      </div>

      {/* Snapshots */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Snapshots Históricos</h2>
          <button onClick={saveSnapshot} className="btn btn-sm btn-secondary flex items-center gap-1">
            <Camera size={13} /> Salvar snapshot
          </button>
        </div>
        {snapshots.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">Nenhum snapshot salvo ainda.</p>
        ) : (
          <div className="space-y-2">
            {snapshots.map((s, i) => (
              <div key={i} className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface-2)] rounded-lg px-3 py-2">
                {s.date} — Faturamento 90d: R${s.fat90.toLocaleString('pt-BR')}, Leads: {s.leads}, Creators: {s.creators}
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleSave} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar metas
      </button>
    </div>
  )
}
