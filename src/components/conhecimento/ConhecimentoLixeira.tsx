'use client'

import { useEffect, useState } from 'react'
import { X, RotateCcw, Trash2, Archive, FileText, FolderOpen } from 'lucide-react'
import { useConhecimento, type KbArquivado } from '@/hooks/useConhecimento'
import { useIsMaster } from '@/hooks/useIsMaster'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatarDataBR } from '@/lib/calculos'

interface Props {
  onFechar: () => void
}

type ItemPermanente = { tipo: 'categoria' | 'documento'; id: string; titulo: string }

export function ConhecimentoLixeira({ onFechar }: Props) {
  const {
    carregarArquivados, restaurarDocumento, restaurarCategoria,
    excluirDocumentoPermanente, excluirCategoriaPermanente,
  } = useConhecimento()
  const { isMaster } = useIsMaster()

  const [categorias, setCategorias] = useState<KbArquivado[]>([])
  const [documentos, setDocumentos] = useState<KbArquivado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [excluirPermanente, setExcluirPermanente] = useState<ItemPermanente | null>(null)

  async function recarregar() {
    setCarregando(true)
    const { categorias, documentos } = await carregarArquivados()
    setCategorias(categorias)
    setDocumentos(documentos)
    setCarregando(false)
  }

  useEffect(() => { recarregar() }, [])

  async function handleRestaurarDocumento(id: string) {
    await restaurarDocumento(id)
    setDocumentos((prev) => prev.filter((d) => d.id !== id))
  }

  async function handleRestaurarCategoria(id: string) {
    await restaurarCategoria(id)
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  async function confirmarExclusaoPermanente() {
    if (!excluirPermanente) return
    if (excluirPermanente.tipo === 'documento') {
      await excluirDocumentoPermanente(excluirPermanente.id)
      setDocumentos((prev) => prev.filter((d) => d.id !== excluirPermanente.id))
    } else {
      await excluirCategoriaPermanente(excluirPermanente.id)
      setCategorias((prev) => prev.filter((c) => c.id !== excluirPermanente.id))
    }
    setExcluirPermanente(null)
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={onFechar}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="flex items-center gap-2" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            <Archive size={16} style={{ color: '#C9A84C' }} /> Arquivados
          </span>
          <button onClick={onFechar} className="icon-btn border-0"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando ? (
            <p className="caption">Carregando…</p>
          ) : categorias.length === 0 && documentos.length === 0 ? (
            <div className="empty-state">
              <Archive size={32} className="empty-state-icon" />
              <p className="empty-state-title">Nada arquivado</p>
              <p className="empty-state-subtitle">Guias e documentos excluídos aparecem aqui e podem ser restaurados.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {categorias.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Guias ({categorias.length})
                  </p>
                  <div className="flex flex-col gap-1">
                    {categorias.map((c) => (
                      <ItemArquivado
                        key={c.id}
                        icon={FolderOpen}
                        item={c}
                        isMaster={isMaster}
                        onRestaurar={() => handleRestaurarCategoria(c.id)}
                        onExcluirPermanente={() => setExcluirPermanente({ tipo: 'categoria', id: c.id, titulo: c.titulo })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {documentos.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                    Documentos ({documentos.length})
                  </p>
                  <div className="flex flex-col gap-1">
                    {documentos.map((d) => (
                      <ItemArquivado
                        key={d.id}
                        icon={FileText}
                        item={d}
                        isMaster={isMaster}
                        onRestaurar={() => handleRestaurarDocumento(d.id)}
                        onExcluirPermanente={() => setExcluirPermanente({ tipo: 'documento', id: d.id, titulo: d.titulo })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!excluirPermanente}
        title="Excluir permanentemente"
        message={`Isso apaga "${excluirPermanente?.titulo}" de vez — não tem mais volta, nem pela lixeira.`}
        confirmLabel="Excluir para sempre"
        confirmText={excluirPermanente?.titulo}
        onConfirm={confirmarExclusaoPermanente}
        onCancel={() => setExcluirPermanente(null)}
        danger
      />
    </div>
  )
}

function ItemArquivado({ icon: Icon, item, isMaster, onRestaurar, onExcluirPermanente }: {
  icon: React.ElementType
  item: KbArquivado
  isMaster: boolean
  onRestaurar: () => void
  onExcluirPermanente: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg" style={{ padding: '8px 10px', background: 'var(--bg-surface-2)' }}>
      <Icon size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</p>
        <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Excluído em {formatarDataBR(item.deletedAt.slice(0, 10))}</p>
      </div>
      <button onClick={onRestaurar} className="icon-btn" title="Restaurar" style={{ color: '#22C55E' }}>
        <RotateCcw size={13} />
      </button>
      {isMaster && (
        <button onClick={onExcluirPermanente} className="icon-btn" title="Excluir permanentemente (master)" style={{ color: '#E85238' }}>
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}
