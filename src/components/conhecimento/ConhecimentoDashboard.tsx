'use client'

import { useState, useMemo, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { useConhecimento } from '@/hooks/useConhecimento'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ConhecimentoSidebar } from './ConhecimentoSidebar'
import { DocumentoView } from './DocumentoView'

export function ConhecimentoDashboard() {
  const isMobile = useMobile()
  const { kbCategorias, kbDocumentos, kbBlocos } = usePurionStore()
  const {
    criarDocumento, atualizarDocumento, deletarDocumento,
    criarBloco, atualizarBloco, deletarBloco, reordenarBlocos,
  } = useConhecimento()

  const [documentoAtivoId, setDocumentoAtivoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [sidebarMobileAberta, setSidebarMobileAberta] = useState(false)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  useEffect(() => {
    if (!documentoAtivoId && kbDocumentos.length > 0) {
      setDocumentoAtivoId(kbDocumentos[0].id)
    }
  }, [kbDocumentos, documentoAtivoId])

  const documentoAtivo = useMemo(
    () => kbDocumentos.find((d) => d.id === documentoAtivoId) ?? null,
    [kbDocumentos, documentoAtivoId]
  )
  const blocosDoDocumento = useMemo(
    () => kbBlocos.filter((b) => b.documentoId === documentoAtivoId),
    [kbBlocos, documentoAtivoId]
  )

  async function handleNovoDocumento(categoriaId: string | null) {
    const novo = await criarDocumento({ categoriaId, titulo: 'Novo documento', emoji: '📄', resumo: '' })
    if (novo) {
      setDocumentoAtivoId(novo.id)
      setSidebarMobileAberta(false)
    }
  }

  function handleSelecionar(id: string) {
    setDocumentoAtivoId(id)
    setSidebarMobileAberta(false)
  }

  function handleDeletarDocumento(id: string) {
    setDeletandoId(id)
  }

  function confirmarDelete() {
    if (!deletandoId) return
    deletarDocumento(deletandoId)
    if (documentoAtivoId === deletandoId) {
      const restantes = kbDocumentos.filter((d) => d.id !== deletandoId)
      setDocumentoAtivoId(restantes[0]?.id ?? null)
    }
    setDeletandoId(null)
  }

  const sidebarContent = (
    <ConhecimentoSidebar
      categorias={kbCategorias}
      documentos={kbDocumentos}
      documentoAtivoId={documentoAtivoId}
      busca={busca}
      onBuscaChange={setBusca}
      onSelecionar={handleSelecionar}
      onNovoDocumento={handleNovoDocumento}
    />
  )

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 1px)' }}>
      {!isMobile && (
        <div style={{ width: 260, flexShrink: 0 }}>
          {sidebarContent}
        </div>
      )}

      {isMobile && (
        <>
          <button
            onClick={() => setSidebarMobileAberta(true)}
            className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
            style={{ background: '#C9A84C', color: '#0D0D0D' }}
          >
            <Menu size={20} />
          </button>
          {sidebarMobileAberta && (
            <div className="fixed inset-0 z-50" style={{ background: 'var(--bg-primary)' }}>
              <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                <span className="page-title" style={{ fontSize: 16 }}>Documentos</span>
                <button onClick={() => setSidebarMobileAberta(false)} className="icon-btn border-0">
                  <X size={18} />
                </button>
              </div>
              <div style={{ height: 'calc(100% - 53px)' }}>{sidebarContent}</div>
            </div>
          )}
        </>
      )}

      {documentoAtivo ? (
        <DocumentoView
          documento={documentoAtivo}
          blocos={blocosDoDocumento}
          onAtualizarDocumento={atualizarDocumento}
          onDeletarDocumento={handleDeletarDocumento}
          onCriarBloco={criarBloco}
          onAtualizarBloco={atualizarBloco}
          onDeletarBloco={deletarBloco}
          onReordenarBlocos={reordenarBlocos}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="empty-state">
            <p className="empty-state-title">Nenhum documento selecionado</p>
            <p className="empty-state-subtitle">Escolha um documento na barra lateral ou crie um novo.</p>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deletandoId}
        title="Excluir Documento"
        message="Deseja excluir este documento e todos os seus blocos? Esta ação não pode ser desfeita."
        onConfirm={confirmarDelete}
        onCancel={() => setDeletandoId(null)}
      />
    </div>
  )
}
