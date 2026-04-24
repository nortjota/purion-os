'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { Save } from 'lucide-react'

interface NotifItem {
  id: string
  label: string
  descricao: string
  ativo: boolean
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-[#C9A84C]' : 'bg-[var(--border)]'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function NotificacoesSettings() {
  const { success } = useToast()

  const [itens, setItens] = useState<NotifItem[]>([
    { id: '1', label: 'Tarefas com prazo hoje', descricao: 'Notificar às 08:00 sobre tarefas vencendo', ativo: true },
    { id: '2', label: 'Tarefas bloqueadas há 3+ dias', descricao: 'Lembrete de desbloqueio', ativo: true },
    { id: '3', label: 'Lead sem contato', descricao: 'Após X dias configurados em Alertas', ativo: true },
    { id: '4', label: 'Estoque crítico', descricao: 'Quando SKU atingir threshold', ativo: true },
    { id: '5', label: 'ROAS abaixo do mínimo', descricao: 'Baseado nas regras de Alertas', ativo: false },
    { id: '6', label: 'CPA acima do limite', descricao: 'Baseado nas regras de Alertas', ativo: false },
    { id: '7', label: 'Pedido de expedição vencido', descricao: 'Após prazo configurado', ativo: true },
    { id: '8', label: 'Novo voto em decisão estratégica', descricao: 'Quando alguém votar', ativo: true },
    { id: '9', label: 'Daily não preenchido', descricao: 'Lembrete às X horas', ativo: false },
  ])

  const [horarioResumo, setHorarioResumo] = useState('08:00')
  const [ndpInicio, setNdpInicio] = useState('22:00')
  const [ndpFim, setNdpFim] = useState('07:00')

  const toggle = (id: string) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ativo: !i.ativo } : i))
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Notificações</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Configure quais alertas você deseja receber.</p>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        {itens.map(item => (
          <div key={item.id} className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)] last:border-0">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.descricao}</p>
            </div>
            <Toggle checked={item.ativo} onChange={() => toggle(item.id)} />
          </div>
        ))}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Agendamento</h2>
        <div>
          <label className="text-xs text-[#8A8A8A] block mb-1">Horário resumo diário</label>
          <input type="time" className="input-purion" value={horarioResumo}
            onChange={e => setHorarioResumo(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-[#8A8A8A] block mb-2">Não perturbar (horário)</label>
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Início</label>
              <input type="time" className="input-purion" value={ndpInicio}
                onChange={e => setNdpInicio(e.target.value)} />
            </div>
            <span className="text-[var(--text-secondary)] mt-4">–</span>
            <div>
              <label className="text-xs text-[#8A8A8A] block mb-1">Fim</label>
              <input type="time" className="input-purion" value={ndpFim}
                onChange={e => setNdpFim(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => success('Notificações salvas')} className="btn btn-primary flex items-center gap-2">
        <Save size={15} /> Salvar notificações
      </button>
    </div>
  )
}
