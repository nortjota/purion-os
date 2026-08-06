'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'

export interface UseBulkActionsOptions {
  table: string
  itemLabelSingular: string
  itemLabelPlural: string
}

function plural(n: number, singular: string, plural: string) {
  return n === 1 ? singular : plural
}

export function useBulkActions({ table, itemLabelSingular, itemLabelPlural }: UseBulkActionsOptions) {
  const { success, error: toastError } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const bulkArchive = useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false
    const sb = supabase
    setIsProcessing(true)
    try {
      if (sb) {
        const { error } = await sb.from(table).update({ deleted_at: new Date().toISOString() }).in('id', ids)
        dbLog('BULK_ARCHIVE', table, error, `${ids.length} ids`)
        if (error) { toastError(`Erro ao arquivar ${itemLabelPlural}`, error.message); return false }
      }
      success(`${ids.length} ${plural(ids.length, itemLabelSingular, itemLabelPlural)} arquivado${ids.length !== 1 ? 's' : ''}`, 'Restaure na seção Arquivados')
      return true
    } finally {
      setIsProcessing(false)
    }
  }, [table, itemLabelSingular, itemLabelPlural, success, toastError])

  const bulkRestore = useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false
    const sb = supabase
    setIsProcessing(true)
    try {
      if (sb) {
        const { error } = await sb.from(table).update({ deleted_at: null }).in('id', ids)
        dbLog('BULK_RESTORE', table, error, `${ids.length} ids`)
        if (error) { toastError(`Erro ao restaurar ${itemLabelPlural}`, error.message); return false }
      }
      success(`${ids.length} ${plural(ids.length, itemLabelSingular, itemLabelPlural)} restaurado${ids.length !== 1 ? 's' : ''}`)
      return true
    } finally {
      setIsProcessing(false)
    }
  }, [table, itemLabelSingular, itemLabelPlural, success, toastError])

  const bulkHardDelete = useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false
    const sb = supabase
    setIsProcessing(true)
    try {
      if (sb) {
        const { error } = await sb.from(table).delete().in('id', ids)
        dbLog('BULK_DELETE', table, error, `${ids.length} ids`)
        if (error) { toastError(`Erro ao excluir ${itemLabelPlural} permanentemente`, error.message); return false }
      }
      success(`${ids.length} ${plural(ids.length, itemLabelSingular, itemLabelPlural)} excluído${ids.length !== 1 ? 's' : ''} permanentemente`)
      return true
    } finally {
      setIsProcessing(false)
    }
  }, [table, itemLabelSingular, itemLabelPlural, success, toastError])

  const bulkUpdateField = useCallback(async (ids: string[], patch: Record<string, unknown>, labelAcao = 'Status'): Promise<boolean> => {
    if (ids.length === 0) return false
    const sb = supabase
    setIsProcessing(true)
    try {
      if (sb) {
        const { error } = await sb.from(table).update({ ...patch, updated_at: new Date().toISOString() }).in('id', ids)
        dbLog('BULK_UPDATE', table, error, `${ids.length} ids -> ${JSON.stringify(patch)}`)
        if (error) { toastError(`Erro ao atualizar ${labelAcao.toLowerCase()}`, error.message); return false }
      }
      success(`${labelAcao} atualizado em ${ids.length} ${plural(ids.length, itemLabelSingular, itemLabelPlural)}`)
      return true
    } finally {
      setIsProcessing(false)
    }
  }, [table, itemLabelSingular, itemLabelPlural, success, toastError])

  return { bulkArchive, bulkRestore, bulkHardDelete, bulkUpdateField, isProcessing }
}
