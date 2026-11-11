'use client'

import { Truck } from 'lucide-react'

/** Fila de Despacho — tela inicial do perfil 'logistica' (Goiânia). Conteúdo completo na fase 4. */
export function DespachoPage() {
  return (
    <div className="page-container" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Truck size={20} style={{ color: '#2E9E5B' }} />
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#F5F5F5' }}>Fila de Despacho</h1>
      </div>
      <p style={{ fontSize: 14, color: '#B8B8B8' }}>Pedidos pagos aguardando envio pela Logística · Goiânia.</p>
    </div>
  )
}
