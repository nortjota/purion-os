'use client'

import { useState, useRef } from 'react'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import { Download, Upload, Database, RefreshCw } from 'lucide-react'

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface CSVRow {
  [key: string]: string
}

export function DadosSettings() {
  const store = usePurionStore()
  const { success, info } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [csvPreview, setCsvPreview] = useState<CSVRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)

  const exportJSON = () => {
    const data = {
      leads: store.leads,
      receitas: store.receitas,
      despesas: store.despesas,
      tarefas: store.tarefas,
      creators: store.creators,
      lotes: store.lotes,
      configuracoes: store.configuracoes,
    }
    downloadBlob(JSON.stringify(data, null, 2), 'purion-os-export.json', 'application/json')
    success('Dados exportados em JSON')
  }

  const exportFinanceiroCSV = () => {
    const rows = [
      ['id', 'descricao', 'valor', 'categoria', 'data', 'tipo'],
      ...store.receitas.map(r => [r.id, r.descricao, r.valor.toString(), r.categoria, r.data, 'receita']),
      ...store.despesas.map(d => [d.id, d.descricao, d.valor.toString(), d.categoria, d.data, 'despesa']),
    ]
    downloadBlob(rows.map(r => r.join(',')).join('\n'), 'financeiro.csv', 'text/csv')
    success('Financeiro exportado em CSV')
  }

  const exportLeadsCSV = () => {
    const headers = ['id', 'nomeEmpresa', 'nomeContato', 'telefone', 'email', 'status', 'tier', 'cidade']
    const rows = store.leads.map(l => headers.map(h => {
      const val = (l as unknown as Record<string, unknown>)[h]
      return val !== undefined && val !== null ? String(val) : ''
    }))
    downloadBlob([headers, ...rows].map(r => r.join(',')).join('\n'), 'leads-crm.csv', 'text/csv')
    success('Leads exportados em CSV')
  }

  const exportPDF = () => {
    info('Exportação em PDF em breve')
  }

  const downloadTemplate = () => {
    const template = 'nomeEmpresa,nomeContato,telefone,email,cidade,status\nEmpresa Exemplo,João Silva,(61)99999-9999,joao@exemplo.com,Brasília,prospecto'
    downloadBlob(template, 'template-leads.csv', 'text/csv')
    success('Template baixado')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.split('\n').filter(Boolean)
      if (lines.length < 2) return
      const headers = lines[0].split(',').map(h => h.trim())
      const rows = lines.slice(1, 6).map(line => {
        const vals = line.split(',')
        return headers.reduce<CSVRow>((acc, h, i) => { acc[h] = (vals[i] ?? '').trim(); return acc }, {})
      })
      setCsvHeaders(headers)
      setCsvPreview(rows)
    }
    reader.readAsText(file)
  }

  const confirmImport = () => {
    success(`${csvPreview.length} registros importados (demonstração)`)
    setCsvPreview([])
    setCsvHeaders([])
    setCsvFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">Dados</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Exportar, importar e gerenciar dados do sistema.</p>
      </div>

      {/* Exportar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Download size={16} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Exportar</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary flex items-center gap-2" onClick={exportJSON}>
            <Download size={14} /> Exportar tudo (JSON)
          </button>
          <button className="btn btn-secondary flex items-center gap-2" onClick={exportFinanceiroCSV}>
            <Download size={14} /> Exportar financeiro (CSV)
          </button>
          <button className="btn btn-secondary flex items-center gap-2" onClick={exportLeadsCSV}>
            <Download size={14} /> Exportar leads CRM (CSV)
          </button>
          <button className="btn btn-secondary flex items-center gap-2" onClick={exportPDF}>
            <Download size={14} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* Importar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Upload size={16} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Importar</h2>
        </div>
        <div className="space-y-4">
          <button className="btn btn-secondary flex items-center gap-2" onClick={downloadTemplate}>
            <Download size={14} /> Baixar template CSV (Leads)
          </button>
          <div>
            <label className="text-xs text-[var(--text-secondary)] block mb-1">Selecionar arquivo CSV</label>
            <input type="file" accept=".csv" ref={fileRef} onChange={handleFileChange}
              className="text-sm text-[var(--text-secondary)]" />
          </div>
          {csvPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">Preview (primeiras 5 linhas):</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr>
                      {csvHeaders.map(h => (
                        <th key={h} className="text-left px-2 py-1 border border-[var(--border)] text-[var(--text-secondary)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i}>
                        {csvHeaders.map(h => (
                          <td key={h} className="px-2 py-1 border border-[var(--border)] text-[var(--text-primary)]">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn btn-primary" onClick={confirmImport}>
                Confirmar importação ({csvPreview.length} linhas)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Seed */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database size={16} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Dados de Exemplo</h2>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => success('Dados de exemplo carregados')}>
            Carregar dados de exemplo
          </button>
          <button className="btn btn-secondary" onClick={() => success('Dados removidos')}>
            Limpar dados de exemplo
          </button>
        </div>
      </div>

      {/* Backup */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw size={16} className="text-[#C9A84C]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Backup</h2>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Último backup automático: —</p>
        <button className="btn btn-secondary" onClick={() => success('Pedido de backup registrado')}>
          Solicitar backup manual
        </button>
      </div>
    </div>
  )
}
