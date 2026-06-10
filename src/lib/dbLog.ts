// Logs database operations to the console and shows a visible alert when one fails.
export function dbLog(op: string, table: string, error: unknown, data?: unknown) {
  if (error) {
    const msg = `[PURION DB] ${op} ${table} FALHOU: ${JSON.stringify(error)}`
    console.error(msg)
    if (typeof window !== 'undefined') {
      const existing = document.getElementById('purion-db-error')
      if (!existing) {
        const el = document.createElement('div')
        el.id = 'purion-db-error'
        el.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:99999;background:#E85238;color:#fff;padding:12px 16px;border-radius:8px;font-size:12px;font-family:monospace;max-height:120px;overflow:auto'
        el.textContent = msg
        document.body.appendChild(el)
        setTimeout(() => el.remove(), 15000)
      }
    }
  } else {
    console.log(`[PURION DB] ${op} ${table} OK`, data ?? '')
  }
}
