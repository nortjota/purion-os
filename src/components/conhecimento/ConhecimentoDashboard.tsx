'use client'

import { useState, useMemo, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { usePurionStore } from '@/store'
import type { KbCategoria } from '@/store'
import { useMobile } from '@/hooks/useMobile'
import { useConhecimento } from '@/hooks/useConhecimento'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { ConhecimentoSidebar } from './ConhecimentoSidebar'
import { DocumentoView } from './DocumentoView'
import { ConhecimentoLixeira } from './ConhecimentoLixeira'

export function ConhecimentoDashboard() {
  const isMobile = useMobile()
  const { perfil } = useAuthContext()
  const podeExcluir = perfil?.role === 'admin' || perfil?.role === 'master'
  const { kbCategorias, kbDocumentos, kbBlocos } = usePurionStore()
  const {
    criarDocumento, atualizarDocumento, deletarDocumento, deletarCategoria,
    criarBloco, atualizarBloco, deletarBloco, reordenarBlocos,
  } = useConhecimento()

  const [documentoAtivoId, setDocumentoAtivoId] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [sidebarMobileAberta, setSidebarMobileAberta] = useState(false)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [deletandoCategoria, setDeletandoCategoria] = useState<KbCategoria | null>(null)
  const [arquivadosAberto, setArquivadosAberto] = useState(false)

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
  const documentoParaExcluir = useMemo(
    () => kbDocumentos.find((d) => d.id === deletandoId) ?? null,
    [kbDocumentos, deletandoId]
  )
  const documentosDaCategoria = useMemo(
    () => deletandoCategoria ? kbDocumentos.filter((d) => d.categoriaId === deletandoCategoria.id).length : 0,
    [kbDocumentos, deletandoCategoria]
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

  async function confirmarDelete() {
    if (!deletandoId) return
    const titulo = documentoParaExcluir?.titulo
    await deletarDocumento(deletandoId, titulo)
    if (documentoAtivoId === deletandoId) {
      const restantes = kbDocumentos.filter((d) => d.id !== deletandoId)
      setDocumentoAtivoId(restantes[0]?.id ?? null)
    }
    setDeletandoId(null)
  }

  async function confirmarDeleteCategoria() {
    if (!deletandoCategoria) return
    const id = deletandoCategoria.id
    await deletarCategoria(id, deletandoCategoria.nome)
    if (documentoAtivo?.categoriaId === id) {
      const restantes = kbDocumentos.filter((d) => d.categoriaId !== id)
      setDocumentoAtivoId(restantes[0]?.id ?? null)
    }
    setDeletandoCategoria(null)
  }

  const sidebarContent = (
    <ConhecimentoSidebar
      categorias={kbCategorias}
      documentos={kbDocumentos}
      documentoAtivoId={documentoAtivoId}
      busca={busca}
      podeExcluir={podeExcluir}
      onBuscaChange={setBusca}
      onSelecionar={handleSelecionar}
      onNovoDocumento={handleNovoDocumento}
      onExcluirCategoria={setDeletandoCategoria}
      onAbrirArquivados={() => setArquivadosAberto(true)}
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
          podeExcluir={podeExcluir}
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
        title="Excluir documento"
        message={`Excluir o documento "${documentoParaExcluir?.titulo ?? ''}"? Esta ação pode ser desfeita na lixeira (Arquivados).`}
        onConfirm={confirmarDelete}
        onCancel={() => setDeletandoId(null)}
      />

      <ConfirmModal
        open={!!deletandoCategoria}
        title="Excluir guia"
        message={`Excluir a guia "${deletandoCategoria?.nome ?? ''}" e ${documentosDaCategoria > 0 ? `os ${documentosDaCategoria} documento${documentosDaCategoria !== 1 ? 's' : ''} dela` : 'seus documentos'}? Pode ser desfeito na lixeira (Arquivados).`}
        onConfirm={confirmarDeleteCategoria}
        onCancel={() => setDeletandoCategoria(null)}
      />

      {arquivadosAberto && <ConhecimentoLixeira onFechar={() => setArquivadosAberto(false)} />}
    </div>
  )
}
