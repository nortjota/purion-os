import { AfiliadoPerfil } from '@/components/afiliados/AfiliadoPerfil'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AfiliadoPerfil id={id} />
}
