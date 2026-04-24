'use client'

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'

export interface UseDeleteOptions {
  table: string
  itemLabel?: string
  undoDuration?: number
}

export function useDelete<T extends { id: string }>({
  table,
  itemLabel = 'Registro',
  undoDuration = 5000,
}: UseDeleteOptions) {
  const { toast } = useToast()
  const [isDeleting, setIsDeleting] = useState(false)
  const savedRecord = useRef<T | null>(null)

  const softDelete = useCallback(async (
    record: T,
    onLocalRemove: (id: string) => void,
    onLocalRestore: (record: T) => void,
  ) => {
    const sb = supabase
    setIsDeleting(true)

    try {
      if (sb) {
        await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', record.id)
      }
      savedRecord.current = record
      onLocalRemove(record.id)

      toast({
        type: 'info',
        title: `${itemLabel} excluído`,
        description: 'Clique em Desfazer para restaurar',
        duration: undoDuration,
        action: {
          label: 'Desfazer',
          onClick: async () => {
            const saved = savedRecord.current
            if (!saved) return
            if (sb) {
              await sb.from(table).update({ deleted_at: null }).eq('id', saved.id)
            }
            onLocalRestore(saved)
            savedRecord.current = null
          },
        },
      })
    } catch (err) {
      console.error(`[useDelete] Error deleting from ${table}:`, err)
      toast({ type: 'error', title: 'Erro ao excluir', description: 'Tente novamente' })
    } finally {
      setIsDeleting(false)
    }
  }, [table, itemLabel, undoDuration, toast])

  const hardDelete = useCallback(async (id: string, onLocalRemove: (id: string) => void) => {
    const sb = supabase
    setIsDeleting(true)
    try {
      if (sb) {
        await sb.from(table).delete().eq('id', id)
      }
      onLocalRemove(id)
      toast({ type: 'success', title: `${itemLabel} excluído permanentemente` })
    } catch (err) {
      console.error(`[useDelete] Error hard-deleting from ${table}:`, err)
      toast({ type: 'error', title: 'Erro ao excluir permanentemente' })
    } finally {
      setIsDeleting(false)
    }
  }, [table, itemLabel, toast])

  return { softDelete, hardDelete, isDeleting }
}
