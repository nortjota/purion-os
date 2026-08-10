import { redirect } from 'next/navigation'

export default function ContabilidadePage() {
  redirect('/financeiro?tab=contabilidade')
}
